import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const Navbar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Distinguishes the two deployment environments at a glance. The value is
  // baked in at build time by the pipeline, so QA and production can never
  // show the same badge.
  const environment = import.meta.env.VITE_ENV_NAME || 'local'

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container">
        <Link className="navbar-brand" to="/dashboard">
          WalletUCP
        </Link>
        <span
          className="badge rounded-pill text-bg-warning me-2 align-self-center"
          title="Ambiente de despliegue actual"
        >
          {environment}
        </span>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            {user && (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/dashboard">
                    Dashboard
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/deposit">
                    Depositar
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/withdraw">
                    Retirar
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/transfer">
                    Transferir
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/transactions">
                    Movimientos
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/cards">
                    Tarjetas
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/profile">
                    Perfil
                  </Link>
                </li>
                {user.rol === 'ADMIN' && (
                  <li className="nav-item">
                    <Link className="nav-link" to="/admin">
                      Admin
                    </Link>
                  </li>
                )}
              </>
            )}
          </ul>
          <ul className="navbar-nav">
            {user ? (
              <li className="nav-item">
                <button className="btn btn-outline-light" onClick={handleLogout}>
                  Cerrar Sesión
                </button>
              </li>
            ) : (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/login">
                    Iniciar Sesión
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/register">
                    Registrarse
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  )
}
