type RouteNavigator = {
  userAgent?: string
  platform?: string
  maxTouchPoints?: number
}

function isIOS(device: RouteNavigator): boolean {
  // iPadOS can identify itself as macOS when "Request Desktop Website" is enabled.
  return (
    /iPad|iPhone|iPod/.test(device.userAgent ?? '') ||
    (device.platform === 'MacIntel' && (device.maxTouchPoints ?? 0) > 1)
  )
}

/** A plain link: no location or map-service request happens before the user taps it. */
export function routeUrl(
  lat: number,
  lon: number,
  device: RouteNavigator = navigator,
): string {
  const destination = `${lat},${lon}`
  if (isIOS(device)) {
    return `https://maps.apple.com/?daddr=${destination}&dirflg=d`
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`
}
