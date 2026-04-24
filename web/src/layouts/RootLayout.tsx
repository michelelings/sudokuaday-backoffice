import { type MouseEvent } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { mainNavLinkClass } from '../lib/navLinkClasses'

function skipToMain(e: MouseEvent<HTMLAnchorElement>) {
  e.preventDefault()
  const el = document.getElementById('main-content')
  if (!el) return
  const reduce =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.focus()
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

export function RootLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <a
        href="#main-content"
        onClick={skipToMain}
        className="fixed left-4 top-0 z-[var(--z-skip-link)] -translate-y-full rounded-b-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow transition-transform duration-150 ease-out focus:translate-y-0 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        Skip to main content
      </a>
      <header className="border-b border-slate-200 bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
        <div className="mx-auto flex max-w-[min(96rem,calc(100vw-2rem))] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Sudoku a Day</span>
            <span className="text-xs tracking-wide text-slate-500 dark:text-slate-400">
              Backoffice · parity (analytics UI prep, no live APIs)
            </span>
          </div>
          <nav className="flex flex-wrap gap-1" aria-label="Primary">
            <NavLink to="/" end className={mainNavLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/parity" className={mainNavLinkClass}>
              Parity issues
            </NavLink>
            <NavLink to="/coverage" className={mainNavLinkClass}>
              Coverage
            </NavLink>
            <NavLink to="/analytics" className={mainNavLinkClass}>
              Analytics
            </NavLink>
          </nav>
        </div>
      </header>
      <main
        id="main-content"
        className="mx-auto max-w-[min(96rem,calc(100vw-2rem))] scroll-mt-4 px-4 py-8 focus:outline-none"
        tabIndex={-1}
      >
        <Outlet />
      </main>
    </div>
  )
}
