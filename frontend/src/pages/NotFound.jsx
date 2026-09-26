import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function NotFound() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="row justify-content-center">
      <div className="col-md-8 col-lg-6 text-center">
        <div className="card">
          <div className="card-body py-5">
            <p className="display-3 fw-bold text-primary mb-2">404</p>
            <h2 className="card-title mb-3">Página no encontrada</h2>
            <p className="text-muted mb-4">
              La dirección que intentas abrir no existe o fue movida.
              Revisa el enlace o vuelve al inicio.
            </p>
            <div className="d-flex gap-2 justify-content-center flex-wrap">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate(user ? '/dashboard' : '/login')}
              >
                {user ? 'Ir al Dashboard' : 'Iniciar Sesión'}
              </button>
              <Link to="/" className="btn btn-outline-secondary">
                Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
