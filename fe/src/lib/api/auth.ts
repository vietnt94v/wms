import { apiClient, tokenStorage } from './client'

export interface AuthUser {
  id: string
  username: string
  fullName: string
  roles: string[]
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export async function login(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', {
    username,
    password,
  })
  tokenStorage.setTokens(data.accessToken, data.refreshToken)
  return data
}

export async function logout(): Promise<void> {
  const refreshToken = tokenStorage.getRefresh()
  try {
    if (refreshToken) {
      await apiClient.post('/auth/logout', { refreshToken })
    }
  } finally {
    tokenStorage.clear()
  }
}

export async function me(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>('/auth/me')
  return data
}
