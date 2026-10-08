import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { walletAPI } from '../services/walletService'
import { CardPicker } from '../components/CardPicker'
import { CARD_TYPE_LABEL, formatCurrency } from '../utils/format'

export default function Withdraw() {
  const [amount, setAmount] = useState('')
  const [card, setCard] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const navigate = useNavigate()

  const numericAmount = parseFloat(amount)
  const amountValid = Number.isFinite(numericAmount) && numericAmount > 0
  // Only the chosen card counts: money on the other card cannot cover it.
  const exceedsCard = amountValid && card !== null && numericAmount > card.saldo

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
    if (exceedsCard) {
      setError(`Saldo insuficiente en la tarjeta de ${CARD_TYPE_LABEL[card.tipo].toLowerCase()}`)
      return
    }

    setLoading(true)
    try {
      await walletAPI.withdraw(numericAmount, card.id)
      setSuccess(`Retiro realizado de tu tarjeta de ${CARD_TYPE_LABEL[card.tipo].toLowerCase()} por ${formatCurrency(numericAmount)}`)
      setAmount('')
      // Show the new card balances before going back to the dashboard.
      setRefreshKey((key) => key + 1)
      setTimeout(() => navigate('/dashboard'), 2500)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al realizar retiro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-8 col-lg-6">
        <div className="card">
          <div className="card-body">
            <h2 className="card-title text-center mb-4">Retirar</h2>

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleSubmit}>
              <CardPicker
                value={card?.id}
                onChange={setCard}
                label="¿De qué tarjeta quieres retirar?"
                amount={amount}
                checkFunds={true}
                disabled={loading}
                refreshKey={refreshKey}
              />

              <div className="mb-3">
                <label htmlFor="amount" className="form-label">
                  Monto a retirar
                </label>
                <input
                  type="number"
                  className={`form-control ${exceedsCard ? 'is-invalid' : ''}`}
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="0.00"
                  disabled={loading}
                />
                {exceedsCard && (
                  <div className="invalid-feedback d-block">
                    La tarjeta de {CARD_TYPE_LABEL[card.tipo].toLowerCase()} solo tiene{' '}
                    {formatCurrency(card.saldo)}. Elige la otra tarjeta o un monto menor.
                  </div>
                )}
                {amountValid && card && !exceedsCard && (
                  <small className="text-muted d-block mt-1">
                    Tu tarjeta de {CARD_TYPE_LABEL[card.tipo].toLowerCase()} quedará con{' '}
                    <strong>{formatCurrency(card.saldo - numericAmount)}</strong>
                  </small>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={loading || !card || !amountValid || exceedsCard}
              >
                {loading
                  ? 'Procesando...'
                  : card ? `Retirar de tarjeta de ${CARD_TYPE_LABEL[card.tipo].toLowerCase()}` : 'Retirar'}
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
