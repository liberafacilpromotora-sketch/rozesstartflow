'use client'

export function setAuth(token: string, user: any) {
  localStorage.setItem('sf_token', token)
  localStorage.setItem('sf_user', JSON.stringify(user))
}

export function getUser(): any | null {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem('sf_user') || 'null')
  } catch {
    return null
  }
}

export function clearAuth() {
  localStorage.removeItem('sf_token')
  localStorage.removeItem('sf_user')
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('sf_token')
}
