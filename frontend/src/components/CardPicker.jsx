import React, { useEffect, useState } from 'react'
import { cardAPI } from '../services/walletService'
import { PaymentCard } from './PaymentCard'

/**
 * Shows the user's two cards (credit and debit) with their balances and lets
 * them pick the one a deposit, withdrawal or transfer uses. Shared by the
 * three pages so they all behave the same.
 *
 * - `value` is the selected card id; `onChange(card)` receives the full card.
 * - The debit card is preselected so the common case needs no click.
 * - `amount` + `checkFunds` flag a card that cannot cover the amount.
 * - Changing `refreshKey` reloads the balances (e.g. after an operation).
 */
export const CardPicker = ({
  value, onChange, label, amount, checkFunds = false, disabled = false, refreshKey = 0
}) => {
  const [cards, setCards] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error

  useEffect(() => {
    let cancelled = false

    cardAPI.getCards()
      .then((res) => {
        if (cancelled) return
        const list = res.data.cards
        setCards(list)
        setStatus('ready')
        // Keep the current choice (with its fresh balance) or default to debit.
        const current = list.find((card) => card.id === value) ||
          list.find((card) => card.tipo === 'DEBIT') || list[0]
        if (current) onChange(current)
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => { cancelled = true }
    // Reload only on mount and when asked to; `value` changes on every pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  if (status === 'loading' && cards.length === 0) {
    return (
      <div className="mb-3 text-muted small">
        <span className="spinner-border spinner-border-sm me-1" role="status" />
        Cargando tus tarjetas...
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="alert alert-warning py-2">
        No se pudieron cargar tus tarjetas. Recarga la página para intentarlo de nuevo.
      </div>
    )
  }

  const numericAmount = parseFloat(amount)

  return (
    <div className="mb-3">
      <span className="form-label d-block" id="card-picker-label">{label}</span>
      <div className="row g-3" role="radiogroup" aria-labelledby="card-picker-label">
        {cards.map((card) => {
          const short = checkFunds && Number.isFinite(numericAmount) && numericAmount > card.saldo
          return (
            <div className="col-6" key={card.id}>
              <PaymentCard
                card={card}
                selected={card.id === value}
                onSelect={onChange}
                disabled={disabled}
                warning={short ? 'Saldo insuficiente' : null}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
