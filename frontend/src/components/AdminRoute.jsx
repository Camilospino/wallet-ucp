import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Route guard for ADMIN-only pages.
 * Redirects unauthenticated users to /login and authenticated non-admins to
 * the dashboard, so the admin panel is never rendered for the wrong role.
 */
export const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.rol !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}