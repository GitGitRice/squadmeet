import L from 'leaflet'
import { activityOf } from './activities'
import { typeCount, type Spot } from './spots'

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

// Several Activity types on one spot: one marker with the number of types (SCRUM-21 review).
export function spotIcon(spot: Spot, selected = false): L.DivIcon {
  const count = typeCount(spot)
  const key = `spot:${count}:${selected}`
  let icon = cache.get(key)
  if (!icon) {
    const size = selected ? 42 : 34
    icon = L.divIcon({
      className: '',
      html: `<div class="spot-pin${selected ? ' selected' : ''}">${count}</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
    cache.set(key, icon)
  }
  return icon
}
