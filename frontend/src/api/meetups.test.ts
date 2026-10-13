import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMeetup, endMeetup, fetchMeetups, joinMeetup, leaveMeetup, moveMeetupStart, type Meetup } from './meetups'

const meetup: Meetup = {
  id: 7,
  place_id: 3,
  host: { id: 1, nickname: 'Paula', avatar: 'fox' },
  party_size: 2,
  people: 2,
  participants: [],
  starts_at: '2026-10-12T09:00:00Z',
  ends_at: '2026-10-12T11:00:00Z',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('meetups API', () => {
  it('lists the Meetups of a Place', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json([meetup]))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchMeetups(3)).resolves.toEqual([meetup])
    expect(fetchMock).toHaveBeenCalledWith('/api/places/3/meetups')
  })

  it('creates a Now-meetup with the login token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(meetup, { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    await createMeetup('tok', { place_id: 3, hours: 2, party_size: 2 })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/meetups')
    expect(init.headers.Authorization).toBe('Bearer tok')
    expect(JSON.parse(init.body)).toEqual({ place_id: 3, hours: 2, party_size: 2 })
  })

  it('creates a later Meetup with its start time', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(meetup, { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    const input = { place_id: 3, hours: 2, party_size: 1, starts_at: '2026-10-17T16:00:00.000Z' }

    await createMeetup('tok', input)

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(input)
  })

  it('moves the start of a Meetup', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(meetup))
    vi.stubGlobal('fetch', fetchMock)

    await moveMeetupStart('tok', 7, '2026-10-18T16:00:00.000Z')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/meetups/7')
    expect(init.method).toBe('PATCH')
    expect(init.headers.Authorization).toBe('Bearer tok')
    expect(JSON.parse(init.body)).toEqual({ starts_at: '2026-10-18T16:00:00.000Z' })
  })

  it('sends the login token when there is one, so the answer names who comes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json([meetup]))
    vi.stubGlobal('fetch', fetchMock)

    await fetchMeetups(3, 'tok')

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer tok')
  })

  it('joins with a Party size and leaves', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(meetup, { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await joinMeetup('tok', 7, 3)
    await leaveMeetup('tok', 7)

    const [joinUrl, joinInit] = fetchMock.mock.calls[0]
    expect([joinUrl, joinInit.method, JSON.parse(joinInit.body)]).toEqual(['/api/meetups/7/join', 'POST', { party_size: 3 }])
    const [leaveUrl, leaveInit] = fetchMock.mock.calls[1]
    expect([leaveUrl, leaveInit.method]).toEqual(['/api/meetups/7/join', 'DELETE'])
  })

  it("shows the server's message when a Join is refused", async () => {
    const answer = Response.json({ detail: 'Du bist schon dabei' }, { status: 409 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(answer))

    await expect(joinMeetup('tok', 7, 1)).rejects.toThrow('Du bist schon dabei')
  })

  it("shows the server's message when the Host may not end it", async () => {
    const answer = Response.json({ detail: 'Nur der Gastgeber kann das Treffen beenden' }, { status: 403 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(answer))

    await expect(endMeetup('tok', 7)).rejects.toThrow('Nur der Gastgeber')
  })
})
