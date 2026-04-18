import type { ParitySnapshot } from '../types/parity'

export async function fetchParitySnapshot(): Promise<ParitySnapshot> {
  const res = await fetch('/parity-snapshot.json', { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Failed to load parity snapshot (${res.status})`)
  }
  return res.json() as Promise<ParitySnapshot>
}
