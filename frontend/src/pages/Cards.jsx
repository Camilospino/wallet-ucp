import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { cardAPI } from '../services/walletService'
import { PaymentCard } from '../components/PaymentCard'
import { formatCurrency } from '../utils/format'

/**
 * The user's two cards (credit and debit) with their balances. The wallet
 * balance is always the sum of both.
 */
export default function Cards() {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    cardAPI.getCards()
      .then((res) => setCards(res.data.cards))
      .catch((err) => setError(err.response?.data?.message || 'No se pudieron cargar tus tarjetas'))
      .finally(() => setLoading(false))
  }, [])

  const total = cards.reduce((sum, card) => sum + card.saldo, 0)

  return (
    <div className="row justify-content-center">
      <div className="col-lg-8">
        <h2 className="mb-1">Mis tarjetas</h2>
        <p className="text-muted mb-4">
          Elige una de ellas cada vez que deposites, retires o transfieras.
        </p>

        {error && <div className="alert alert-danger">{error}</div>}

        {loading ? (
          <div className="text-muted">
            <span className="spinner-border spinner-border-sm me-1" role="status" />
            Cargando...
          </div>
        ) : (
          <>
            <div className="row g-4 mb-4">
              {cards.map((card) => (
                <div className="col-md-6" key={card.id}>
                  <PaymentCard card={card} />
                </div>
              ))}
            </div>

            <div className="card">
              <div className="card-body d-flex justify-content-between align-items-center">
                <span className="text-muted">Saldo total de la billetera</span>
                <strong className="fs-5">{formatCurrency(total)}</strong>
              </div>
            </div>

            <div className="d-flex gap-2 mt-4">
              <Link to="/deposit" className="btn btn-primary">Depositar</Link>
              <Link to="/withdraw" className="btn btn-outline-primary">Retirar</Link>
              <Link to="/transfer" className="btn btn-outline-primary">Transferir</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
