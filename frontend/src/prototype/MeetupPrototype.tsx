// PROTOTYPE (SCRUM-17): the Meetup screens the team chose (map + bottom sheet).
// Test data in memory; reload the page to start again.
import { useEffect, useReducer, useState } from 'react'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  ACTIVITIES,
  INITIAL_STATE,
  PLACES,
  TIME_FILTERS,
  matchesFilter,
  partyTotal,
  placeById,
  reducer,
  timeFormat,
  type Meetup,
  type TimeFilter,
} from './data'
import { LaterForm, MeetupCard, MeetupDetail, NowForm, PrototypeBar } from './parts'

type Sheet =
  | { placeId: number; view: 'place' | 'now' | 'later' }
  | { placeId: number; view: 'meetup'; meetupId: number }

function pinIcon(activity: string, meetups: Meetup[]) {
  const live = meetups.find((m) => m.kind === 'now')
  const next = meetups.find((m) => m.kind === 'later')
  const kind = live ? 'now' : next ? 'later' : 'empty'
  // The badge says what matters at a glance: how many are there now, or when the next Meetup starts.
  const badge = live ? `${partyTotal(live)} 👤` : next ? timeFormat.format(next.start) : ''
  const size = kind === 'empty' ? 36 : 48
  return L.divIcon({
    className: '',
    html: `<div class="pt-pin ${kind}">${ACTIVITIES[activity].emoji}${badge ? `<span>${badge}</span>` : ''}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

export default function MeetupPrototype() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [filter, setFilter] = useState<TimeFilter>('all')
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  const visible = (placeId: number) =>
    state.meetups.filter((m) => m.placeId === placeId && matchesFilter(m, filter)).sort((a, b) => a.start - b.start)

  const place = sheet && placeById(sheet.placeId)
  // The sheet lists all Meetups of the Place, also cancelled and closed ones, so a user sees what happened.
  const placeMeetups = sheet ? state.meetups.filter((m) => m.placeId === sheet.placeId).sort((a, b) => a.start - b.start) : []
  const meetup = sheet?.view === 'meetup' ? state.meetups.find((m) => m.id === sheet.meetupId) : undefined
  const liveHere = placeMeetups.find((m) => m.kind === 'now' && m.state === 'active')

  function openNew(placeId: number) {
    // The next id is the new Meetup (the first Occurrence for a Series).
    setSheet({ placeId, view: 'meetup', meetupId: state.nextId })
  }

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
            icon={pinIcon(p.activity, visible(p.id))}
            eventHandlers={{ click: () => setSheet({ placeId: p.id, view: 'place' }) }}
          />
        ))}
      </MapContainer>

      <header className="pt-top">
        <div className="pt-filters" role="group" aria-label="Zeit">
          {(Object.keys(TIME_FILTERS) as TimeFilter[]).map((f) => (
            <button key={f} type="button" className={f === filter ? 'selected' : ''} onClick={() => setFilter(f)}>
              {TIME_FILTERS[f]}
            </button>
          ))}
        </div>
        <div className="pt-legend">
          <span className="dot now" /> Jetzt hier <span className="dot later" /> Geplant
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
                  <span className="pt-live">LIVE</span> {partyTotal(liveHere)} Personen sind jetzt hier ›
                </button>
              )}
              <div className="pt-cta">
                <button type="button" className="pt-btn now" onClick={() => setSheet({ placeId: place.id, view: 'now' })}>
                  📍 Ich bin jetzt hier
                </button>
                <button type="button" className="pt-btn" onClick={() => setSheet({ placeId: place.id, view: 'later' })}>
                  🗓 Treffen planen
                </button>
              </div>
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
                openNew(place.id)
                dispatch({ type: 'createNow', placeId: place.id, hours, partySize })
                setToast('Du bist jetzt auf der Karte. Andere können mitkommen.')
              }}
            />
          )}

          {sheet.view === 'later' && (
            <LaterForm
              onSubmit={(when, partySize) => {
                openNew(place.id)
                if (typeof when === 'number') dispatch({ type: 'createLater', placeId: place.id, start: when, partySize })
                else dispatch({ type: 'createSeries', placeId: place.id, slots: when, partySize })
                setToast('Dein Treffen ist angekündigt.')
              }}
            />
          )}

          {meetup && <MeetupDetail key={meetup.id} meetup={meetup} state={state} dispatch={dispatch} notify={setToast} />}
        </section>
      )}

      {toast && (
        <div className="pt-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
