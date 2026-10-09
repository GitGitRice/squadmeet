import { afterEach, describe, expect, it, vi } from 'vitest'
import { createNowMeetup, endMeetup, fetchMeetups, type Meetup } from './meetups'

const meetup: Meetup = {
  id: 7,
  place_id: 3,
  host: { id: 1, nickname: 'Paula', avatar: 'fox' },
  party_size: 2,
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

    await createNowMeetup('tok', { place_id: 3, hours: 2, party_size: 2 })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/meetups')
    expect(init.headers.Authorization).toBe('Bearer tok')
    expect(JSON.parse(init.body)).toEqual({ place_id: 3, hours: 2, party_size: 2 })
  })

  it("shows the server's message when the Host may not end it", async () => {
    const answer = Response.json({ detail: 'Nur der Gastgeber kann das Treffen beenden' }, { status: 403 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(answer))

    await expect(endMeetup('tok', 7)).rejects.toThrow('Nur der Gastgeber')
  })
})
