import { type ReactNode, useCallback, useState } from 'react'
import { formControlClassName, primaryButtonClassName } from '../lib/formControls'

const SESSION_KEY = 'sudokuaday-backoffice-auth'

type Props = {
  children: ReactNode
}

export function AuthGate({ children }: Props) {
  const password = import.meta.env.VITE_BACKOFFICE_PASSWORD
  const [unlocked, setUnlocked] = useState(() => {
    if (!password) return true
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1'
    } catch {
      return false
    }
  })

  const submit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const fd = new FormData(e.currentTarget)
      const value = String(fd.get('password') ?? '')
      if (password && value === password) {
        try {
          sessionStorage.setItem(SESSION_KEY, '1')
        } catch {
          /* ignore */
        }
        setUnlocked(true)
      }
    },
    [password],
  )

  if (!password) {
    if (import.meta.env.DEV) {
      return (
        <>
          <div className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-900 dark:text-amber-100">
            Local dev: set <code className="rounded bg-black/10 px-1">VITE_BACKOFFICE_PASSWORD</code> to test the
            sign-in screen.
          </div>
          {children}
        </>
      )
    }
    return <>{children}</>
  }

  if (!unlocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 dark:bg-slate-950">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Sudoku a Day — Backoffice</h1>
        <p className="max-w-md text-center text-sm text-slate-600 dark:text-slate-400">
          Internal tool. Enter the shared password configured in{' '}
          <code className="rounded bg-black/10 px-1">VITE_BACKOFFICE_PASSWORD</code>.
        </p>
        <form onSubmit={submit} className="flex w-full max-w-xs flex-col gap-2">
          <label className="sr-only" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            spellCheck={false}
            className={`w-full ${formControlClassName}`}
            required
          />
          <button type="submit" className={primaryButtonClassName}>
            Continue
          </button>
        </form>
      </div>
    )
  }

  return <>{children}</>
}
