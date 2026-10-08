import { useEffect, useRef, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { fetchPlaces, type MapArea, type Place } from './api/places'
import { activityOf } from './places/activities'
import { groupBySpot, typeCount, type Spot } from './places/spots'
import {
  clearToken,
  fetchMe,
  loadToken,
  logout,
  saveToken,
  type LoginResult,
  type User,
} from './api/auth'
import AuthDialog from './auth/AuthDialog'
import { AVATARS } from './auth/avatars'

// Leaflet's default icon puts its own image path in front of the URLs that Vite gives,
// so the images do not load. An explicit icon uses the Vite URLs as they are.
const placeIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

// More than one Activity type on one spot: one marker with the number of types.
function spotIcon(spot: Spot) {
  return L.divIcon({
    className: '',
    html: `<div class="spot-pin">${typeCount(spot)}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

const LEIPZIG: [number, number] = [51.3397, 12.3731]
// Zoomed out further, an area could hold more Places than the API sends (MAX_PLACES).
const MIN_ZOOM = 11

// Calls onMove with the visible map area at the start and after each pan or zoom.
function MapAreaWatcher({ onMove }: { onMove: (area: MapArea) => void }) {
  const map = useMap()
  const report = () => {
    const bounds = map.getBounds()
    onMove({ west: bounds.getWest(), south: bounds.getSouth(), east: bounds.getEast(), north: bounds.getNorth() })
  }
  useMapEvents({ moveend: report })
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- only once, for the first area
  useEffect(report, [])
  return null
}

export default function App() {
  const [places, setPlaces] = useState<Place[]>([])
  const [truncated, setTruncated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The request for the last map area; a newer pan or zoom cancels it, so an old answer
  // cannot replace a newer one.
  const placesRequest = useRef<AbortController | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [showAuth, setShowAuth] = useState(false)

  function loadPlaces(area: MapArea) {
    placesRequest.current?.abort()
    const request = new AbortController()
    placesRequest.current = request
    fetchPlaces(area, request.signal)
      .then((answer) => {
        setPlaces(answer.places)
        setTruncated(answer.truncated)
        setError(null)
      })
      .catch((err: Error) => {
        if (!request.signal.aborted) setError(err.message)
      })
  }

  // Restore the login from an earlier visit; drop the token when the server no longer knows it.
  useEffect(() => {
    const token = loadToken()
    if (!token) return
    fetchMe(token)
      .then((me) => {
        if (me) setUser(me)
        else clearToken()
      })
      .catch(() => {})
  }, [])

  function handleLoggedIn(result: LoginResult) {
    saveToken(result.token)
    setUser(result.user)
    setShowAuth(false)
  }

  async function handleLogout() {
    const token = loadToken()
    clearToken()
    setUser(null)
    if (token) await logout(token).catch(() => {})
  }

  return (
    <>
      {error && <div className="error">Plätze konnten nicht geladen werden: {error}</div>}
      {truncated && !error && <div className="error">Zu viele Plätze. Bitte näher heranzoomen.</div>}
      <div className="account">
        {user ? (
          <>
            <span>
              {AVATARS[user.avatar]?.emoji} {user.nickname}
            </span>
            <button type="button" onClick={handleLogout}>
              Abmelden
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setShowAuth(true)}>
            Anmelden
          </button>
        )}
      </div>
      {showAuth && <AuthDialog onLoggedIn={handleLoggedIn} onClose={() => setShowAuth(false)} />}
      <MapContainer center={LEIPZIG} zoom={13} minZoom={MIN_ZOOM} style={{ height: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapAreaWatcher onMove={loadPlaces} />
        {groupBySpot(places).map((spot) =>
          spot.places.length === 1 ? (
            <Marker key={spot.places[0].id} position={[spot.lat, spot.lon]} icon={placeIcon}>
              <Popup>{spot.places[0].name}</Popup>
            </Marker>
          ) : (
            <Marker key={`spot-${spot.places[0].id}`} position={[spot.lat, spot.lon]} icon={spotIcon(spot)}>
              <Popup>
                <ul className="spot-choice">
                  {spot.places.map((place) => (
                    <li key={place.id}>
                      {activityOf(place.activity_type).emoji} {activityOf(place.activity_type).label}: {place.name}
                    </li>
                  ))}
                </ul>
              </Popup>
            </Marker>
          ),
        )}
      </MapContainer>
    </>
  )
}
