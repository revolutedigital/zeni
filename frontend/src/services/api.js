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
