import { Navigate, Route, Routes } from 'react-router-dom'
import { RootLayout } from './layouts/RootLayout'
import { DashboardPage } from './pages/DashboardPage'
import { DiffPage } from './pages/DiffPage'
import { ParityCoveragePage } from './pages/ParityCoveragePage'
import { ParityIssuesPage } from './pages/ParityIssuesPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="parity" element={<ParityIssuesPage />} />
        <Route path="coverage" element={<ParityCoveragePage />} />
        <Route path="diff" element={<DiffPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
