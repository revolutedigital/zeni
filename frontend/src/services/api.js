const API_URL = import.meta.env.VITE_API_URL || '/api'

function getHeaders() {
  const token = localStorage.getItem('zeni_token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }
}

async function handleResponse(res) {
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `Erro ${res.status}`)
  }
  return res.json()
}

// Auth
export async function login(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  return handleResponse(res)
}

export async function register(name, email, password) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  })
  return handleResponse(res)
}

// Transactions
export async function getTransactions(params = {}) {
  const query = new URLSearchParams(params).toString()
  const res = await fetch(`${API_URL}/transactions?${query}`, {
    headers: getHeaders()
  })
  return handleResponse(res)
}

export async function getSummary(month, year) {
  const res = await fetch(`${API_URL}/transactions/summary?month=${month}&year=${year}`, {
    headers: getHeaders()
  })
  return handleResponse(res)
}

export async function createTransaction(data) {
  const res = await fetch(`${API_URL}/transactions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  })
  return handleResponse(res)
}

export async function deleteTransaction(id) {
  const res = await fetch(`${API_URL}/transactions/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  })
  return handleResponse(res)
}

// Categories
export async function getCategories(type) {
  const query = type ? `?type=${type}` : ''
  const res = await fetch(`${API_URL}/categories${query}`, {
    headers: getHeaders()
  })
  return handleResponse(res)
}

// Budgets
export async function getBudgets(month, year) {
  const res = await fetch(`${API_URL}/budgets?month=${month}&year=${year}`, {
    headers: getHeaders()
  })
  return handleResponse(res)
}

// Chat
export async function sendMessage(message, image = null) {
  const formData = new FormData()
  formData.append('message', message)
  if (image) {
    formData.append('image', image)
  }

  const token = localStorage.getItem('zeni_token')
  const res = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  })
  return handleResponse(res)
}

export async function getChatHistory() {
  const res = await fetch(`${API_URL}/chat/history`, {
    headers: getHeaders()
  })
  return handleResponse(res)
}

// Onboarding
export async function getOnboardingStatus() {
  const res = await fetch(`${API_URL}/onboarding/status`, {
    headers: getHeaders()
  })
  return handleResponse(res)
}

export async function saveOnboardingStep(stepNumber, data) {
  const res = await fetch(`${API_URL}/onboarding/step/${stepNumber}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  })
  return handleResponse(res)
}

export async function getSuggestedBudgets() {
  const res = await fetch(`${API_URL}/onboarding/suggested-budgets`, {
    headers: getHeaders()
  })
  return handleResponse(res)
}

export async function completeOnboarding() {
  const res = await fetch(`${API_URL}/onboarding/complete`, {
    method: 'POST',
    headers: getHeaders()
  })
  return handleResponse(res)
}

// Goals
export async function getGoals(status = 'active') {
  const res = await fetch(`${API_URL}/goals?status=${status}`, {
    headers: getHeaders()
  })
  return handleResponse(res)
}

export async function getGoal(id) {
  const res = await fetch(`${API_URL}/goals/${id}`, {
    headers: getHeaders()
  })
  return handleResponse(res)
}

export async function createGoal(data) {
  const res = await fetch(`${API_URL}/goals`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  })
  return handleResponse(res)
}

export async function updateGoal(id, data) {
  const res = await fetch(`${API_URL}/goals/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  })
  return handleResponse(res)
}

export async function deleteGoal(id) {
  const res = await fetch(`${API_URL}/goals/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  })
  return handleResponse(res)
}

export async function contributeToGoal(id, data) {
  const res = await fetch(`${API_URL}/goals/${id}/contribute`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  })
  return handleResponse(res)
}

export async function analyzeGoal(id) {
  const res = await fetch(`${API_URL}/goals/${id}/analyze`, {
    method: 'POST',
    headers: getHeaders()
  })
  return handleResponse(res)
}

export async function getGoalsSummary() {
  const res = await fetch(`${API_URL}/goals/summary/overview`, {
    headers: getHeaders()
  })
  return handleResponse(res)
}

// Alerts/Notifications
export async function getAlerts() {
  try {
    const res = await fetch(`${API_URL}/alerts`, {
      headers: getHeaders()
    })
    if (!res.ok) {
      // Log para debug, mas retorna vazio para não quebrar UI
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[API] getAlerts failed:', res.status)
      }
      return { alerts: [], error: true }
    }
    return res.json()
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[API] getAlerts error:', err.message)
    }
    return { alerts: [], error: true }
  }
}

export async function markAlertAsRead(alertId) {
  const res = await fetch(`${API_URL}/alerts/${alertId}/read`, {
    method: 'PATCH',
    headers: getHeaders()
  })
  return handleResponse(res)
}

export async function getUserStats() {
  try {
    const res = await fetch(`${API_URL}/auth/stats`, {
      headers: getHeaders()
    })
    if (!res.ok) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[API] getUserStats failed:', res.status)
      }
      return { streak: 0, achievements: [], xp: 0, level: 1, error: true }
    }
    return res.json()
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[API] getUserStats error:', err.message)
    }
    return { streak: 0, achievements: [], xp: 0, level: 1, error: true }
  }
}
