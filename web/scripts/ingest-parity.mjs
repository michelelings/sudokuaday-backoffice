/**
 * Read-only parity scan: English (repo root) vs mirrored paths under each locale folder,
 * optional metadata diff, sitemap URL → file resolution. Does not modify the website repo.
 *
 * Usage:
 *   SUDOKUADAY_REPO_PATH=/path/to/sudokuaday.com node scripts/ingest-parity.mjs
 * Optional: SUDOKUADAY_REPO_SHA=abc1234 (record in snapshot only)
 *
 * Writes: public/parity-snapshot.json
 */

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
    summary[loc] = { missing: 0, extra: 0, metadataMismatches: 0 }
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

  const snapshot = {
    generatedAt: new Date().toISOString(),
    repoPath: resolved,
    repoSha: process.env.SUDOKUADAY_REPO_SHA || undefined,
    defaultLocale,
    locales: supported,
    nonDefaultLocales: nonEn,
    englishHtmlCount: englishPaths.size,
    summary,
    issues,
    metadataIssues: metadataIssuesStored,
    metadataIssuesTotal,
    metadataIssuesCapped: metadataIssuesTotal > metadataIssuesStored.length,
    sitemap:
      sitemapData.urlCount > 0
        ? { file: sitemapData.file, urlCount: sitemapData.urlCount }
        : undefined,
    sitemapIssues,
  }

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })
  fs.writeFileSync(OUT_FILE, JSON.stringify(snapshot, null, 2), 'utf8')
  console.log(
    `Wrote ${OUT_FILE} (path: ${issues.length}, metadata total: ${metadataIssuesTotal}, stored: ${metadataIssuesStored.length}, sitemap orphans: ${sitemapIssues.length}, English paths: ${englishPaths.size})`,
  )
}

main()
