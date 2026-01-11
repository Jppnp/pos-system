import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import { PWAInstallPrompt } from './components/PWAInstallPrompt'
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt'
import './index.css'

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <ProtectedRoute>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </ProtectedRoute>
        </Router>
        <PWAInstallPrompt />
        <PWAUpdatePrompt />
      </CartProvider>
    </AuthProvider>
  )
}

export default App
