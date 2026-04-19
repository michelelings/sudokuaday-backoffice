/**
 * POST /api/trigger-ingest
 * Dispatches the “Ingest parity snapshot” workflow on GitHub (same as “Run workflow” in Actions).
 *
 * Vercel env:
 * - TRIGGER_SYNC_SECRET — shared with VITE_TRIGGER_SYNC_SECRET in the SPA build (optional hardening).
 * - GITHUB_DISPATCH_TOKEN — PAT with `actions: write` on this repo (fine-grained: Actions → Read and write).
 *
 * Repo defaults to VERCEL_GIT_REPO_OWNER/VERCEL_GIT_REPO_SLUG when present.
 */

const WORKFLOW_FILE = 'ingest-parity.yml'

function repoSlug() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY
  const owner = process.env.VERCEL_GIT_REPO_OWNER || process.env.GITHUB_REPO_OWNER
  const slug = process.env.VERCEL_GIT_REPO_SLUG || process.env.GITHUB_REPO_SLUG
  if (owner && slug) return `${owner}/${slug}`
  return 'michelelings/sudokuaday-backoffice'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const expected = process.env.TRIGGER_SYNC_SECRET
  if (!expected || expected.length < 16) {
    return res.status(503).json({
      error: 'Server sync is not configured (set TRIGGER_SYNC_SECRET and GITHUB_DISPATCH_TOKEN on Vercel).',
    })
  }

  const sent = req.headers['x-trigger-secret']
  const secret = Array.isArray(sent) ? sent[0] : sent
  if (secret !== expected) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const pat = process.env.GITHUB_DISPATCH_TOKEN
  if (!pat) {
    return res.status(503).json({ error: 'GITHUB_DISPATCH_TOKEN is not set' })
  }

  const repo = repoSlug()
  const url = `https://api.github.com/repos/${repo}/actions/workflows/${WORKFLOW_FILE}/dispatches`

  const gh = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${pat}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ ref: 'main' }),
  })

  if (!gh.ok) {
    const detail = await gh.text()
    return res.status(502).json({
      error: 'GitHub rejected the workflow dispatch',
      status: gh.status,
      detail: detail.slice(0, 500),
    })
  }

  return res.status(202).json({ ok: true })
}
