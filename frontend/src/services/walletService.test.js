import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the axios instance so we can assert on the exact requests made.
const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPatch = vi.fn()

vi.mock('./api', () => ({
  default: {
    get: (...args) => mockGet(...args),
    post: (...args) => mockPost(...args),
    patch: (...args) => mockPatch(...args)
  }
}))

const { walletAPI, adminAPI, cardAPI } = await import('./walletService')

describe('walletAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requests the wallet with GET /api/wallet', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: { wallet: {} } } })

    const result = await walletAPI.getWallet()

    expect(mockGet).toHaveBeenCalledWith('/api/wallet')
    expect(result.success).toBe(true)
  })

  it('posts the deposit amount to /api/wallets/deposit', async () => {
    mockPost.mockResolvedValue({ data: { success: true } })

    await walletAPI.deposit(1000)

    expect(mockPost).toHaveBeenCalledWith('/api/wallets/deposit', { amount: 1000 })
  })

  it('posts the withdrawal amount to /api/wallets/withdraw', async () => {
    mockPost.mockResolvedValue({ data: { success: true } })

    await walletAPI.withdraw(500)

    expect(mockPost).toHaveBeenCalledWith('/api/wallets/withdraw', { amount: 500 })
  })

  it('sends recipientEmail and amount on transfer', async () => {
    mockPost.mockResolvedValue({ data: { success: true } })

    await walletAPI.transfer('user2@example.com', 2500)

    expect(mockPost).toHaveBeenCalledWith('/api/transfers', {
      recipientEmail: 'user2@example.com',
      amount: 2500
    })
  })

  it('forwards pagination params when listing transactions', async () => {
    mockGet.mockResolvedValue({ data: { data: { transactions: [] } } })

    await walletAPI.getTransactions({ page: 2, limit: 20 })

    expect(mockGet).toHaveBeenCalledWith('/api/transactions', {
      params: { page: 2, limit: 20 }
    })
  })

  it('sends the tipo and estado filters', async () => {
    mockGet.mockResolvedValue({ data: { data: { transactions: [] } } })

    await walletAPI.getTransactions({ tipo: 'DEPOSIT', estado: 'COMPLETED' })

    expect(mockGet).toHaveBeenCalledWith('/api/transactions', {
      params: { tipo: 'DEPOSIT', estado: 'COMPLETED' }
    })
  })

  it('sends the date range filters', async () => {
    mockGet.mockResolvedValue({ data: { data: { transactions: [] } } })

    await walletAPI.getTransactions({ fechaInicio: '2026-01-01', fechaFin: '2026-12-31' })

    expect(mockGet).toHaveBeenCalledWith('/api/transactions', {
      params: { fechaInicio: '2026-01-01', fechaFin: '2026-12-31' }
    })
  })

  it('drops empty filters so the query string stays clean', async () => {
    mockGet.mockResolvedValue({ data: { data: { transactions: [] } } })

    await walletAPI.getTransactions({ page: 1, limit: 10, tipo: '', estado: '', fechaInicio: '' })

    expect(mockGet).toHaveBeenCalledWith('/api/transactions', {
      params: { page: 1, limit: 10 }
    })
  })

  it('propagates API errors instead of swallowing them', async () => {
    mockPost.mockRejectedValue({ response: { data: { message: 'Saldo insuficiente' } } })

    await expect(walletAPI.withdraw(999999)).rejects.toBeDefined()
  })
})

describe('adminAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks a user via PATCH', async () => {
    mockPatch.mockResolvedValue({ data: { success: true } })

    await adminAPI.blockUser(7)

    expect(mockPatch).toHaveBeenCalledWith('/api/admin/users/7/block')
  })

  it('unblocks a user via PATCH', async () => {
    mockPatch.mockResolvedValue({ data: { success: true } })

    await adminAPI.unblockUser(7)

    expect(mockPatch).toHaveBeenCalledWith('/api/admin/users/7/unblock')
  })
})
describe('cardId en las operaciones', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPost.mockResolvedValue({ data: { success: true } })
  })

  it('envía el cardId elegido en depósito, retiro y transferencia', async () => {
    await walletAPI.deposit(1000, 7)
    await walletAPI.withdraw(500, 7)
    await walletAPI.transfer('user2@example.com', 2500, 7)

    expect(mockPost).toHaveBeenCalledWith('/api/wallets/deposit', { amount: 1000, cardId: 7 })
    expect(mockPost).toHaveBeenCalledWith('/api/wallets/withdraw', { amount: 500, cardId: 7 })
    expect(mockPost).toHaveBeenCalledWith('/api/transfers', {
      recipientEmail: 'user2@example.com', amount: 2500, cardId: 7
    })
  })

  it('envía la tarjeta del destinatario elegida en la transferencia', async () => {
    await walletAPI.transfer('user2@example.com', 2500, 7, 'CREDIT')

    expect(mockPost).toHaveBeenCalledWith('/api/transfers', {
      recipientEmail: 'user2@example.com', amount: 2500, cardId: 7, recipientCardType: 'CREDIT'
    })
  })
})

describe('cardAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lista las tarjetas con GET /api/cards', async () => {
    mockGet.mockResolvedValue({ data: { data: { cards: [] } } })

    await cardAPI.getCards()

    expect(mockGet).toHaveBeenCalledWith('/api/cards')
  })
})
