import React, { useState, useEffect } from 'react'
import { formatCurrency, formatDate } from '../utils/format'
import { adminAPI } from '../services/walletService'
import { useAuth } from '../context/AuthContext'

export default function Admin() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('users')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const PAGE_SIZE = 10

  useEffect(() => {
    if (user?.rol !== 'ADMIN') {
      setError('Acceso no autorizado')
      setLoading(false)
      return
    }
    // Clearing the previous tab's data is what keeps the render from reading a
    // key that does not exist: `data.users` while the wallets tab is selected
    // is `undefined`, and `undefined.map` crashed the whole panel to a blank
    // page. The new response repopulates `data` below.
    setData(null)
    loadData()
  }, [activeTab, page, user])

  // Switching tab must start from the first page, otherwise the user can land
  // on a page that does not exist for the new dataset.
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setPage(1)
    setError('')
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      const params = { page, limit: PAGE_SIZE }
      let response
      switch (activeTab) {
        case 'users':
          response = await adminAPI.getAllUsers(params)
          break
        case 'wallets':
          response = await adminAPI.getAllWallets(params)
          break
        case 'transactions':
          response = await adminAPI.getAllTransactions(params)
          break
        default:
          return
      }
      setData(response.data)
      setTotalPages(response.data.pagination.totalPages)
      setTotal(response.data.pagination.total)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar datos')
      setData(null)
    } finally {
      setLoading(false)
    }
  }
  const handleBlockUser = async (userId) => {
    try {
      await adminAPI.blockUser(userId)
      loadData()
    } catch (err) {
      setError('Error al bloquear usuario')
    }
  }

  const handleUnblockUser = async (userId) => {
    try {
      await adminAPI.unblockUser(userId)
      loadData()
    } catch (err) {
      setError('Error al desbloquear usuario')
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">Panel de Administración</h1>
        {!loading && (
          <span className="text-muted">
            {total} {total === 1 ? 'registro' : 'registros'}
          </span>
        )}
      </div>
      
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => handleTabChange('users')}
          >
            Usuarios
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'wallets' ? 'active' : ''}`}
            onClick={() => handleTabChange('wallets')}
          >
            Billeteras
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => handleTabChange('transactions')}
          >
            Transacciones
          </button>
        </li>
      </ul>

      {activeTab === 'users' && data && (
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">Usuarios Registrados</h5>
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Saldo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.users || []).map((user) => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.nombre} {user.apellido}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`badge ${user.rol === 'ADMIN' ? 'bg-danger' : 'bg-primary'}`}>
                          {user.rol}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${user.estado === 'ACTIVE' ? 'bg-success' : 'bg-danger'}`}>
                          {user.estado}
                        </span>
                      </td>
                      <td>{user.wallet ? formatCurrency(user.wallet.saldo) : 'N/A'}</td>
                      <td>
                        {user.estado === 'ACTIVE' ? (
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() => handleBlockUser(user.id)}
                          >
                            Bloquear
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleUnblockUser(user.id)}
                          >
                            Desbloquear
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'wallets' && data && (
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">Billeteras</h5>
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Usuario</th>
                    <th>Email</th>
                    <th>Saldo</th>
                    <th>Estado</th>
                    <th>Creada</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.wallets || []).map((wallet) => (
                    <tr key={wallet.id}>
                      <td>{wallet.id}</td>
                      <td>{wallet.nombre} {wallet.apellido}</td>
                      <td>{wallet.email}</td>
                      <td className="fw-bold">{formatCurrency(wallet.saldo)}</td>
                      <td>
                        <span className={`badge ${wallet.estado === 'ACTIVE' ? 'bg-success' : 'bg-danger'}`}>
                          {wallet.estado}
                        </span>
                      </td>
                      <td>{formatDate(wallet.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && data && (
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">Transacciones</h5>
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Referencia</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Origen</th>
                    <th>Destino</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.transactions || []).map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{transaction.id}</td>
                      <td><code>{transaction.referencia}</code></td>
                      <td>{transaction.tipo}</td>
                      <td className="fw-bold">{formatCurrency(transaction.monto)}</td>
                      <td>
                        <span className={`badge bg-${transaction.estado === 'COMPLETED' ? 'success' : 'warning'}`}>
                          {transaction.estado}
                        </span>
                      </td>
                      <td>{transaction.origen_email || 'N/A'}</td>
                      <td>{transaction.destino_email || 'N/A'}</td>
                      <td>{formatDate(transaction.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && data && totalPages > 1 && (
        <nav aria-label="Paginación">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
              <button
                type="button"
                className="page-link"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Anterior
              </button>
            </li>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <li key={n} className={`page-item ${page === n ? 'active' : ''}`}>
                <button
                  type="button"
                  className="page-link"
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              </li>
            ))}
            <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
              <button
                type="button"
                className="page-link"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                Siguiente
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  )
}
