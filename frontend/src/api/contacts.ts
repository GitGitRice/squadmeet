// Contacts and Block (SCRUM-32): the API of backend/app/contacts.py.

import { answer } from './http'

export type ContactUser = { id: number; nickname: string; avatar: string }

export type ContactRequest = { id: number; user: ContactUser; status: 'pending' | 'accepted' | 'declined' }

export type Contacts = {
  contacts: ContactUser[]
  // Requests to the user, waiting for "Annehmen" or "Ablehnen".
  incoming: ContactRequest[]
  // The user's own requests: pending, or declined (then they may ask again).
  outgoing: ContactRequest[]
  blocked: ContactUser[]
}

function send(token: string, method: string, path: string, body?: unknown) {
  return fetch(`/api${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
}

// 204 answers have no body, so `answer` (which reads JSON) is only used on errors.
async function noContent(response: Response, what: string): Promise<void> {
  if (!response.ok) await answer(response, what)
}

export async function fetchContacts(token: string): Promise<Contacts> {
  return answer(await send(token, 'GET', '/contacts'), 'GET contacts')
}

// By the exact Nickname; the server answers "Nickname nicht gefunden" or "Anfrage nicht möglich".
export async function askForContact(token: string, nickname: string): Promise<ContactRequest> {
  return answer(await send(token, 'POST', '/contacts/requests', { nickname }), 'POST contact request')
}

export async function acceptRequest(token: string, requestId: number): Promise<ContactRequest> {
  return answer(await send(token, 'POST', `/contacts/requests/${requestId}/accept`), 'POST accept')
}

export async function declineRequest(token: string, requestId: number): Promise<ContactRequest> {
  return answer(await send(token, 'POST', `/contacts/requests/${requestId}/decline`), 'POST decline')
}

export async function withdrawRequest(token: string, requestId: number): Promise<void> {
  await noContent(await send(token, 'DELETE', `/contacts/requests/${requestId}`), 'DELETE request')
}

export async function removeContact(token: string, userId: number): Promise<void> {
  await noContent(await send(token, 'DELETE', `/contacts/${userId}`), 'DELETE contact')
}

export async function blockUser(token: string, nickname: string): Promise<ContactUser> {
  return answer(await send(token, 'POST', '/blocks', { nickname }), 'POST block')
}

export async function unblockUser(token: string, userId: number): Promise<void> {
  await noContent(await send(token, 'DELETE', `/blocks/${userId}`), 'DELETE block')
}
