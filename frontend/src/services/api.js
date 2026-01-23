const API_URL = import.meta.env.VITE_API_URL || '/api'

function getHeaders() {
  const token = localStorage.getItem('zeni_token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }
}

// Auth
export async function login(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  if (!res.ok) throw new Error('Credenciais inválidas')
  return res.json()
}

export async function register(name, email, password) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  })
  if (!res.ok) throw new Error('Erro no cadastro')
  return res.json()
}

// Transactions
export async function getTransactions(params = {}) {
  const query = new URLSearchParams(params).toString()
  const res = await fetch(`${API_URL}/transactions?${query}`, {
    headers: getHeaders()
  })
  return res.json()
}

export async function getSummary(month, year) {
  const res = await fetch(`${API_URL}/transactions/summary?month=${month}&year=${year}`, {
    headers: getHeaders()
  })
  return res.json()
}

export async function createTransaction(data) {
  const res = await fetch(`${API_URL}/transactions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  })
  return res.json()
}

export async function deleteTransaction(id) {
  const res = await fetch(`${API_URL}/transactions/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  })
  return res.json()
}

// Categories
export async function getCategories(type) {
  const query = type ? `?type=${type}` : ''
  const res = await fetch(`${API_URL}/categories${query}`, {
    headers: getHeaders()
  })
  return res.json()
}

// Budgets
export async function getBudgets(month, year) {
  const res = await fetch(`${API_URL}/budgets?month=${month}&year=${year}`, {
    headers: getHeaders()
  })
  return res.json()
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
  return res.json()
}

export async function getChatHistory() {
  const res = await fetch(`${API_URL}/chat/history`, {
    headers: getHeaders()
  })
  return res.json()
}

// Onboarding
export async function getOnboardingStatus() {
  const res = await fetch(`${API_URL}/onboarding/status`, {
    headers: getHeaders()
  })
  return res.json()
}

export async function saveOnboardingStep(stepNumber, data) {
  const res = await fetch(`${API_URL}/onboarding/step/${stepNumber}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  })
  return res.json()
}

export async function getSuggestedBudgets() {
  const res = await fetch(`${API_URL}/onboarding/suggested-budgets`, {
    headers: getHeaders()
  })
  return res.json()
}

export async function completeOnboarding() {
  const res = await fetch(`${API_URL}/onboarding/complete`, {
    method: 'POST',
    headers: getHeaders()
  })
  return res.json()
}

// Goals
export async function getGoals(status = 'active') {
  const res = await fetch(`${API_URL}/goals?status=${status}`, {
    headers: getHeaders()
  })
  return res.json()
}

export async function getGoal(id) {
  const res = await fetch(`${API_URL}/goals/${id}`, {
    headers: getHeaders()
  })
  return res.json()
}

export async function createGoal(data) {
  const res = await fetch(`${API_URL}/goals`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  })
  return res.json()
}

export async function updateGoal(id, data) {
  const res = await fetch(`${API_URL}/goals/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  })
  return res.json()
}

export async function deleteGoal(id) {
  const res = await fetch(`${API_URL}/goals/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  })
  return res.json()
}

export async function contributeToGoal(id, data) {
  const res = await fetch(`${API_URL}/goals/${id}/contribute`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  })
  return res.json()
}

export async function analyzeGoal(id) {
  const res = await fetch(`${API_URL}/goals/${id}/analyze`, {
    method: 'POST',
    headers: getHeaders()
  })
  return res.json()
}

export async function getGoalsSummary() {
  const res = await fetch(`${API_URL}/goals/summary/overview`, {
    headers: getHeaders()
  })
  return res.json()
}
