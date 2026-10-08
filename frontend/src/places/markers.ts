import L from 'leaflet'
import { activityOf } from './activities'

// One marker per Activity type: the emoji in a ring of the type's colour. A divIcon needs no
// image file, so the Leaflet image-path problem from SCRUM-16 cannot come back.
const cache = new Map<string, L.DivIcon>()

export function placeIcon(activityType: string, selected = false): L.DivIcon {
  const key = `${activityType}:${selected}`
  let icon = cache.get(key)
  if (!icon) {
    const { emoji, color } = activityOf(activityType)
    const size = selected ? 46 : 34
    icon = L.divIcon({
      className: '',
      html: `<div class="place-pin${selected ? ' selected' : ''}" style="border-color:${color}">${emoji}</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
    cache.set(key, icon)
  }
  return icon
}
