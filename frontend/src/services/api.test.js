import { describe, it, expect, vi, beforeEach } from 'vitest'

// The tests run in Node, so the browser globals the interceptor touches are
// replaced with minimal fakes.
const storage = new Map()
vi.stubGlobal('localStorage', {
  getItem: (key) => (storage.has(key) ? storage.get(key) : null),
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key)
})
const assign = vi.fn()
vi.stubGlobal('window', { location: { pathname: '/transfer', assign } })

const { default: api } = await import('./api')

// The error handler registered with api.interceptors.response.use().
const onError = api.interceptors.response.handlers[0].rejected

const httpError = (status, error, url = '/api/transfers') => ({
  config: { url },
  response: { status, data: { success: false, error } }
})

describe('api response interceptor', () => {
  beforeEach(() => {
    storage.clear()
    storage.set('token', 'abc')
    assign.mockClear()
  })

  it('cierra la sesión con 401', async () => {
    await expect(onError(httpError(401, 'AUTHENTICATION_ERROR'))).rejects.toBeTruthy()

    expect(storage.has('token')).toBe(false)
    expect(assign).toHaveBeenCalledWith('/login')
  })

  it('cierra la sesión cuando la cuenta fue bloqueada', async () => {
    await expect(onError(httpError(403, 'USER_BLOCKED'))).rejects.toBeTruthy()

    expect(storage.has('token')).toBe(false)
    expect(assign).toHaveBeenCalledWith('/login')
  })

  it.each(['TRANSFER_TO_BLOCKED', 'WALLET_BLOCKED', 'AUTHORIZATION_ERROR'])(
    'NO cierra la sesión con un 403 de negocio (%s)',
    async (code) => {
      const error = httpError(403, code)

      // The error still reaches the page so it can show the message.
      await expect(onError(error)).rejects.toBe(error)

      expect(storage.get('token')).toBe('abc')
      expect(assign).not.toHaveBeenCalled()
    }
  )
})
