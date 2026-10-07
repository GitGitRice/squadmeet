import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchMe, login, register } from './auth'

const user = { id: 1, nickname: 'Pingpong_Paula', avatar: 'fox' }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('login', () => {
  it('returns token and user', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ token: 't', user })))

    await expect(login('Pingpong_Paula', 'geheim123')).resolves.toEqual({ token: 't', user })
  })

  it('throws the German message from the API', async () => {
    const answer = Response.json({ detail: 'Nickname oder Passwort falsch' }, { status: 401 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(answer))

    await expect(login('Pingpong_Paula', 'falsch')).rejects.toThrow('Nickname oder Passwort falsch')
  })
})

describe('register', () => {
  it('asks the user to check the input when the API rejects it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ detail: [] }, { status: 422 })))

    const input = { nickname: 'x', password: 'y', avatar: 'fox', is_adult: true }
    await expect(register(input)).rejects.toThrow('Bitte prüfe deine Eingaben.')
  })
})

describe('fetchMe', () => {
  it('sends the token as Bearer header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(user))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchMe('t')).resolves.toEqual(user)
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', {
      headers: { Authorization: 'Bearer t' },
    })
  })

  it('returns null when the token is no longer valid', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))

    await expect(fetchMe('alt')).resolves.toBeNull()
  })
})
