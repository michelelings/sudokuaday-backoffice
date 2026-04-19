import { NavLink, Outlet } from 'react-router-dom'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
      : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
  ].join(' ')

export function RootLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-[min(96rem,calc(100vw-2rem))] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Sudoku a Day</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Backoffice · parity (analytics UI prep, no live APIs)
            </span>
          </div>
          <nav className="flex gap-1">
            <NavLink to="/" end className={linkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/parity" className={linkClass}>
              Parity issues
            </NavLink>
            <NavLink to="/coverage" className={linkClass}>
              Coverage
            </NavLink>
            <NavLink to="/analytics" className={linkClass}>
              Analytics
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[min(96rem,calc(100vw-2rem))] px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
