import { mergeAnalyticsSnapshot, type AnalyticsSnapshot } from '../types/analytics'

const SNAPSHOT_URL = '/analytics-snapshot.json'

/**
 * Loads optional static snapshot. Never throws: missing file, network errors, and bad JSON
 * all yield a safe empty snapshot so the UI can render without connectors.
 */
export async function fetchAnalyticsSnapshot(): Promise<AnalyticsSnapshot> {
  try {
    const res = await fetch(SNAPSHOT_URL, { cache: 'no-store' })
    if (!res.ok) {
      return mergeAnalyticsSnapshot(null)
    }
    const text = await res.text()
    if (!text.trim()) {
      return mergeAnalyticsSnapshot(null)
    }
    try {
      return mergeAnalyticsSnapshot(JSON.parse(text) as unknown)
    } catch {
      return mergeAnalyticsSnapshot(null)
    }
  } catch {
    return mergeAnalyticsSnapshot(null)
  }
}
