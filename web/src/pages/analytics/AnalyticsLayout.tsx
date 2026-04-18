import { NavLink, Outlet } from 'react-router-dom'

const subNavClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
      : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
  ].join(' ')

export function AnalyticsLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics and SEO</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          These screens read an optional static file{' '}
          <code className="rounded bg-black/10 px-1">analytics-snapshot.json</code> (same idea as parity). Connectors
          are not enabled yet — you will not see errors, only empty states until a job or BFF fills the snapshot.
        </p>
      </div>
      <nav className="flex flex-wrap gap-1 border-b border-slate-200 pb-2 dark:border-slate-800">
        <NavLink to="." end className={subNavClass}>
          Overview
        </NavLink>
        <NavLink to="traffic" className={subNavClass}>
          Traffic
        </NavLink>
        <NavLink to="search-console" className={subNavClass}>
          Search Console
        </NavLink>
        <NavLink to="seo" className={subNavClass}>
          SEO vendor
        </NavLink>
      </nav>
      <Outlet />
    </div>
  )
}
