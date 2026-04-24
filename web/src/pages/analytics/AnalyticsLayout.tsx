import { NavLink, Outlet } from 'react-router-dom'
import { analyticsSubNavLinkClass } from '../../lib/navLinkClasses'

export function AnalyticsLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics and SEO</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          These screens read an optional static file{' '}
          <code className="rounded bg-black/10 px-1">analytics-snapshot.json</code> (same idea as parity). The committed
          file may include an <strong>illustrative fixture</strong> so tables and CSV export are testable; replace it with
          real connector output in CI or a BFF. Missing or invalid JSON still loads safely (empty snapshot).
        </p>
      </div>
      <nav className="flex flex-wrap gap-1 border-b border-slate-200 pb-2 dark:border-slate-800" aria-label="Analytics sections">
        <NavLink to="." end className={analyticsSubNavLinkClass}>
          Overview
        </NavLink>
        <NavLink to="pages" className={analyticsSubNavLinkClass}>
          Pages
        </NavLink>
        <NavLink to="traffic" className={analyticsSubNavLinkClass}>
          Traffic
        </NavLink>
        <NavLink to="search-console" className={analyticsSubNavLinkClass}>
          Search Console
        </NavLink>
        <NavLink to="seo" className={analyticsSubNavLinkClass}>
          SEO vendor
        </NavLink>
      </nav>
      <Outlet />
    </div>
  )
}
