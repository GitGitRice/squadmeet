import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchMe, login, MfaRequiredError, mfaDisable, mfaEnable, register } from './auth'

const user = { id: 1, nickname: 'Pingpong_Paula', avatar: 'fox', mfa_enabled: false, is_admin: false }

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

  it('throws MfaRequiredError when MFA is on and no code was sent', async () => {
    const answer = Response.json({ detail: 'mfa_required' }, { status: 401 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(answer))

    await expect(login('Pingpong_Paula', 'geheim123')).rejects.toBeInstanceOf(MfaRequiredError)
  })

  it('sends the code only when there is one', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => Response.json({ token: 't', user }))
    vi.stubGlobal('fetch', fetchMock)

    await login('Pingpong_Paula', 'geheim123')
    await login('Pingpong_Paula', 'geheim123', '123456')

    const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body as string))
    expect(bodies[0]).not.toHaveProperty('code')
    expect(bodies[1].code).toBe('123456')
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

describe('mfaEnable', () => {
  it('sends the code with the token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ...user, mfa_enabled: true }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(mfaEnable('t', '123456')).resolves.toHaveProperty('mfa_enabled', true)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/auth/mfa/enable')
    expect(init.headers.Authorization).toBe('Bearer t')
    expect(JSON.parse(init.body)).toEqual({ code: '123456' })
  })
})

describe('mfaDisable', () => {
  it('sends the password again with the code', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(user))
    vi.stubGlobal('fetch', fetchMock)

    await expect(mfaDisable('t', 'geheim123', '123456')).resolves.toEqual(user)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/auth/mfa/disable')
    expect(JSON.parse(init.body)).toEqual({ password: 'geheim123', code: '123456' })
  })
})
