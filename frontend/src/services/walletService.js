import api from './api'

export const walletAPI = {
  getWallet: async () => {
    const response = await api.get('/api/wallet')
    return response.data
  },

  deposit: async (amount) => {
    const response = await api.post('/api/wallets/deposit', { amount })
    return response.data
  },

  withdraw: async (amount) => {
    const response = await api.post('/api/wallets/withdraw', { amount })
    return response.data
  },

  transfer: async (recipientEmail, amount) => {
    const response = await api.post('/api/transfers', { recipientEmail, amount })
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
