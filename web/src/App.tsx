import { Navigate, Route, Routes } from 'react-router-dom'
import { RootLayout } from './layouts/RootLayout'
import { DashboardPage } from './pages/DashboardPage'
import { DiffPage } from './pages/DiffPage'
import { ParityCoveragePage } from './pages/ParityCoveragePage'
import { ParityIssuesPage } from './pages/ParityIssuesPage'
import { AnalyticsLayout } from './pages/analytics/AnalyticsLayout'
import { AnalyticsOverviewPage } from './pages/analytics/AnalyticsOverviewPage'
import { AnalyticsSearchConsolePage } from './pages/analytics/AnalyticsSearchConsolePage'
import { AnalyticsSeoPage } from './pages/analytics/AnalyticsSeoPage'
import { AnalyticsTrafficPage } from './pages/analytics/AnalyticsTrafficPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="parity" element={<ParityIssuesPage />} />
        <Route path="coverage" element={<ParityCoveragePage />} />
        <Route path="analytics" element={<AnalyticsLayout />}>
          <Route index element={<AnalyticsOverviewPage />} />
          <Route path="traffic" element={<AnalyticsTrafficPage />} />
          <Route path="search-console" element={<AnalyticsSearchConsolePage />} />
          <Route path="seo" element={<AnalyticsSeoPage />} />
        </Route>
        <Route path="diff" element={<DiffPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
