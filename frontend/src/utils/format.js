/**
 * Shared formatting helpers.
 *
 * These were duplicated across six page components; keeping them in one place
 * means a change to currency or date display only has to be made once.
 */

const CURRENCY = 'COP'
const LOCALE = 'es-CO'

/**
 * Formats a monetary amount.
 *
 * PostgreSQL returns NUMERIC as a string (e.g. "65000.00"), so the value is
 * coerced to a number first: passing the raw string to Intl would work by
 * luck, but comparing or summing it elsewhere would compare strings instead.
 */
export const formatCurrency = (amount) => {
  const value = typeof amount === 'number' ? amount : parseFloat(amount)
  if (!Number.isFinite(value)) return ''

  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

/** Formats an ISO date as a readable date and time. */
export const formatDateTime = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString(LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/** Formats an ISO date as day and month, without the time. */
export const formatDate = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleDateString(LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export const CARD_TYPE_LABEL = {
  CREDIT: 'Crédito',
  DEBIT: 'Débito'
}

export const CARD_BRAND_LABEL = {
  VISA: 'Visa',
  MASTERCARD: 'Mastercard'
}

/**
 * Short, recognisable description of a card, e.g. "Visa Crédito •••• 4242".
 * Accepts both a card object ({ tipo, marca, ultimos_digitos }) and the
 * prefixed columns of a transaction row ({ tarjeta_tipo, ... }).
 */
export const formatCard = (card) => {
  if (!card) return ''
  // A transaction row has its OWN `tipo` (DEPOSIT, TRANSFER...), so the
  // prefixed columns must win whenever the value is a transaction row.
  const isTransactionRow = 'tarjeta_ultimos_digitos' in card
  const tipo = isTransactionRow ? card.tarjeta_tipo : card.tipo
  const marca = isTransactionRow ? card.tarjeta_marca : card.marca
  const digits = isTransactionRow ? card.tarjeta_ultimos_digitos : card.ultimos_digitos
  if (!digits) return ''

  const brand = CARD_BRAND_LABEL[marca] || marca || ''
  const type = CARD_TYPE_LABEL[tipo] || tipo || ''
  return `${brand} ${type} •••• ${digits}`.replace(/\s+/g, ' ').trim()
}
