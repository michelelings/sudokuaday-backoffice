/**
 * Normalized shapes for future GA4 / GSC / SEO vendor data (plan §3.2).
 * The SPA only reads optional static JSON; no API keys in the bundle.
 */

export type AnalyticsSourceId = 'ga4' | 'gsc' | 'seo'

export type SeoVendorId = 'ahrefs' | 'semrush' | null

export type SourceStatus = {
  configured: boolean
  /** ISO timestamp when data was last fetched (future) */
  lastSyncedAt?: string
}

export type MetricRow = {
  metric_key: string
  dimensions: Record<string, string | undefined>
  date?: string
  value: number
  source: AnalyticsSourceId
}

export type TrafficSummary = {
  series: MetricRow[]
  note?: string
}

export type GscQueryRow = {
  query: string
  clicks: number
  impressions: number
  ctr?: number
  position?: number
  path?: string
}

export type GscPageRow = {
  path: string
  clicks: number
  impressions: number
}

export type SearchConsoleSummary = {
  topQueries: GscQueryRow[]
  topPages: GscPageRow[]
  note?: string
}

export type SeoKeywordRow = {
  keyword: string
  volume?: number
  position?: number
  url?: string
}

export type SeoSummary = {
  vendor: Exclude<SeoVendorId, null>
  keywordsSample: SeoKeywordRow[]
  note?: string
}

export type AnalyticsSnapshot = {
  schemaVersion: number
  /** When the snapshot was produced; null until a connector runs */
  generatedAt: string | null
  sources: {
    ga4: SourceStatus
    gsc: SourceStatus
    seo: SourceStatus & { vendor: SeoVendorId }
  }
  traffic: TrafficSummary | null
  searchConsole: SearchConsoleSummary | null
  /** Named `seoVendor` in JSON to avoid clashing with `seo` summary object */
  seo: SeoSummary | null
}

export const EMPTY_ANALYTICS_SNAPSHOT: AnalyticsSnapshot = {
  schemaVersion: 1,
  generatedAt: null,
  sources: {
    ga4: { configured: false },
    gsc: { configured: false },
    seo: { configured: false, vendor: null },
  },
  traffic: null,
  searchConsole: null,
  seo: null,
}

export function mergeAnalyticsSnapshot(raw: unknown): AnalyticsSnapshot {
  const base: AnalyticsSnapshot = {
    schemaVersion: EMPTY_ANALYTICS_SNAPSHOT.schemaVersion,
    generatedAt: EMPTY_ANALYTICS_SNAPSHOT.generatedAt,
    sources: {
      ga4: { ...EMPTY_ANALYTICS_SNAPSHOT.sources.ga4 },
      gsc: { ...EMPTY_ANALYTICS_SNAPSHOT.sources.gsc },
      seo: { ...EMPTY_ANALYTICS_SNAPSHOT.sources.seo },
    },
    traffic: EMPTY_ANALYTICS_SNAPSHOT.traffic,
    searchConsole: EMPTY_ANALYTICS_SNAPSHOT.searchConsole,
    seo: EMPTY_ANALYTICS_SNAPSHOT.seo,
  }

  if (!raw || typeof raw !== 'object') return base

  const r = raw as Partial<AnalyticsSnapshot>

  if (typeof r.schemaVersion === 'number') base.schemaVersion = r.schemaVersion
  if (r.generatedAt === null || typeof r.generatedAt === 'string') base.generatedAt = r.generatedAt ?? null

  if (r.sources && typeof r.sources === 'object') {
    const s = r.sources
    if (s.ga4 && typeof s.ga4 === 'object') {
      base.sources.ga4 = {
        configured: Boolean(s.ga4.configured),
        ...(typeof s.ga4.lastSyncedAt === 'string' ? { lastSyncedAt: s.ga4.lastSyncedAt } : {}),
      }
    }
    if (s.gsc && typeof s.gsc === 'object') {
      base.sources.gsc = {
        configured: Boolean(s.gsc.configured),
        ...(typeof s.gsc.lastSyncedAt === 'string' ? { lastSyncedAt: s.gsc.lastSyncedAt } : {}),
      }
    }
    if (s.seo && typeof s.seo === 'object') {
      const v = s.seo.vendor
      base.sources.seo = {
        configured: Boolean(s.seo.configured),
        vendor:
          v === 'ahrefs' || v === 'semrush' || v === null ? v : null,
        ...(typeof s.seo.lastSyncedAt === 'string' ? { lastSyncedAt: s.seo.lastSyncedAt } : {}),
      }
    }
  }

  if (r.traffic !== undefined) {
    base.traffic =
      r.traffic &&
      typeof r.traffic === 'object' &&
      Array.isArray((r.traffic as TrafficSummary).series)
        ? {
            series: (r.traffic as TrafficSummary).series
              .filter(
                (row) =>
                  row &&
                  typeof row.metric_key === 'string' &&
                  typeof row.value === 'number' &&
                  row.dimensions &&
                  typeof row.dimensions === 'object',
              )
              .map((row) => ({
                metric_key: row.metric_key,
                dimensions: row.dimensions,
                date: typeof row.date === 'string' ? row.date : undefined,
                value: row.value,
                source:
                  row.source === 'ga4' || row.source === 'gsc' || row.source === 'seo' ? row.source : 'ga4',
              })),
            ...((r.traffic as TrafficSummary).note
              ? { note: String((r.traffic as TrafficSummary).note) }
              : {}),
          }
        : null
  }

  if (r.searchConsole !== undefined) {
    const sc = r.searchConsole
    base.searchConsole =
      sc && typeof sc === 'object'
        ? {
            topQueries: Array.isArray((sc as SearchConsoleSummary).topQueries)
              ? (sc as SearchConsoleSummary).topQueries
              : [],
            topPages: Array.isArray((sc as SearchConsoleSummary).topPages)
              ? (sc as SearchConsoleSummary).topPages
              : [],
            ...((sc as SearchConsoleSummary).note
              ? { note: String((sc as SearchConsoleSummary).note) }
              : {}),
          }
        : null
  }

  if (r.seo !== undefined) {
    const seo = r.seo
    base.seo =
      seo &&
      typeof seo === 'object' &&
      (seo as SeoSummary).vendor &&
      ((seo as SeoSummary).vendor === 'ahrefs' || (seo as SeoSummary).vendor === 'semrush')
        ? {
            vendor: (seo as SeoSummary).vendor,
            keywordsSample: Array.isArray((seo as SeoSummary).keywordsSample)
              ? (seo as SeoSummary).keywordsSample
              : [],
            ...((seo as SeoSummary).note ? { note: String((seo as SeoSummary).note) } : {}),
          }
        : null
  }

  return base
}
