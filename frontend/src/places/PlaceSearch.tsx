import { useState } from 'react'
import { searchPlaces, type PlaceSearchHit } from '../api/places'

type Props = {
  onPick: (hit: PlaceSearchHit) => void
}

export default function PlaceSearch({ onPick }: Props) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<PlaceSearchHit[]>([])
  const [searched, setSearched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    const trimmed = query.trim()
    if (!trimmed) return
    setBusy(true)
    setError(null)
    try {
      setHits(await searchPlaces(trimmed))
      setSearched(true)
    } catch (caught) {
      setHits([])
      setSearched(false)
      setError((caught as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function pick(hit: PlaceSearchHit) {
    setHits([])
    setSearched(false)
    onPick(hit)
  }

  return (
    <div className="place-search">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <label className="visually-hidden" htmlFor="place-search-input">
          Platz oder Adresse suchen
        </label>
        <input
          id="place-search-input"
          type="search"
          value={query}
          placeholder="Platz oder Adresse suchen"
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit" disabled={busy || !query.trim()} aria-label="Suchen">
          {busy ? '…' : '⌕'}
        </button>
      </form>

      {(searched || error) && (
        <div className="search-results" aria-live="polite">
          {error && <p className="form-error">Suche fehlgeschlagen. Bitte versuche es erneut.</p>}
          {!error && hits.length === 0 && <p>Keine Treffer.</p>}
          {hits.length > 0 && (
            <ul>
              {hits.map((hit, index) => (
                <li key={`${hit.kind}-${hit.place_id ?? `${hit.lat}-${hit.lon}`}-${index}`}>
                  <button type="button" onClick={() => pick(hit)}>
                    <span aria-hidden="true">{hit.kind === 'place' ? '📍' : '⌖'}</span>
                    <span>
                      {hit.label}
                      {hit.kind === 'place' && <small>SquadMeet-Platz</small>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!error && (
            <small className="search-attribution">
              Suche ©{' '}
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
                OpenStreetMap-Mitwirkende
              </a>{' '}
              · Nominatim
            </small>
          )}
        </div>
      )}
    </div>
  )
}
