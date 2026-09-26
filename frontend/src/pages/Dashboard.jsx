import React, { useState, useEffect } from 'react'
import { formatCurrency } from '../utils/format'
import { Link } from 'react-router-dom'
import { walletAPI } from '../services/walletService'

export default function Dashboard() {
  const [walletData, setWalletData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadWalletData()
  }, [])

  const loadWalletData = async () => {
    try {
      const response = await walletAPI.getWallet()
      setWalletData(response.data)
    } catch (err) {
      setError('Error al cargar datos de la billetera')
    } finally {
      setLoading(false)
    }
  }


  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-message">
        {error}
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-4">Dashboard</h1>
      
      {walletData && (
        <>
          <div className="balance-card">
            <h3>Saldo Actual</h3>
            <div className="balance-amount">
              {formatCurrency(walletData.wallet.saldo)}
            </div>
            <p className="mb-0">
              Estado: <span className="badge bg-light text-dark">
                {walletData.wallet.estado === 'ACTIVE' ? 'Activa' : walletData.wallet.estado}
              </span>
            </p>
          </div>

          <div className="row mb-4">
            <div className="col-md-3">
              <Link to="/deposit" className="quick-action-btn">
                <span>➕</span>
                <span>Depositar</span>
              </Link>
            </div>
            <div className="col-md-3">
              <Link to="/withdraw" className="quick-action-btn">
                <span>➖</span>
                <span>Retirar</span>
              </Link>
            </div>
            <div className="col-md-3">
              <Link to="/transfer" className="quick-action-btn">
                <span>↔️</span>
                <span>Transferir</span>
              </Link>
            </div>
            <div className="col-md-3">
              <Link to="/transactions" className="quick-action-btn">
                <span>📋</span>
                <span>Movimientos</span>
              </Link>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Últimos Movimientos</h5>
              {walletData.recentMovements && walletData.recentMovements.length > 0 ? (
                <div className="mt-3">
                  {walletData.recentMovements.map((movement) => (
                    <div
                      key={movement.id}
                      className={`transaction-item ${movement.tipo.toLowerCase()}`}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <strong>
                            {movement.tipo === 'CREDIT' ? 'Crédito' : 'Débito'}
                          </strong>
                          <p className="mb-0 text-muted">
                            {movement.transaction_tipo} - {movement.transaction_estado}
                          </p>
                        </div>
                        <div className="text-end">
                          <div className={`fw-bold ${
                            movement.tipo === 'CREDIT' ? 'text-success' : 'text-danger'
                          }`}>
                            {movement.tipo === 'CREDIT' ? '+' : '-'}
                            {formatCurrency(movement.monto)}
                          </div>
                          <small className="text-muted">
                            {new Date(movement.created_at).toLocaleDateString()}
                          </small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted">No hay movimientos recientes</p>
              )}
              
              <Link to="/transactions" className="btn btn-outline-primary mt-3">
                Ver todos los movimientos
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
