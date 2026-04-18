/**
 * Build public sudokuaday.com URLs from repo-relative HTML paths (parity ingest shape).
 * Override origin with VITE_PUBLIC_SITE_ORIGIN for previews or staging.
 */

export function getPublicSiteOrigin(): string {
  const raw = import.meta.env.VITE_PUBLIC_SITE_ORIGIN ?? 'https://sudokuaday.com'
  return raw.replace(/\/+$/, '')
}

/** URL pathname (leading slash) for an English repo file, e.g. blog/x.html → /blog/x */
export function repoHtmlPathToUrlPath(repoPath: string): string {
  const normalized = repoPath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (normalized === 'index.html') return '/'
  if (normalized.endsWith('/index.html')) {
    const dir = normalized.slice(0, -'/index.html'.length)
    return dir ? `/${dir}/` : '/'
  }
  if (normalized.endsWith('.html')) {
    return `/${normalized.slice(0, -'.html'.length)}`
  }
  return `/${normalized}`
}

export function englishLiveUrl(repoPath: string): string {
  const origin = getPublicSiteOrigin()
  const pathname = repoHtmlPathToUrlPath(repoPath)
  if (pathname === '/') return `${origin}/`
  return `${origin}${pathname}`
}

/** Live URL for a locale mirror of an English repo path (same relative path under {locale}/). */
export function localeLiveUrl(locale: string, englishRepoPath: string): string {
  const origin = getPublicSiteOrigin()
  const pathname = repoHtmlPathToUrlPath(englishRepoPath)
  const loc = locale.replace(/^\/+|\/+$/g, '')
  if (pathname === '/') return `${origin}/${loc}/`
  return `${origin}/${loc}${pathname}`
}

/** Styling for links that open the public site (opens in new tab). */
export const liveSiteLinkClassName =
  'text-sky-800 no-underline hover:opacity-90 dark:text-sky-300 dark:hover:opacity-90'

/** If value is already absolute http(s), return it; else treat as pathname or path segment. */
export function hrefFromSnapshotPathOrUrl(pathOrUrl: string): string {
  const t = pathOrUrl.trim()
  if (/^https?:\/\//i.test(t)) return t
  const origin = getPublicSiteOrigin()
  const path = t.startsWith('/') ? t : `/${t}`
  return `${origin}${path}`
}
