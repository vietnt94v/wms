import { create } from 'zustand'
import {
  login as apiLogin,
  logout as apiLogout,
  me as apiMe,
  type AuthUser,
} from '@/lib/api/auth'
import { tokenStorage } from '@/lib/api/client'

interface AuthState {
  user: AuthUser | null
  loading: boolean
  initialized: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  bootstrap: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  login: async (username, password) => {
    set({ loading: true })
    try {
      const data = await apiLogin(username, password)
      set({ user: data.user, loading: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  logout: async () => {
    await apiLogout()
    set({ user: null })
  },

  bootstrap: async () => {
    if (!tokenStorage.getAccess()) {
      set({ user: null, initialized: true })
      return
    }
    try {
      const user = await apiMe()
      set({ user, initialized: true })
    } catch {
      tokenStorage.clear()
      set({ user: null, initialized: true })
    }
  },
}))
