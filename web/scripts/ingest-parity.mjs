/**
 * Read-only parity scan: English (repo root) vs mirrored paths under each locale folder,
 * optional metadata diff, sitemap URL → file resolution. Does not modify the website repo.
 *
 * Usage:
 *   SUDOKUADAY_REPO_PATH=/path/to/sudokuaday.com node scripts/ingest-parity.mjs
 * Optional: SUDOKUADAY_REPO_SHA=abc1234 (record in snapshot only).
 * Stale mirrors need meaningful git history; use a non-shallow clone or depth ≥ ~200 (see workflow).
 *
 * Writes: public/parity-snapshot.json
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = path.resolve(__dirname, '..')
const OUT_FILE = path.join(WEB_ROOT, 'public', 'parity-snapshot.json')

const EN_EXCLUDE_TOP = new Set([
  'Backup',
  '_drafts',
  'node_modules',
  '.git',
  '.github',
  '.claude',
  'MD',
  'design-system',
  'docs',
  'images',
  'downloads',
  'content',
])

const MAX_SITEMAP_ISSUES = 2000
/** Cap rows shipped in JSON so the SPA stays small; counts remain exact in summary + metadataIssuesTotal */
const MAX_METADATA_ISSUES_STORED = 800
const MAX_FRESHNESS_ISSUES_STORED = 500
const META_VALUE_MAX_LEN = 240

function truncateMeta(s) {
  const t = s.trim()
  if (t.length <= META_VALUE_MAX_LEN) return t
  return `${t.slice(0, META_VALUE_MAX_LEN)}…`
}

function readConfig(repoRoot) {
  const p = path.join(repoRoot, 'config.locales.json')
  const raw = fs.readFileSync(p, 'utf8')
  const cfg = JSON.parse(raw)
  const locales = cfg.supportedLocales ?? []
  if (!locales.includes(cfg.defaultLocale ?? 'en')) {
    throw new Error('config.locales.json: defaultLocale must be in supportedLocales')
  }
  return cfg
}

function isLocaleTopLevel(name, localeFolderNames) {
  return localeFolderNames.has(name)
}

function walkHtmlFiles(dir, repoRoot, localeFolderNames, visitor) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const ent of entries) {
    const abs = path.join(dir, ent.name)
    const rel = path.relative(repoRoot, abs).split(path.sep).join('/')

    if (ent.isDirectory()) {
      if (dir === repoRoot && (EN_EXCLUDE_TOP.has(ent.name) || isLocaleTopLevel(ent.name, localeFolderNames))) {
        continue
      }
      walkHtmlFiles(abs, repoRoot, localeFolderNames, visitor)
      continue
    }

    if (ent.isFile() && ent.name.endsWith('.html')) {
      visitor(rel)
    }
  }
}

function collectEnglishPaths(repoRoot, localeFolderNames) {
  const paths = new Set()
  walkHtmlFiles(repoRoot, repoRoot, localeFolderNames, (rel) => {
    const parts = rel.split('/')
    if (localeFolderNames.has(parts[0])) return
    paths.add(rel)
  })
  return paths
}

function collectLocalePaths(repoRoot, locale) {
  const root = path.join(repoRoot, locale)
  if (!fs.existsSync(root)) return new Set()
  const paths = new Set()
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, ent.name)
      if (ent.isDirectory()) {
        walk(abs)
      } else if (ent.isFile() && ent.name.endsWith('.html')) {
        const rel = path.relative(path.join(repoRoot, locale), abs).split(path.sep).join('/')
        paths.add(rel)
      }
    }
  }
  walk(root)
  return paths
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function decodeBasicEntities(s) {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
}

function extractMetadata(html) {
  const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleM ? stripTags(decodeBasicEntities(titleM[1])) : ''

  let description = ''
  const descRe1 =
    /<meta\s+[^>]*name\s*=\s*["']description["'][^>]*content\s*=\s*["']([^"']*)["'][^>]*>/i
  const descRe2 =
    /<meta\s+[^>]*content\s*=\s*["']([^"']*)["'][^>]*name\s*=\s*["']description["'][^>]*>/i
  const d1 = html.match(descRe1)
  const d2 = html.match(descRe2)
  const rawDesc = d1?.[1] ?? d2?.[1]
  if (rawDesc) description = decodeBasicEntities(rawDesc).trim()

  const h1M = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  const h1 = h1M ? stripTags(decodeBasicEntities(h1M[1])) : ''

  return { title, description, h1 }
}

function normalizeComparable(s) {
  return s.replace(/\s+/g, ' ').trim()
}

/** Map public URL pathname (no domain) to repo-relative HTML file if it exists */
function resolvePublicPathToRepoFile(repoRoot, urlPath) {
  const p = urlPath.replace(/^\/+/, '').replace(/\/+$/, '')
  if (p === '') {
    const idx = path.join(repoRoot, 'index.html')
    return fs.existsSync(idx) ? 'index.html' : null
  }
  const asFile = `${p}.html`
  const asIndex = path.join(p, 'index.html').split(path.sep).join('/')
  if (fs.existsSync(path.join(repoRoot, asFile))) return asFile
  if (fs.existsSync(path.join(repoRoot, asIndex))) return asIndex
  return null
}

/**
 * One `git log` pass: first time a path appears is its most recent commit (reverse chronological).
 * @returns {Map<string, number>|null} path (posix) -> mtime ms
 */
function buildHtmlCommitTimeMap(repoRoot) {
  if (!fs.existsSync(path.join(repoRoot, '.git'))) return null
  let out
  try {
    out = execFileSync(
      'git',
      ['-C', repoRoot, 'log', '--format=%ct', '--name-only', '--no-merges'],
      { encoding: 'utf8', maxBuffer: 120 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] },
    )
  } catch {
    return null
  }
  const map = new Map()
  let currentTsMs = null
  for (const line of out.split('\n')) {
    const t = line.trim()
    if (t === '') continue
    if (/^\d{9,12}$/.test(t)) {
      const sec = parseInt(t, 10)
      if (!Number.isNaN(sec)) currentTsMs = sec * 1000
      continue
    }
    if (currentTsMs == null) continue
    if (!t.endsWith('.html')) continue
    const posix = t.replace(/\\/g, '/')
    if (!map.has(posix)) map.set(posix, currentTsMs)
  }
  return map
}

function timeForPath(repoRoot, relPosix, commitMap) {
  const g = commitMap?.get(relPosix)
  if (g != null) return g
  try {
    return fs.statSync(path.join(repoRoot, ...relPosix.split('/'))).mtimeMs
  } catch {
    return null
  }
}

function parseSitemapUrls(repoRoot) {
  const smPath = path.join(repoRoot, 'sitemap.xml')
  if (!fs.existsSync(smPath)) {
    return { file: 'sitemap.xml', urls: [], urlCount: 0 }
  }
  const xml = fs.readFileSync(smPath, 'utf8')
  const urls = []
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi
  let m
  while ((m = re.exec(xml)) !== null) {
    urls.push(m[1].trim())
  }
  return { file: 'sitemap.xml', urls, urlCount: urls.length }
}

function main() {
  const repoRoot = process.env.SUDOKUADAY_REPO_PATH
  if (!repoRoot) {
    console.error('Set SUDOKUADAY_REPO_PATH to a checkout of github.com/jipvandervelde/sudokuaday.com')
    process.exit(1)
  }
  const resolved = path.resolve(repoRoot)
  if (!fs.existsSync(path.join(resolved, 'config.locales.json'))) {
    console.error(`No config.locales.json at ${resolved}`)
    process.exit(1)
  }

  let previousRunHistory = []
  try {
    if (fs.existsSync(OUT_FILE)) {
      const prev = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'))
      if (Array.isArray(prev.runHistory)) previousRunHistory = prev.runHistory
    }
  } catch {
    /* ignore corrupt or empty */
  }

  const staleLagHours = Number(process.env.STALE_LAG_HOURS)
  const lagMs = (Number.isFinite(staleLagHours) && staleLagHours >= 0 ? staleLagHours : 24) * 3600 * 1000

  const cfg = readConfig(resolved)
  const defaultLocale = cfg.defaultLocale ?? 'en'
  const supported = cfg.supportedLocales ?? []
  const nonEn = supported.filter((l) => l !== defaultLocale)

  const localeFolderNames = new Set(nonEn.map((l) => l))

  const englishPaths = collectEnglishPaths(resolved, localeFolderNames)

  /** @type {{ type: 'missing' | 'extra'; locale: string; path: string }[]} */
  const issues = []
  /** @type {{ type: 'metadata'; locale: string; path: string; field: 'title' | 'description' | 'h1'; enValue: string; localeValue: string }[]} */
  const metadataIssues = []

  const summary = {}
  for (const loc of nonEn) {
    summary[loc] = { missing: 0, extra: 0, metadataMismatches: 0, staleMirror: 0 }
  }

  for (const loc of nonEn) {
    const localePaths = collectLocalePaths(resolved, loc)
    for (const p of englishPaths) {
      if (!localePaths.has(p)) {
        summary[loc].missing += 1
        issues.push({ type: 'missing', locale: loc, path: p })
      }
    }
    for (const p of localePaths) {
      if (!englishPaths.has(p)) {
        summary[loc].extra += 1
        issues.push({ type: 'extra', locale: loc, path: p })
      }
    }
  }

  for (const loc of nonEn) {
    const localePaths = collectLocalePaths(resolved, loc)
    for (const p of englishPaths) {
      if (!localePaths.has(p)) continue
      const enFile = path.join(resolved, p)
      const locFile = path.join(resolved, loc, p)
      let enHtml
      let oHtml
      try {
        enHtml = fs.readFileSync(enFile, 'utf8')
        oHtml = fs.readFileSync(locFile, 'utf8')
      } catch {
        continue
      }
      const enMeta = extractMetadata(enHtml)
      const oMeta = extractMetadata(oHtml)
      const pairs = [
        ['title', enMeta.title, oMeta.title],
        ['description', enMeta.description, oMeta.description],
        ['h1', enMeta.h1, oMeta.h1],
      ]
      for (const [field, a, b] of pairs) {
        if (normalizeComparable(a) !== normalizeComparable(b)) {
          summary[loc].metadataMismatches += 1
          metadataIssues.push({
            type: 'metadata',
            locale: loc,
            path: p,
            field,
            enValue: truncateMeta(a),
            localeValue: truncateMeta(b),
          })
        }
      }
    }
  }

  const commitTimeMap = buildHtmlCommitTimeMap(resolved)

  /** @type {{ type: 'stale_mirror'; locale: string; path: string; enModifiedAt: string; localeModifiedAt: string; lagHours: number }[]} */
  const freshnessIssues = []
  for (const loc of nonEn) {
    const localePaths = collectLocalePaths(resolved, loc)
    for (const p of englishPaths) {
      if (!localePaths.has(p)) continue
      const enRel = p
      const locRel = `${loc}/${p}`
      const enT = timeForPath(resolved, enRel, commitTimeMap)
      const locT = timeForPath(resolved, locRel, commitTimeMap)
      if (enT == null || locT == null) continue
      if (enT > locT + lagMs) {
        summary[loc].staleMirror += 1
        const lagHours = Math.round((enT - locT) / 3600000)
        freshnessIssues.push({
          type: 'stale_mirror',
          locale: loc,
          path: p,
          enModifiedAt: new Date(enT).toISOString(),
          localeModifiedAt: new Date(locT).toISOString(),
          lagHours,
        })
      }
    }
  }

  const staleMirrorTotal = freshnessIssues.length
  const freshnessIssuesStored = freshnessIssues.slice(0, MAX_FRESHNESS_ISSUES_STORED)

  const sitemapData = parseSitemapUrls(resolved)
  /** @type {{ type: 'sitemap_orphan'; urlPath: string; loc: string }[]} */
  const sitemapIssues = []
  const hostNeedle = 'sudokuaday.com'

  for (const locUrl of sitemapData.urls) {
    let u
    try {
      u = new URL(locUrl)
    } catch {
      continue
    }
    if (!u.hostname.includes(hostNeedle)) continue
    const repoRel = resolvePublicPathToRepoFile(resolved, u.pathname)
    if (!repoRel) {
      if (sitemapIssues.length < MAX_SITEMAP_ISSUES) {
        sitemapIssues.push({
          type: 'sitemap_orphan',
          urlPath: u.pathname || '/',
          loc: locUrl,
        })
      }
    }
  }

  const metadataIssuesTotal = metadataIssues.length
  const metadataIssuesStored = metadataIssues.slice(0, MAX_METADATA_ISSUES_STORED)

  const englishPathsSorted = Array.from(englishPaths).sort((a, b) => a.localeCompare(b))

  const generatedAt = new Date().toISOString()
  const snapshot = {
    generatedAt,
    repoPath: resolved,
    repoSha: process.env.SUDOKUADAY_REPO_SHA || undefined,
    staleLagHours: lagMs / 3600000,
    defaultLocale,
    locales: supported,
    nonDefaultLocales: nonEn,
    englishHtmlCount: englishPaths.size,
    /** Repo-relative English HTML paths (for coverage matrix UI); mirrors live at `{locale}/{path}` */
    englishPaths: englishPathsSorted,
    summary,
    issues,
    metadataIssues: metadataIssuesStored,
    metadataIssuesTotal,
    metadataIssuesCapped: metadataIssuesTotal > metadataIssuesStored.length,
    freshnessIssues: freshnessIssuesStored,
    staleMirrorTotal,
    freshnessIssuesCapped: staleMirrorTotal > freshnessIssuesStored.length,
    sitemap:
      sitemapData.urlCount > 0
        ? { file: sitemapData.file, urlCount: sitemapData.urlCount }
        : undefined,
    sitemapIssues,
  }

  const historyEntry = {
    generatedAt,
    repoSha: snapshot.repoSha,
    pathIssueCount: issues.length,
    metadataTotal: metadataIssuesTotal,
    staleMirrorTotal,
    englishHtmlCount: englishPaths.size,
  }
  const seenAt = new Set()
  const runHistory = []
  for (const e of [historyEntry, ...previousRunHistory]) {
    if (seenAt.has(e.generatedAt)) continue
    seenAt.add(e.generatedAt)
    runHistory.push(e)
    if (runHistory.length >= 40) break
  }
  snapshot.runHistory = runHistory

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })
  fs.writeFileSync(OUT_FILE, JSON.stringify(snapshot, null, 2), 'utf8')
  console.log(
    `Wrote ${OUT_FILE} (path: ${issues.length}, metadata total: ${metadataIssuesTotal}, stored meta: ${metadataIssuesStored.length}, stale mirror: ${staleMirrorTotal} (stored ${freshnessIssuesStored.length}), sitemap orphans: ${sitemapIssues.length}, English paths: ${englishPaths.size})`,
  )
}

main()
