/**
 * Read-only parity scan: English (repo root) vs mirrored paths under each locale folder.
 * Does not modify the website repo. See sudokuaday-backoffice.md (plan).
 *
 * Usage:
 *   SUDOKUADAY_REPO_PATH=/path/to/sudokuaday.com node scripts/ingest-parity.mjs
 *
 * Writes: public/parity-snapshot.json (for the Vite app to load).
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = path.resolve(__dirname, '..')
const OUT_FILE = path.join(WEB_ROOT, 'public', 'parity-snapshot.json')

/** Top-level dirs to skip when scanning English tree */
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

  const localeFolderNames = new Set(
    nonEn.map((l) => l),
  )

  const englishPaths = collectEnglishPaths(resolved, localeFolderNames)

  /** @type {{ type: 'missing' | 'extra'; locale: string; path: string }[]} */
  const issues = []

  const summary = {}

  for (const loc of nonEn) {
    const localePaths = collectLocalePaths(resolved, loc)
    let missing = 0
    let extra = 0

    for (const p of englishPaths) {
      if (!localePaths.has(p)) {
        missing += 1
        issues.push({ type: 'missing', locale: loc, path: p })
      }
    }
    for (const p of localePaths) {
      if (!englishPaths.has(p)) {
        extra += 1
        issues.push({ type: 'extra', locale: loc, path: p })
      }
    }

    summary[loc] = { missing, extra }
  }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    repoPath: resolved,
    defaultLocale,
    locales: supported,
    nonDefaultLocales: nonEn,
    englishHtmlCount: englishPaths.size,
    summary,
    issues,
  }

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })
  fs.writeFileSync(OUT_FILE, JSON.stringify(snapshot, null, 2), 'utf8')
  console.log(`Wrote ${OUT_FILE} (${issues.length} issues, ${englishPaths.size} English HTML paths)`)
}

main()
