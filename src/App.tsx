import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Spinner from './ui/components/Spinner'

// Lazy-load routes so each screen is a small, separately cached chunk.
const Home = lazy(() => import('./pages/Home'))
const Session = lazy(() => import('./pages/Session'))
const Settings = lazy(() => import('./pages/Settings'))

// In production the app is served from /invata-romana/ (GitHub Pages); BASE_URL
// is '/' in dev. react-router wants the basename without a trailing slash.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/session" element={<Session />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
