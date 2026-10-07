export type User = {
  id: number
  nickname: string
  avatar: string
}

export type LoginResult = {
  token: string
  user: User
}

export type RegisterResult = LoginResult & {
  // Shown once. The server keeps only the hashes.
  recovery_codes: string[]
}

export type RegisterInput = {
  nickname: string
  password: string
  avatar: string
  is_adult: boolean
}

const TOKEN_KEY = 'squadmeet.token'

export function loadToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// The API sends German messages for errors the user can fix (wrong password, Nickname taken).
async function errorMessage(response: Response): Promise<string> {
  const body = await response.json().catch(() => null)
  if (typeof body?.detail === 'string') {
    return body.detail
  }
  if (response.status === 422) {
    return 'Bitte prüfe deine Eingaben.'
  }
  return `Fehler ${response.status}`
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new Error(await errorMessage(response))
  }
  return response.json()
}

export function register(input: RegisterInput): Promise<RegisterResult> {
  return postJson('/api/auth/register', input)
}

export function login(nickname: string, password: string): Promise<LoginResult> {
  return postJson('/api/auth/login', { nickname, password })
}

export async function logout(token: string): Promise<void> {
  // A 401 means the session already ended on the server; the client clears its token anyway.
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

/** The logged-in user, or null when the token is no longer valid. */
export async function fetchMe(token: string): Promise<User | null> {
  const response = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (response.status === 401) {
    return null
  }
  if (!response.ok) {
    throw new Error(`GET /api/auth/me failed: ${response.status}`)
  }
  return response.json()
}
