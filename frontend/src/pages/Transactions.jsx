import React, { useState, useEffect, useCallback } from 'react'
import { walletAPI } from '../services/walletService'
import { formatCurrency, formatDateTime } from '../utils/format'

const TIPOS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'DEPOSIT', label: 'Depósitos' },
  { value: 'WITHDRAW', label: 'Retiros' },
  { value: 'TRANSFER', label: 'Transferencias' }
]

const ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'COMPLETED', label: 'Completadas' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'FAILED', label: 'Fallidas' },
  { value: 'CANCELLED', label: 'Canceladas' }
]

const PAGE_SIZE = 10

const TYPE_LABEL = {
  DEPOSIT: 'Depósito',
  WITHDRAW: 'Retiro',
  TRANSFER: 'Transferencia'
}

const STATUS_BADGE = {
  COMPLETED: 'success',
  PENDING: 'warning',
  FAILED: 'danger',
  CANCELLED: 'secondary'
}

const EMPTY_FILTERS = { tipo: '', estado: '', fechaInicio: '', fechaFin: '' }

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // `draft` holds what the user picked; `filters` is what is actually applied,
  // so typing a date does not fire a request on every keystroke.
  const [draft, setDraft] = useState(EMPTY_FILTERS)
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  const hasActiveFilters = Object.values(filters).some(Boolean)

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page, limit: PAGE_SIZE }
      if (filters.tipo) params.tipo = filters.tipo
      if (filters.estado) params.estado = filters.estado
      if (filters.fechaInicio) params.fechaInicio = filters.fechaInicio
      if (filters.fechaFin) params.fechaFin = filters.fechaFin

      const response = await walletAPI.getTransactions(params)
      setTransactions(response.data.transactions)
      setTotalPages(response.data.pagination.totalPages)
      setTotal(response.data.pagination.total)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar transacciones')
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  const applyFilters = (event) => {
    event.preventDefault()
    setFilters(draft)
    setPage(1)
  }

  const clearFilters = () => {
    setDraft(EMPTY_FILTERS)
    setFilters(EMPTY_FILTERS)
    setPage(1)
  }

  // Drop values that would make the range impossible (start after end).
  const invalidRange = Boolean(
    draft.fechaInicio && draft.fechaFin && draft.fechaInicio > draft.fechaFin
  )

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">Historial de Transacciones</h1>
        {!loading && (
          <span className="text-muted">
            {total} {total === 1 ? 'transacción' : 'transacciones'}
          </span>
        )}
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <form onSubmit={applyFilters}>
            <div className="row g-3 align-items-end">
              <div className="col-md-3">
                <label htmlFor="filtroTipo" className="form-label">Tipo</label>
                <select
                  id="filtroTipo"
                  className="form-select"
                  value={draft.tipo}
                  onChange={(e) => setDraft({ ...draft, tipo: e.target.value })}
                >
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="col-md-3">
                <label htmlFor="filtroEstado" className="form-label">Estado</label>
                <select
                  id="filtroEstado"
                  className="form-select"
                  value={draft.estado}
                  onChange={(e) => setDraft({ ...draft, estado: e.target.value })}
                >
                  {ESTADOS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="col-md-3">
                <label htmlFor="filtroDesde" className="form-label">Desde</label>
                <input
                  id="filtroDesde"
                  type="date"
                  className="form-control"
                  value={draft.fechaInicio}
                  max={draft.fechaFin || undefined}
                  onChange={(e) => setDraft({ ...draft, fechaInicio: e.target.value })}
                />
              </div>

              <div className="col-md-3">
                <label htmlFor="filtroHasta" className="form-label">Hasta</label>
                <input
                  id="filtroHasta"
                  type="date"
                  className="form-control"
                  value={draft.fechaFin}
                  min={draft.fechaInicio || undefined}
                  onChange={(e) => setDraft({ ...draft, fechaFin: e.target.value })}
                />
              </div>
            </div>

            {invalidRange && (
              <div className="alert alert-warning py-2 mt-3 mb-0">
                La fecha inicial no puede ser posterior a la fecha final.
              </div>
            )}

            <div className="mt-3 d-flex gap-2">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={invalidRange}
              >
                Aplicar filtros
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={clearFilters}
                disabled={!hasActiveFilters && !draft.tipo && !draft.estado}
              >
                Limpiar
              </button>
            </div>
          </form>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="card">
          <div className="card-body text-center">
            <p className="text-muted mb-0">
              {hasActiveFilters
                ? 'No hay transacciones que coincidan con los filtros'
                : 'No hay transacciones registradas'}
            </p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Referencia</th>
                    <th>Tipo</th>
                    <th className="text-end">Monto</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td><code>{transaction.referencia}</code></td>
                      <td>{TYPE_LABEL[transaction.tipo] || transaction.tipo}</td>
                      <td className="text-end fw-bold">
                        {formatCurrency(transaction.monto)}
                      </td>
                      <td>
                        <span className={`badge bg-${STATUS_BADGE[transaction.estado] || 'secondary'}`}>
                          {transaction.estado}
                        </span>
                      </td>
                      <td className="text-muted">{formatDateTime(transaction.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <nav className="mt-3">
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
        </div>
      )}
    </div>
  )
}
