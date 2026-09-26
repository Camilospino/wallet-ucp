import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Every backend route is mounted under /api. A request that forgets the prefix
// returns a confusing "Ruta no encontrada" 404, so fail loudly in development
// instead of letting it reach the network.
api.interceptors.request.use((config) => {
  const url = config.url || ''

  // Ignore absolute URLs and non-API paths such as /health or /api-docs.
  if (import.meta.env.DEV && url.startsWith('/') && !url.startsWith('/api/')) {
    console.error(
      `[api] La ruta "${url}" no empieza con /api y devolverá 404. ` +
      'Usa /api/... en todas las llamadas.'
    )
  }

  return config
})

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status

    // 403 on /auth/me means the account is blocked, 401 means the token is
    // invalid/expired. In both cases the stored session is no longer usable.
    if (status === 401 || status === 403) {
      const hadToken = Boolean(localStorage.getItem('token'))
      const isAuthRequest = error.config?.url?.includes('/auth/login')

      localStorage.removeItem('token')
      delete api.defaults.headers.common['Authorization']

      // Don't force a full page reload on the login screen: it would wipe the
      // error message the user is trying to read, and React Router already
      // redirects to /login whenever there is no user.
      if (hadToken && !isAuthRequest && window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }

    return Promise.reject(error)
  }
)

export default api
