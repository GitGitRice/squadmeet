// PROTOTYPE (SCRUM-17), variant A: the map stays; a bottom sheet shows the Place and its Meetups.
import { useState, type Dispatch } from 'react'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ACTIVITIES, PLACES, placeById, type Action, type State } from './data'
import { CreateMeetupForm, MeetupDetail, MeetupSummary } from './shared'

type Sheet = { placeId: number; view: 'place' | 'create' } | { placeId: number; view: 'meetup'; meetupId: number }

export default function VariantMap({ state, dispatch }: { state: State; dispatch: Dispatch<Action> }) {
  const [sheet, setSheet] = useState<Sheet | null>(null)

  function icon(placeId: number) {
    const place = placeById(placeId)
    const active = state.meetups.filter((m) => m.placeId === placeId && m.state === 'active')
    const now = active.some((m) => m.kind === 'now')
    return L.divIcon({
      className: '',
      html: `<div class="proto-pin${now ? ' now' : ''}">${ACTIVITIES[place.activity].emoji}${
        active.length ? `<span>${active.length}</span>` : ''
      }</div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    })
  }

  const place = sheet && placeById(sheet.placeId)
  const meetups = sheet ? state.meetups.filter((m) => m.placeId === sheet.placeId).sort((a, b) => a.start - b.start) : []
  const meetup = sheet?.view === 'meetup' ? state.meetups.find((m) => m.id === sheet.meetupId) : undefined

  return (
    <div className="proto-map">
      <MapContainer center={[51.3367, 12.38]} zoom={13} style={{ height: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {PLACES.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lon]}
            icon={icon(p.id)}
            eventHandlers={{ click: () => setSheet({ placeId: p.id, view: 'place' }) }}
          />
        ))}
      </MapContainer>
      {!sheet && <p className="proto-hint">Tippe auf einen Platz. Rot = jemand ist jetzt da.</p>}

      {sheet && place && (
        <div className="proto-sheet">
          <div className="proto-sheet-head">
            {sheet.view !== 'place' && (
              <button type="button" onClick={() => setSheet({ placeId: sheet.placeId, view: 'place' })}>
                ‹ Zurück
              </button>
            )}
            <strong>
              {ACTIVITIES[place.activity].emoji} {place.name}
            </strong>
            <button type="button" onClick={() => setSheet(null)} aria-label="Schließen">
              ✕
            </button>
          </div>

          {sheet.view === 'place' && (
            <>
              <button type="button" className="primary" onClick={() => setSheet({ placeId: place.id, view: 'create' })}>
                Ich bin jetzt hier / Treffen planen
              </button>
              <h4>Treffen hier</h4>
              {meetups.length === 0 && <p>Noch keine Treffen.</p>}
              {meetups.map((m) => (
                <MeetupSummary key={m.id} meetup={m} onOpen={() => setSheet({ placeId: place.id, view: 'meetup', meetupId: m.id })} />
              ))}
            </>
          )}
          {sheet.view === 'create' && (
            <CreateMeetupForm placeId={place.id} dispatch={dispatch} onDone={() => setSheet({ placeId: place.id, view: 'place' })} />
          )}
          {meetup && <MeetupDetail key={meetup.id} meetup={meetup} state={state} dispatch={dispatch} />}
        </div>
      )}
    </div>
  )
}
