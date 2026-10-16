self.addEventListener('push', (event) => {
  let message = { title: 'SquadMeet', body: 'Du hast eine neue Benachrichtigung.', url: '/', tag: 'squadmeet' }
  try {
    message = { ...message, ...event.data.json() }
  } catch {
    // Keep the safe fallback when a provider delivers an empty or malformed payload.
  }
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: message.tag,
      data: { url: message.url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windows) => {
      for (const client of windows) {
        if ('navigate' in client) await client.navigate(target)
        return client.focus()
      }
      return self.clients.openWindow(target)
    }),
  )
})
