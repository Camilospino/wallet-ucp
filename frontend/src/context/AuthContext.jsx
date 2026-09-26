import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // On reload, ask the backend who the token belongs to. Previously this just
  // did setUser({ token }), which lost `rol` and broke the admin-only routes.
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    api.defaults.headers.common['Authorization'] = `Bearer ${token}`

    const restoreSession = async () => {
      try {
        const response = await api.get('/api/auth/me')
        setUser({ ...response.data.data.user, token })
      } catch (error) {
        // Expired or invalid token: drop it and fall back to the login screen.
        localStorage.removeItem('token')
        delete api.defaults.headers.common['Authorization']
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    restoreSession()
  }, [])

  const login = async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', { email, password })
      const { token, user: userData } = response.data.data

      localStorage.setItem('token', token)
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      setUser({ ...userData, token })

      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error al iniciar sesión'
      }
    }
  }

  const register = async (nombre, apellido, email, password, telefono) => {
    try {
      const response = await api.post('/api/auth/register', {
        nombre,
        apellido,
        email,
        password,
        telefono
      })
      
      return { success: true, data: response.data.data }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error al registrar usuario'
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }

  const value = {
    user,
    login,
    register,
    logout,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
