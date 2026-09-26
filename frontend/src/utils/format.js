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
