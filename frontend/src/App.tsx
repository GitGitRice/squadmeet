import { useEffect, useMemo, useRef, useState } from 'react'
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
import MfaDialog from './auth/MfaDialog'
import { AVATARS } from './auth/avatars'
import ActivityFilter from './places/ActivityFilter'
import { ACTIVITY_TYPES, activityOf, type ActivityType } from './places/activities'
import { filterPlaces } from './places/filter'
import { placeIcon, spotIcon } from './places/markers'
import PlaceDetail from './places/PlaceDetail'
import PlaceMeetups from './places/PlaceMeetups'
import PlaceRatings from './places/PlaceRatings'
import { placeIdFromPath, placePath, usePath } from './places/route'
import { groupBySpot } from './places/spots'

const LEIPZIG: [number, number] = [51.3397, 12.3731]
// Zoomed out further, an area could hold more Places than the API sends (MAX_PLACES).
const MIN_ZOOM = 11
// Meetups end by themselves (SCRUM-29); the map asks again so an ended one leaves the map.
const PLACES_REFRESH_MS = 60_000

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

// Moves the map so the open Place is visible and not under the detail panel: on a phone the
// panel covers the lower 60 % of the map, on a laptop a 360 px card on the left (index.css).
function CenterOn({ place }: { place: Place }) {
  const map = useMap()
  useEffect(() => {
    const size = map.getSize()
    const phone = size.x < 768
    const point = map.latLngToContainerPoint([place.lat, place.lon])
    const left = phone ? 0 : 384
    const bottom = phone ? size.y * 0.4 : size.y
    if (point.x >= left && point.x <= size.x && point.y >= 0 && point.y <= bottom) return
    const inView = map.getBounds().contains([place.lat, place.lon])
    map.setView([place.lat, place.lon], inView ? map.getZoom() : 16, { animate: false })
    // Shift the map so the Place sits in the free part: upper fifth (phone) or right of the card.
    map.panBy(phone ? [0, size.y * 0.3] : [-left / 2, 0], { animate: false })
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
  // The last visible map area, to load it again after a Meetup changed or a minute passed.
  const lastArea = useRef<MapArea | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [showMfa, setShowMfa] = useState(false)
  const [chosen, setChosen] = useState<Set<ActivityType>>(() => new Set(ACTIVITY_TYPES))
  const [path, navigate] = usePath()
  const selectedId = placeIdFromPath(path)
  // The answer for the Place in the detail URL. It keeps its id, so an old answer never shows.
  const [detail, setDetail] = useState<{ id: number; place?: Place; error?: string } | null>(null)
  // Counts the tries for the open Place, so "Nochmal versuchen" or a new tap loads it again.
  const [detailTry, setDetailTry] = useState(0)
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
  }, [selectedId, detailTry])

  // A tap on the open Place loads it again (helps after a network error); otherwise it opens it.
  function openPlace(id: number) {
    if (id === selectedId) setDetailTry((n) => n + 1)
    else navigate(placePath(id))
  }

  // Point 8 of Steven's review: only when the Places, the filter or the open Place change.
  const spots = useMemo(
    () => groupBySpot(filterPlaces(places, chosen, selectedId)),
    [places, chosen, selectedId],
  )

  function loadPlaces(area: MapArea) {
    lastArea.current = area
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

  function reloadPlaces() {
    if (lastArea.current) loadPlaces(lastArea.current)
  }

  useEffect(() => {
    const timer = setInterval(() => {
      if (lastArea.current) loadPlaces(lastArea.current)
    }, PLACES_REFRESH_MS)
    return () => clearInterval(timer)
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- one timer; it reads the ref
  }, [])

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
    setShowMfa(false)
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
            <button type="button" onClick={() => setShowMfa(true)}>
              Zwei-Faktor
            </button>
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
      {showMfa && user && (
        <MfaDialog
          token={loadToken() ?? ''}
          user={user}
          onChanged={setUser}
          onClose={() => setShowMfa(false)}
        />
      )}
      <ActivityFilter chosen={chosen} onChange={setChosen} />
      {selectedId !== null && (
        <PlaceDetail
          place={selected}
          error={current?.error ?? null}
          onRetry={() => setDetailTry((n) => n + 1)}
          onClose={() => navigate('/')}
        >
          <PlaceMeetups
            key={selectedId}
            placeId={selectedId}
            user={user}
            onLoginNeeded={() => setShowAuth(true)}
            onChanged={reloadPlaces}
          />
          {/* A new key per user, so a logout does not keep the old user's own Rating. */}
          <PlaceRatings
            key={`${selectedId}-${user?.id ?? 'guest'}`}
            placeId={selectedId}
            user={user}
            onLoginNeeded={() => setShowAuth(true)}
          />
        </PlaceDetail>
      )}
      <MapContainer center={LEIPZIG} zoom={13} minZoom={MIN_ZOOM} style={{ height: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapAreaWatcher onMove={loadPlaces} />
        {selected && <CenterOn place={selected} />}
        {spots.map((spot) => {
          const isSelected = spot.places.some((place) => place.id === selectedId)
          if (spot.places.length === 1) {
            const [place] = spot.places
            return (
              <Marker
                key={place.id}
                position={[spot.lat, spot.lon]}
                icon={placeIcon(place.activity_type, isSelected, place.people_now)}
                title={place.name}
                eventHandlers={{ click: () => openPlace(place.id) }}
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
                            openPlace(place.id)
                          }}
                        >
                          {activity.emoji} {activity.label}
                          <span className="spot-choice-name">{place.name}</span>
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
