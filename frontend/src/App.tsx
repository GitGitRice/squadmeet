import { useEffect, useRef, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchPlace, fetchPlaces, type MapArea, type Place } from './api/places'
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
import ActivityFilter from './places/ActivityFilter'
import { ACTIVITY_TYPES, activityOf, type ActivityType } from './places/activities'
import { filterPlaces } from './places/filter'
import { placeIcon, spotIcon } from './places/markers'
import PlaceDetail from './places/PlaceDetail'
import { placeIdFromPath, placePath, usePath } from './places/route'
import { groupBySpot } from './places/spots'

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

// Moves the map to a Place that was opened by its URL (a shared link or a reload).
function CenterOn({ place }: { place: Place }) {
  const map = useMap()
  useEffect(() => {
    if (!map.getBounds().contains([place.lat, place.lon])) map.setView([place.lat, place.lon], 16)
  }, [map, place])
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
  const [chosen, setChosen] = useState<Set<ActivityType>>(() => new Set(ACTIVITY_TYPES))
  const [path, navigate] = usePath()
  const selectedId = placeIdFromPath(path)
  // The answer for the Place in the detail URL. It keeps its id, so an old answer never shows.
  const [detail, setDetail] = useState<{ id: number; place?: Place; error?: string } | null>(null)
  const current = detail && detail.id === selectedId ? detail : null
  const selected = current?.place ?? null

  // The API, not the loaded map Places: a shared link can point outside the visible area.
  useEffect(() => {
    if (selectedId === null) return
    let stillWanted = true
    fetchPlace(selectedId)
      .then((place) => stillWanted && setDetail({ id: selectedId, place }))
      .catch((err: Error) => stillWanted && setDetail({ id: selectedId, error: err.message }))
    return () => {
      stillWanted = false
    }
  }, [selectedId])

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
      <ActivityFilter chosen={chosen} onChange={setChosen} />
      {selectedId !== null && (
        <PlaceDetail place={selected} error={current?.error ?? null} onClose={() => navigate('/')} />
      )}
      <MapContainer center={LEIPZIG} zoom={13} minZoom={MIN_ZOOM} style={{ height: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapAreaWatcher onMove={loadPlaces} />
        {selected && <CenterOn place={selected} />}
        {groupBySpot(filterPlaces(places, chosen)).map((spot) => {
          const isSelected = spot.places.some((place) => place.id === selectedId)
          if (spot.places.length === 1) {
            const [place] = spot.places
            return (
              <Marker
                key={place.id}
                position={[spot.lat, spot.lon]}
                icon={placeIcon(place.activity_type, isSelected)}
                title={place.name}
                eventHandlers={{ click: () => navigate(placePath(place.id)) }}
              />
            )
          }
          // Several Activity types on one spot: the marker shows how many; a tap shows the choice.
          return (
            <Marker key={`spot-${spot.places[0].id}`} position={[spot.lat, spot.lon]} icon={spotIcon(spot, isSelected)}>
              <Popup>
                <ul className="spot-choice">
                  {spot.places.map((place) => {
                    const activity = activityOf(place.activity_type)
                    return (
                      <li key={place.id}>
                        <a
                          href={placePath(place.id)}
                          onClick={(event) => {
                            event.preventDefault()
                            navigate(placePath(place.id))
                          }}
                        >
                          {activity.emoji} {activity.label}
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </>
  )
}
