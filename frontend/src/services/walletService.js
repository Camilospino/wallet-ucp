import api from './api'

// The card is optional in the API (it then uses the debit card): the field is
// only sent when one was chosen, so requests without a card stay as they were.
const withCard = (body, cardId) => (cardId ? { ...body, cardId } : body)

export const walletAPI = {
  getWallet: async () => {
    const response = await api.get('/api/wallet')
    return response.data
  },

  deposit: async (amount, cardId) => {
    const response = await api.post('/api/wallets/deposit', withCard({ amount }, cardId))
    return response.data
  },

  withdraw: async (amount, cardId) => {
    const response = await api.post('/api/wallets/withdraw', withCard({ amount }, cardId))
    return response.data
  },

  // `recipientCardType` (CREDIT | DEBIT) is the recipient's card the money
  // arrives on; the sender never needs the recipient's card ids.
  transfer: async (recipientEmail, amount, cardId, recipientCardType) => {
    const body = withCard({ recipientEmail, amount }, cardId)
    if (recipientCardType) body.recipientCardType = recipientCardType
    const response = await api.post('/api/transfers', body)
    return response.data
  },

  // Empty filter values are stripped so the query string stays clean and the
  // backend does not receive meaningless `tipo=` parameters.
  getTransactions: async (params = {}) => {
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== '' && value != null)
    )
    const response = await api.get('/api/transactions', { params: clean })
    return response.data
  },

  getTransactionById: async (id) => {
    const response = await api.get(`/api/transactions/${id}`)
    return response.data
  }
}

export const userAPI = {
  // Used by the transfer form to confirm the recipient before sending money.
  lookupRecipient: async (email) => {
    const response = await api.get('/api/users/lookup', { params: { email } })
    return response.data
  }
}

// Every user has exactly two cards (credit and debit), each with its balance.
export const cardAPI = {
  getCards: async () => {
    const response = await api.get('/api/cards')
    return response.data
  }
}

export const adminAPI = {
  getAllUsers: async (params = {}) => {
    const response = await api.get('/api/admin/users', { params })
    return response.data
  },

  getAllWallets: async (params = {}) => {
    const response = await api.get('/api/admin/wallets', { params })
    return response.data
  },

  getAllTransactions: async (params = {}) => {
    const response = await api.get('/api/admin/transactions', { params })
    return response.data
  },

  blockUser: async (userId) => {
    const response = await api.patch(`/api/admin/users/${userId}/block`)
    return response.data
  },

  unblockUser: async (userId) => {
    const response = await api.patch(`/api/admin/users/${userId}/unblock`)
    return response.data
  }
}
