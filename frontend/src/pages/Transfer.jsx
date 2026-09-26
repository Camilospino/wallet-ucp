import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { walletAPI, userAPI } from '../services/walletService'
import { formatCurrency } from '../utils/format'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Transfer() {
  const [formData, setFormData] = useState({ recipientEmail: '', amount: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Recipient preview, so the user confirms a name instead of a blind email.
  const [recipient, setRecipient] = useState(null)
  const [recipientStatus, setRecipientStatus] = useState('idle') // idle | loading | found | notfound | error
  const [saldo, setSaldo] = useState(null)

  const [confirming, setConfirming] = useState(false)

  const navigate = useNavigate()
  const debounceRef = useRef(null)

  // Load the balance once, to show what would be left after the transfer.
  useEffect(() => {
    walletAPI.getWallet()
      .then((res) => setSaldo(parseFloat(res.data.wallet.saldo)))
      .catch(() => setSaldo(null))
  }, [])

  // Debounced lookup: only fires once the email looks valid and typing paused.
  useEffect(() => {
    const email = formData.recipientEmail.trim().toLowerCase()

    if (!EMAIL_RE.test(email)) {
      setRecipient(null)
      setRecipientStatus('idle')
      return
    }

    setRecipientStatus('loading')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await userAPI.lookupRecipient(email)
        setRecipient(res.data)
        setRecipientStatus('found')
      } catch (err) {
        setRecipient(null)
        setRecipientStatus(err.response?.status === 404 ? 'notfound' : 'error')
      }
    }, 400)

    return () => clearTimeout(debounceRef.current)
  }, [formData.recipientEmail])

  const amount = parseFloat(formData.amount)
  const amountValid = Number.isFinite(amount) && amount > 0
  const remaining = saldo !== null && amountValid ? saldo - amount : null
  const exceedsBalance = amountValid && saldo !== null && amount > saldo

  const canSubmit =
    EMAIL_RE.test(formData.recipientEmail.trim()) &&
    amountValid &&
    !exceedsBalance &&
    recipientStatus === 'found'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!canSubmit) return

    // First click opens the confirmation panel with the real details.
    if (!confirming) {
      setConfirming(true)
      return
    }

    setLoading(true)
    try {
      await walletAPI.transfer(formData.recipientEmail.trim().toLowerCase(), amount)
      setSuccess(`Transferencia a ${recipient.nombre} realizada exitosamente`)
      setFormData({ recipientEmail: '', amount: '' })
      setRecipient(null)
      setRecipientStatus('idle')
      setConfirming(false)
      setTimeout(() => navigate('/dashboard'), 2000)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al realizar transferencia')
      setConfirming(false)
    } finally {
      setLoading(false)
    }
  }

  const cancelConfirmation = () => {
    setConfirming(false)
    setError('')
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-8 col-lg-6">
        <div className="card">
          <div className="card-body">
            <h2 className="card-title text-center mb-4">Transferir</h2>

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="recipientEmail" className="form-label">
                  Email del destinatario
                </label>
                <input
                  type="email"
                  className={`form-control ${
                    recipientStatus === 'notfound' ? 'is-invalid' : ''
                  }`}
                  id="recipientEmail"
                  name="recipientEmail"
                  value={formData.recipientEmail}
                  onChange={(e) => {
                    setFormData({ ...formData, recipientEmail: e.target.value })
                    setConfirming(false)
                  }}
                  disabled={confirming}
                  required
                  placeholder="usuario@example.com"
                />

                {recipientStatus === 'loading' && (
                  <div className="form-text text-muted">
                    <span className="spinner-border spinner-border-sm me-1" role="status" />
                    Buscando destinatario...
                  </div>
                )}
                {recipientStatus === 'found' && recipient && (
                  <div className="alert alert-success d-flex align-items-center mt-2 mb-0 py-2">
                    <span
                      className="badge bg-success rounded-circle me-2 d-inline-flex align-items-center justify-content-center"
                      style={{ width: '28px', height: '28px' }}
                    >
                      {recipient.inicial}
                    </span>
                    <span className="text-dark">
                      Destinatario: <strong>{recipient.nombre}</strong>
                    </span>
                  </div>
                )}
                {recipientStatus === 'notfound' && (
                  <div className="invalid-feedback d-block">
                    No existe ningún usuario registrado con ese correo.
                  </div>
                )}
              </div>

              <div className="mb-3">
                <label htmlFor="amount" className="form-label">Monto a transferir</label>
                <input
                  type="number"
                  className={`form-control ${
                    exceedsBalance ? 'is-invalid' : ''
                  }`}
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={(e) => {
                    setFormData({ ...formData, amount: e.target.value })
                    setConfirming(false)
                  }}
                  disabled={confirming}
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="0.00"
                />

                {exceedsBalance && (
                  <div className="invalid-feedback d-block">
                    El monto supera tu saldo disponible.
                  </div>
                )}

                {amountValid && !exceedsBalance && (
                  <small className="text-muted d-block mt-1">
                    {formatCurrency(amount)}
                  </small>
                )}

                {saldo !== null && (
                  <small className="text-muted d-block">
                    Saldo disponible: <strong>{formatCurrency(saldo)}</strong>
                  </small>
                )}

                {remaining !== null && !exceedsBalance && (
                  <small className="text-muted d-block">
                    Saldo después de transferir: <strong>{formatCurrency(remaining)}</strong>
                  </small>
                )}
              </div>

              {confirming ? (
                <div className="alert alert-info">
                  <p className="mb-2">
                    Vas a transferir <strong>{formatCurrency(amount)}</strong> a{' '}
                    <strong>{recipient.nombre}</strong>.
                  </p>
                  <p className="mb-3 text-muted small">
                    Te quedarás con {formatCurrency(remaining)}.
                  </p>
                  <div className="d-flex gap-2">
                    <button
                      type="submit"
                      className="btn btn-success"
                      disabled={loading}
                    >
                      {loading ? 'Procesando...' : 'Confirmar transferencia'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={cancelConfirmation}
                      disabled={loading}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={!canSubmit}
                  >
                    {loading ? 'Procesando...' : 'Transferir'}
                  </button>
                  {!canSubmit && (
                    <small className="text-muted d-block text-center mt-2">
                      Completa un email válido con destinatario encontrado y un monto dentro de tu saldo.
                    </small>
                  )}
                  <div className="text-center mt-3">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => navigate('/dashboard')}
                    >
                      Volver
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
