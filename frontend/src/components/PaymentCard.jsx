import React from 'react'
import { CARD_BRAND_LABEL, CARD_TYPE_LABEL, formatCurrency } from '../utils/format'

/**
 * Draws one of the user's cards with its balance.
 *
 * With `onSelect` it is rendered as a button that behaves like a radio option
 * (used by CardPicker); without it, as a plain read-only card.
 */
export const PaymentCard = ({ card, selected = false, onSelect, disabled = false, warning }) => {
  const variant = card.tipo === 'CREDIT' ? 'pay-card--credit' : 'pay-card--debit'

  const content = (
    <>
      {selected && <span className="pay-card__check" aria-hidden="true">✓</span>}
      <div className="d-flex justify-content-between align-items-start">
        <span className="pay-card__type">{CARD_TYPE_LABEL[card.tipo] || card.tipo}</span>
        <span className="fw-semibold me-4">{CARD_BRAND_LABEL[card.marca] || card.marca}</span>
      </div>
      <div className="pay-card__number">•••• {card.ultimos_digitos}</div>
      <div>
        <small className="d-block opacity-75">Saldo disponible</small>
        <span className="pay-card__balance">{formatCurrency(card.saldo)}</span>
        {warning && <small className="d-block fw-semibold text-warning">{warning}</small>}
      </div>
    </>
  )

  if (!onSelect) {
    return <div className={`pay-card ${variant}`}>{content}</div>
  }

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`Tarjeta de ${CARD_TYPE_LABEL[card.tipo]} terminada en ${card.ultimos_digitos}, saldo ${formatCurrency(card.saldo)}`}
      className={`pay-card ${variant} ${selected ? 'pay-card--selected' : 'pay-card--unselected'}`}
      onClick={() => onSelect(card)}
      disabled={disabled}
    >
      {content}
    </button>
  )
}
