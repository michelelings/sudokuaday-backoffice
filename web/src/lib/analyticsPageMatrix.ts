import type { AnalyticsSnapshot, MetricRow } from '../types/analytics'

/** Pathname with leading slash, for matching snapshot paths and public URLs. */
export function canonicalSnapshotPath(pathOrUrl: string): string {
  const t = pathOrUrl.trim()
  let pathname = t
  if (/^https?:\/\//i.test(t)) {
    try {
      pathname = new URL(t).pathname
    } catch {
      pathname = t
    }
  }
  if (!pathname.startsWith('/')) pathname = `/${pathname}`
  return pathname
}

export type PageScoreboardRow = {
  path: string
  ga4: { metricTotals: { metric_key: string; value: number }[]; asOfDate: string | null } | null
  gsc: { clicks: number; impressions: number } | null
  seo: {
    bestPosition: number | null
    keywordCount: number
    volumeSum: number
  } | null
}

function latestSeriesDate(series: MetricRow[]): string | null {
  const dates = series.map((r) => r.date).filter((d): d is string => typeof d === 'string' && d !== '')
  if (!dates.length) return null
  return [...dates].sort().at(-1) ?? null
}

export function buildPageScoreboard(
  data: AnalyticsSnapshot,
  opts?: { localeFilter?: string },
): PageScoreboardRow[] {
  const series = data.traffic?.series ?? []
  const localeFilter = opts?.localeFilter ?? ''
  const latest = latestSeriesDate(series)

  const gaByPath = new Map<string, Map<string, number>>()

  for (const row of series) {
    if (row.source !== 'ga4') continue
    const rawPath = row.dimensions.pagePath
    if (typeof rawPath !== 'string' || !rawPath) continue
    if (localeFilter && row.dimensions.locale !== localeFilter) continue
    if (latest && row.date && row.date !== latest) continue

    const path = canonicalSnapshotPath(rawPath)
    let metrics = gaByPath.get(path)
    if (!metrics) {
      metrics = new Map()
      gaByPath.set(path, metrics)
    }
    const prev = metrics.get(row.metric_key) ?? 0
    metrics.set(row.metric_key, prev + row.value)
  }

  const gscByPath = new Map<string, { clicks: number; impressions: number }>()
  for (const p of data.searchConsole?.topPages ?? []) {
    gscByPath.set(canonicalSnapshotPath(p.path), { clicks: p.clicks, impressions: p.impressions })
  }

  const seoByPath = new Map<
    string,
    { positions: number[]; keywordCount: number; volumeSum: number }
  >()
  for (const k of data.seo?.keywordsSample ?? []) {
    if (typeof k.url !== 'string' || !k.url) continue
    const path = canonicalSnapshotPath(k.url)
    let agg = seoByPath.get(path)
    if (!agg) {
      agg = { positions: [], keywordCount: 0, volumeSum: 0 }
      seoByPath.set(path, agg)
    }
    agg.keywordCount += 1
    if (k.position != null && Number.isFinite(k.position)) agg.positions.push(k.position)
    if (k.volume != null && Number.isFinite(k.volume)) agg.volumeSum += k.volume
  }

  const paths = new Set<string>([...gaByPath.keys(), ...gscByPath.keys(), ...seoByPath.keys()])
  const sorted = [...paths].sort((a, b) => a.localeCompare(b))

  return sorted.map((path) => {
    const gaMap = gaByPath.get(path)
    const ga4 =
      gaMap && gaMap.size
        ? {
            metricTotals: [...gaMap.entries()]
              .map(([metric_key, value]) => ({ metric_key, value }))
              .sort((a, b) => a.metric_key.localeCompare(b.metric_key)),
            asOfDate: latest,
          }
        : null

    const gsc = gscByPath.get(path) ?? null

    const seoAgg = seoByPath.get(path)
    const seo =
      seoAgg && seoAgg.keywordCount
        ? {
            bestPosition:
              seoAgg.positions.length > 0 ? Math.min(...seoAgg.positions) : null,
            keywordCount: seoAgg.keywordCount,
            volumeSum: seoAgg.volumeSum,
          }
        : null

    return { path, ga4, gsc, seo }
  })
}
