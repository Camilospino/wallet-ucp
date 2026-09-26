import React, { useState } from 'react'
import { formatCurrency } from '../utils/format'
import { useNavigate } from 'react-router-dom'
import { walletAPI } from '../services/walletService'

export default function Withdraw() {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const numericAmount = parseFloat(amount)
      if (isNaN(numericAmount) || numericAmount <= 0) {
        setError('El monto debe ser un número positivo')
        setLoading(false)
        return
      }

      const response = await walletAPI.withdraw(numericAmount)
      setSuccess('Retiro realizado exitosamente')
      setAmount('')
      
      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al realizar retiro')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="row justify-content-center">
      <div className="col-md-6 col-lg-4">
        <div className="card">
          <div className="card-body">
            <h2 className="card-title text-center mb-4">Retirar</h2>
            
            {error && (
              <div className="alert alert-danger">
                {error}
              </div>
            )}

            {success && (
              <div className="alert alert-success">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="amount" className="form-label">
                  Monto a retirar
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
                />
                {amount && (
                  <small className="text-muted">
                    {formatCurrency(amount)}
                  </small>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={loading}
              >
                {loading ? 'Procesando...' : 'Retirar'}
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
