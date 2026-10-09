import L from 'leaflet'
import { activityOf } from './activities'
import { typeCount, type Spot } from './spots'

// One marker per Activity type: the emoji in a ring of the type's colour. A divIcon needs no
// image file, so the Leaflet image-path problem from SCRUM-16 cannot come back.
const cache = new Map<string, L.DivIcon>()

// peopleNow > 0: someone is there now (SCRUM-29). The ring turns red and a badge shows how many,
// as agreed in the prototype (SCRUM-17).
export function placeIcon(activityType: string, selected = false, peopleNow = 0): L.DivIcon {
  const key = `${activityType}:${selected}:${peopleNow}`
  let icon = cache.get(key)
  if (!icon) {
    const { emoji, color } = activityOf(activityType)
    const size = selected ? 46 : 34
    icon = L.divIcon({
      className: '',
      html: peopleNow > 0
        ? `<div class="place-pin live${selected ? ' selected' : ''}">${emoji}<span class="pin-badge">${peopleNow}</span></div>`
        : `<div class="place-pin${selected ? ' selected' : ''}" style="border-color:${color}">${emoji}</div>`,
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
  const live = spot.places.some((place) => place.people_now > 0)
  const key = `spot:${count}:${selected}:${live}`
  let icon = cache.get(key)
  if (!icon) {
    const size = selected ? 42 : 34
    icon = L.divIcon({
      className: '',
      html: `<div class="spot-pin${live ? ' live' : ''}${selected ? ' selected' : ''}">${count}</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
    cache.set(key, icon)
  }
  return icon
}
