import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { walletAPI } from '../services/walletService'
import { CardPicker } from '../components/CardPicker'
import { CARD_TYPE_LABEL, formatCurrency } from '../utils/format'

export default function Deposit() {
  const [amount, setAmount] = useState('')
  const [card, setCard] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const navigate = useNavigate()

  const numericAmount = parseFloat(amount)
  const amountValid = Number.isFinite(numericAmount) && numericAmount > 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!amountValid) {
      setError('El monto debe ser un número positivo')
      return
    }
    if (!card) {
      setError('Selecciona una tarjeta')
      return
    }

    setLoading(true)
    try {
      await walletAPI.deposit(numericAmount, card.id)
      setSuccess(`Depósito realizado en tu tarjeta de ${CARD_TYPE_LABEL[card.tipo].toLowerCase()} por ${formatCurrency(numericAmount)}`)
      setAmount('')
      // Show the new card balances before going back to the dashboard.
      setRefreshKey((key) => key + 1)
      setTimeout(() => navigate('/dashboard'), 2500)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al realizar depósito')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-8 col-lg-6">
        <div className="card">
          <div className="card-body">
            <h2 className="card-title text-center mb-4">Depositar</h2>

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleSubmit}>
              <CardPicker
                value={card?.id}
                onChange={setCard}
                label="¿En qué tarjeta quieres depositar?"
                amount={amount}
                checkFunds={false}
                disabled={loading}
                refreshKey={refreshKey}
              />

              <div className="mb-3">
                <label htmlFor="amount" className="form-label">
                  Monto a depositar
                </label>
                <input
                  type="number"
                  className="form-control"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="0.00"
                  disabled={loading}
                />
                {amountValid && card && (
                  <small className="text-muted d-block mt-1">
                    Tu tarjeta de {CARD_TYPE_LABEL[card.tipo].toLowerCase()} quedará con{' '}
                    <strong>{formatCurrency(card.saldo + numericAmount)}</strong>
                  </small>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={loading || !card || !amountValid}
              >
                {loading
                  ? 'Procesando...'
                  : card ? `Depositar en tarjeta de ${CARD_TYPE_LABEL[card.tipo].toLowerCase()}` : 'Depositar'}
              </button>
            </form>

            <div className="text-center mt-3">
              <button
                className="btn btn-outline-secondary"
                onClick={() => navigate('/dashboard')}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
