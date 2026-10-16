import { answer } from './http'

export type PushConfig = { enabled: boolean; public_key: string | null }

export async function fetchPushConfig(token: string): Promise<PushConfig> {
  return answer(
    await fetch('/api/push/config', { headers: { Authorization: `Bearer ${token}` } }),
    'GET push config',
  )
}

export async function savePushSubscription(token: string, subscription: PushSubscription): Promise<void> {
  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error('Der Browser hat kein vollständiges Push-Abo geliefert.')
  }
  const response = await fetch('/api/push/subscription', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  })
  if (!response.ok) await answer(response, 'PUT push subscription')
}

export async function removePushSubscription(token: string, endpoint: string): Promise<void> {
  const response = await fetch('/api/push/subscription', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  })
  if (!response.ok) await answer(response, 'DELETE push subscription')
}
