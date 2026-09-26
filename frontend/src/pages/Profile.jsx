import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function Profile() {
  const { user: authUser } = useAuth()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadUserProfile = async () => {
      try {
        // Fetch fresh data so a blocked/deleted account is reflected here.
        const response = await api.get('/api/auth/me')
        if (!cancelled) {
          setUser(response.data.data.user)
        }
      } catch (err) {
        if (!cancelled) {
          // Fall back to the session data if the request fails.
          setUser(authUser || null)
          setError('No se pudo actualizar la información del perfil')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadUserProfile()

    return () => {
      cancelled = true
    }
  }, [authUser])

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
    return <div className="error-message">No hay información de usuario disponible</div>
  }

  return (
    <div>
      <h1 className="mb-4">Perfil de Usuario</h1>

      {error && (
        <div className="alert alert-warning">{error}</div>
      )}

      <div className="card">
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <h5 className="card-title">Información Personal</h5>
              <table className="table table-borderless">
                <tbody>
                  <tr>
                    <td><strong>Nombre:</strong></td>
                    <td>{user.nombre} {user.apellido}</td>
                  </tr>
                  <tr>
                    <td><strong>Email:</strong></td>
                    <td>{user.email}</td>
                  </tr>
                  <tr>
                    <td><strong>Rol:</strong></td>
                    <td>
                      <span className={`badge ${user.rol === 'ADMIN' ? 'bg-danger' : 'bg-primary'}`}>
                        {user.rol === 'ADMIN' ? 'Administrador' : 'Usuario'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="col-md-6">
              <h5 className="card-title">Estado de Cuenta</h5>
              <div className="alert alert-info">
                <p className="mb-0">
                  <strong>Estado:</strong>{' '}
                  {user.estado === 'ACTIVE' ? 'Activo' : user.estado}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <h5 className="card-title">Seguridad</h5>
            <div className="alert alert-warning">
              <p className="mb-0">
                <small>
                  Por seguridad, no mostramos tu contraseña. Si necesitas cambiarla, 
                  contacta al administrador del sistema.
                </small>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
