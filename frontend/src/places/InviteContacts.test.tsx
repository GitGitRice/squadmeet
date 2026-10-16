import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { saveToken } from '../api/auth'
import InviteContacts from './InviteContacts'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const contacts = {
  contacts: [
    { id: 2, nickname: 'Korb_Karl', avatar: 'fox' },
    { id: 3, nickname: 'Mia_Matte', avatar: 'owl' },
  ],
  incoming: [],
  outgoing: [],
  blocked: [],
}

afterEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
  vi.unstubAllGlobals()
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

async function render() {
  saveToken('t')
  const container = document.createElement('div')
  document.body.append(container)
  await act(async () => createRoot(container).render(<InviteContacts meetup={{ id: 12, actions: ['leave', 'invite'] }} />))
  await act(async () => button(container, 'Kontakte einladen')?.click())
  return container
}

function button(container: HTMLElement, text: string) {
  return [...container.querySelectorAll('button')].find((b) => b.textContent === text)
}

describe('InviteContacts', () => {
  it('shows nothing without the action "invite"', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    await act(async () => createRoot(container).render(<InviteContacts meetup={{ id: 12, actions: ['join'] }} />))

    expect(container.textContent).toBe('')
  })

  it('lists the Contacts; "Einladen" waits for a choice', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(contacts)))

    const container = await render()

    expect(container.textContent).toContain('Korb_Karl')
    expect(container.textContent).toContain('Mia_Matte')
    expect(button(container, 'Einladen')?.disabled).toBe(true)
  })

  it('invites the chosen Contacts', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json(contacts)).mockResolvedValueOnce(json({ invited: 2 }))
    vi.stubGlobal('fetch', fetchMock)
    const container = await render()

    const boxes = container.querySelectorAll<HTMLInputElement>('input[type=checkbox]')
    act(() => boxes[0].click())
    act(() => boxes[1].click())
    await act(async () => button(container, 'Einladen')?.click())

    const [url, init] = fetchMock.mock.calls[1]
    expect(url).toBe('/api/meetups/12/invite')
    expect(JSON.parse(init.body)).toEqual({ user_ids: [2, 3] })
    expect(container.textContent).toContain('2 Kontakte eingeladen.')
  })

  it('says so when everyone is already in or invited', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json(contacts)).mockResolvedValueOnce(json({ invited: 0 })))
    const container = await render()

    act(() => container.querySelector<HTMLInputElement>('input[type=checkbox]')!.click())
    await act(async () => button(container, 'Einladen')?.click())

    expect(container.textContent).toContain('schon dabei oder eingeladen')
  })

  it('says when there are no Contacts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ ...contacts, contacts: [] })))

    const container = await render()

    expect(container.textContent).toContain('Du hast noch keine Kontakte.')
    expect(button(container, 'Einladen')).toBeUndefined()
  })
})
