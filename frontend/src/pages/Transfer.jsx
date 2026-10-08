import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { walletAPI, userAPI } from '../services/walletService'
import { CARD_TYPE_LABEL, formatCurrency, formatCard } from '../utils/format'
import { CardPicker } from '../components/CardPicker'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Transfer() {
  const [formData, setFormData] = useState({ recipientEmail: '', amount: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Recipient preview, so the user confirms a name instead of a blind email.
  const [recipient, setRecipient] = useState(null)
  const [recipientStatus, setRecipientStatus] = useState('idle') // idle | loading | found | notfound | error

  const [confirming, setConfirming] = useState(false)

  // Sender's card the money leaves from, and the recipient's card type it
  // arrives on (the sender never sees the recipient's cards or balances).
  const [card, setCard] = useState(null)
  const [recipientCardType, setRecipientCardType] = useState('DEBIT')
  const [refreshKey, setRefreshKey] = useState(0)

  const navigate = useNavigate()
  const debounceRef = useRef(null)

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
  // Only the chosen card counts: money on the other card cannot cover it.
  const saldo = card ? card.saldo : null
  const remaining = saldo !== null && amountValid ? saldo - amount : null
  const exceedsBalance = amountValid && saldo !== null && amount > saldo

  const canSubmit =
    EMAIL_RE.test(formData.recipientEmail.trim()) &&
    amountValid &&
    !exceedsBalance &&
    recipientStatus === 'found' &&
    Boolean(card)

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
      await walletAPI.transfer(
        formData.recipientEmail.trim().toLowerCase(), amount, card.id, recipientCardType
      )
      setSuccess(`Transferencia a ${recipient.nombre} realizada exitosamente`)
      setFormData({ recipientEmail: '', amount: '' })
      setRecipient(null)
      setRecipientStatus('idle')
      setConfirming(false)
      setRecipientCardType('DEBIT')
      // Show the new card balance before going back to the dashboard.
      setRefreshKey((key) => key + 1)
      setTimeout(() => navigate('/dashboard'), 2500)
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

              <CardPicker
                value={card?.id}
                onChange={(selected) => {
                  setCard(selected)
                  setConfirming(false)
                }}
                label="¿De qué tarjeta sale el dinero?"
                amount={formData.amount}
                checkFunds
                disabled={confirming || loading}
                refreshKey={refreshKey}
              />

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
                    El monto supera el saldo de tu tarjeta de {CARD_TYPE_LABEL[card.tipo].toLowerCase()}.
                    Elige la otra tarjeta o un monto menor.
                  </div>
                )}

                {amountValid && !exceedsBalance && (
                  <small className="text-muted d-block mt-1">
                    {formatCurrency(amount)}
                  </small>
                )}

                {saldo !== null && (
                  <small className="text-muted d-block">
                    Saldo de la tarjeta: <strong>{formatCurrency(saldo)}</strong>
                  </small>
                )}

                {remaining !== null && !exceedsBalance && (
                  <small className="text-muted d-block">
                    La tarjeta quedará con: <strong>{formatCurrency(remaining)}</strong>
                  </small>
                )}
              </div>

              {recipientStatus === 'found' && recipient && (
                <div className="mb-3">
                  <span className="form-label d-block">
                    ¿A qué tarjeta de {recipient.nombre} llega el dinero?
                  </span>
                  <div className="btn-group w-100" role="radiogroup">
                    {['CREDIT', 'DEBIT'].map((tipo) => (
                      <React.Fragment key={tipo}>
                        <input
                          type="radio"
                          className="btn-check"
                          name="recipientCardType"
                          id={`recipient-${tipo}`}
                          value={tipo}
                          checked={recipientCardType === tipo}
                          onChange={() => {
                            setRecipientCardType(tipo)
                            setConfirming(false)
                          }}
                          disabled={confirming || loading}
                        />
                        <label className="btn btn-outline-primary" htmlFor={`recipient-${tipo}`}>
                          Tarjeta de {CARD_TYPE_LABEL[tipo].toLowerCase()}
                        </label>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {confirming ? (
                <div className="alert alert-info">
                  <p className="mb-2">
                    Vas a transferir <strong>{formatCurrency(amount)}</strong> a{' '}
                    <strong>{recipient.nombre}</strong> desde tu tarjeta{' '}
                    <strong>{formatCard(card)}</strong>. Le llegará a su tarjeta de{' '}
                    <strong>{CARD_TYPE_LABEL[recipientCardType].toLowerCase()}</strong>.
                  </p>
                  <p className="mb-3 text-muted small">
                    Tu tarjeta de {CARD_TYPE_LABEL[card.tipo].toLowerCase()} quedará con {formatCurrency(remaining)}.
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
                      Completa un email válido con destinatario encontrado y un monto que tu tarjeta pueda cubrir.
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
