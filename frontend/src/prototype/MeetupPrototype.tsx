// PROTOTYPE (SCRUM-17): the Meetup screens, layout "map + bottom sheet".
// Test data in memory; reload the page to start again.
import { useEffect, useReducer, useState } from 'react'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ACTIVITIES, INITIAL_STATE, PLACES, partyTotal, people, placeById, reducer, type ActivityType, type Meetup } from './data'
import { MeetupCard, MeetupDetail, NowForm, PrototypeBar } from './parts'

type Sheet =
  | { placeId: number; view: 'place' | 'now' }
  | { placeId: number; view: 'meetup'; meetupId: number }

function pinIcon(activity: ActivityType, meetups: Meetup[]) {
  const total = meetups.reduce((sum, m) => sum + partyTotal(m), 0)
  const live = meetups.length > 0
  const size = live ? 48 : 36
  return L.divIcon({
    className: '',
    // The badge says at a glance how many people are there now.
    html: `<div class="pt-pin ${live ? 'now' : 'empty'}">${ACTIVITIES[activity].emoji}${live ? `<span>${total} 👤</span>` : ''}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

export default function MeetupPrototype() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [message, showMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => showMessage(null), 3500)
    return () => clearTimeout(timer)
  }, [message])

  const activeMeetupsAt = (placeId: number) => state.meetups.filter((m) => m.placeId === placeId && !m.cancelled)

  const place = sheet && placeById(sheet.placeId)
  // The sheet lists all Meetups of the Place, also cancelled ones, so a user sees what happened.
  const placeMeetups = sheet ? state.meetups.filter((m) => m.placeId === sheet.placeId).sort((a, b) => a.start - b.start) : []
  const meetup = sheet?.view === 'meetup' ? state.meetups.find((m) => m.id === sheet.meetupId) : undefined
  const liveHere = placeMeetups.find((m) => !m.cancelled)

  return (
    <div className="pt-root">
      <MapContainer center={[51.3367, 12.38]} zoom={13} zoomControl={false} style={{ height: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {PLACES.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lon]}
            icon={pinIcon(p.activity, activeMeetupsAt(p.id))}
            eventHandlers={{ click: () => setSheet({ placeId: p.id, view: 'place' }) }}
          />
        ))}
      </MapContainer>

      <header className="pt-top">
        <div className="pt-legend">
          <span className="dot now" /> Jemand ist jetzt hier
        </div>
        <PrototypeBar state={state} dispatch={dispatch} />
      </header>

      {!sheet && <p className="pt-hint">Tippe auf einen Platz</p>}

      {sheet && place && (
        <section className="pt-sheet" aria-label={place.name}>
          <div className="pt-handle" />
          <div className="pt-sheet-head">
            {sheet.view !== 'place' ? (
              <button type="button" className="pt-icon" onClick={() => setSheet({ placeId: place.id, view: 'place' })} aria-label="Zurück">
                ‹
              </button>
            ) : (
              <span className="pt-place-emoji">{ACTIVITIES[place.activity].emoji}</span>
            )}
            <div className="pt-place-title">
              <strong>{place.name}</strong>
              <span>{ACTIVITIES[place.activity].label}</span>
            </div>
            <button type="button" className="pt-icon" onClick={() => setSheet(null)} aria-label="Schließen">
              ✕
            </button>
          </div>

          {sheet.view === 'place' && (
            <>
              {liveHere && (
                <button type="button" className="pt-live-banner" onClick={() => setSheet({ placeId: place.id, view: 'meetup', meetupId: liveHere.id })}>
                  <span className="pt-live">LIVE</span> {people(partyTotal(liveHere))} {partyTotal(liveHere) === 1 ? 'ist' : 'sind'} jetzt hier ›
                </button>
              )}
              <button type="button" className="pt-btn now" onClick={() => setSheet({ placeId: place.id, view: 'now' })}>
                📍 Ich bin jetzt hier
              </button>
              <h3 className="pt-h3">Treffen an diesem Platz</h3>
              {placeMeetups.length === 0 && <p className="pt-muted">Noch keine Treffen. Sei der Erste!</p>}
              {placeMeetups.map((m) => (
                <MeetupCard key={m.id} meetup={m} me={state.me} onOpen={() => setSheet({ placeId: place.id, view: 'meetup', meetupId: m.id })} />
              ))}
            </>
          )}

          {sheet.view === 'now' && (
            <NowForm
              onSubmit={(hours, partySize) => {
                setSheet({ placeId: place.id, view: 'meetup', meetupId: state.nextId })
                dispatch({ type: 'create', placeId: place.id, hours, partySize })
                showMessage('Du bist jetzt auf der Karte. Andere können mitkommen.')
              }}
            />
          )}

          {meetup && <MeetupDetail key={meetup.id} meetup={meetup} state={state} dispatch={dispatch} showMessage={showMessage} />}
        </section>
      )}

      {message && (
        <div className="pt-message" role="status">
          {message}
        </div>
      )}
    </div>
  )
}
