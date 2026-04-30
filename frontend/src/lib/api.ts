const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('sf_token')
}

const PUBLIC_PATHS = ['/auth/login', '/auth/register']

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()

  if (!token && !PUBLIC_PATHS.includes(path)) {
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new Error('Não autenticado')
  }

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401) {
    localStorage.removeItem('sf_token')
    localStorage.removeItem('sf_user')
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  if (res.status === 403) {
    throw new Error('Você não tem permissão para realizar esta ação.')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message || `HTTP ${res.status}`)
  }

  return res.json()
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ access_token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<any>('/auth/me'),

  // Leads
  getLeads: (page = 1, limit = 50, search?: string) =>
    request<any>(`/leads?page=${page}&limit=${limit}${search ? `&search=${search}` : ''}`),

  getLeadColumns: () => request<string[]>('/leads/columns'),

  importLeads: async (file: File) => {
    const token = getToken()
    if (!token) {
      if (typeof window !== 'undefined') window.location.href = '/login'
      throw new Error('Não autenticado')
    }
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`${API}/leads/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    })
    if (res.status === 401) {
      localStorage.removeItem('sf_token')
      localStorage.removeItem('sf_user')
      if (typeof window !== 'undefined') window.location.href = '/login'
      throw new Error('Sessão expirada. Faça login novamente.')
    }
    if (res.status === 403) {
      throw new Error('Você não tem permissão para realizar esta ação.')
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(err.message || `HTTP ${res.status}`)
    }
    return res.json()
  },

  getLeadCount: () => request<number>('/leads/count'),

  // Numbers
  getNumbers: () => request<any[]>('/numbers'),
  createNumber: (data: any) => request<any>('/numbers', { method: 'POST', body: JSON.stringify(data) }),
  updateNumber: (id: string, data: any) => request<any>(`/numbers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  toggleNumber: (id: string) => request<any>(`/numbers/${id}/toggle`, { method: 'PATCH' }),
  deleteNumber: (id: string) => request<any>(`/numbers/${id}`, { method: 'DELETE' }),

  // Campaigns
  getCampaigns: () => request<any[]>('/campaigns'),
  getCampaign: (id: string) => request<any>(`/campaigns/${id}`),
  createCampaign: (data: any) => request<any>('/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  updateCampaign: (id: string, data: any) => request<any>(`/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCampaign: (id: string) => request<any>(`/campaigns/${id}`, { method: 'DELETE' }),
  startCampaign: (id: string) => request<any>(`/campaigns/${id}/start`, { method: 'POST' }),
  pauseCampaign: (id: string, reason?: string) =>
    request<any>(`/campaigns/${id}/pause`, { method: 'POST', body: JSON.stringify({ reason }) }),
  resumeCampaign: (id: string) => request<any>(`/campaigns/${id}/resume`, { method: 'POST' }),
  getCampaignDispatches: (id: string, page = 1, limit = 50) =>
    request<any>(`/campaigns/${id}/dispatches?page=${page}&limit=${limit}`),

  // Metrics
  getDashboard: (campaignId?: string) =>
    request<any>(`/metrics/dashboard${campaignId ? `?campaignId=${campaignId}` : ''}`),
}
