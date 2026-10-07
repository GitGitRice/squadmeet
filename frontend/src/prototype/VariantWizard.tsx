// PROTOTYPE (SCRUM-17), variant C: a start screen with two big buttons and one question per step.
import { useState, type Dispatch } from 'react'
import { ACTIVITIES, PLACES, WEEKDAYS, placeById, type Action, type State } from './data'
import { MeetupDetail, MeetupSummary, PartySizeSelect } from './shared'

type Kind = 'now' | 'later' | 'series'
type Draft = { kind: Kind; placeId?: number; hours: number; start: string; weekdays: number[]; time: string; partySize: number }

const STEPS = ['Platz', 'Zeit', 'Personen', 'Prüfen'] as const

export default function VariantWizard({ state, dispatch }: { state: State; dispatch: Dispatch<Action> }) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [step, setStep] = useState(0)
  const [openId, setOpenId] = useState<number | null>(null)

  const open = openId !== null ? state.meetups.find((m) => m.id === openId) : undefined
  const mine = state.meetups.filter((m) => m.state === 'active' && m.joins.some((j) => j.userId === state.me))
  const others = state.meetups.filter((m) => m.state === 'active' && !mine.includes(m)).slice(0, 4)

  function start(kind: Kind) {
    setDraft({ kind, hours: 2, start: '18:00', weekdays: [2], time: '18:00', partySize: 1 })
    setStep(0)
  }

  function finish(d: Draft) {
    const before = state.nextId
    if (d.kind === 'now') dispatch({ type: 'createNow', placeId: d.placeId!, hours: d.hours, partySize: d.partySize })
    if (d.kind === 'later') {
      const [h, m] = d.start.split(':').map(Number)
      const date = new Date(Date.now() + 24 * 60 * 60 * 1000)
      date.setHours(h, m, 0, 0)
      dispatch({ type: 'createLater', placeId: d.placeId!, start: date.getTime(), partySize: d.partySize })
    }
    if (d.kind === 'series') {
      const slots = d.weekdays.map((weekday) => ({ weekday, time: d.time }))
      dispatch({ type: 'createSeries', placeId: d.placeId!, slots, partySize: d.partySize })
    }
    setDraft(null)
    setOpenId(before)
  }

  if (open) {
    return (
      <div className="proto-page">
        <button type="button" onClick={() => setOpenId(null)}>
          ‹ Start
        </button>
        <MeetupDetail key={open.id} meetup={open} state={state} dispatch={dispatch} />
      </div>
    )
  }

  if (draft) {
    const set = (change: Partial<Draft>) => setDraft({ ...draft, ...change })
    return (
      <div className="proto-page proto-wizard">
        <ol className="proto-steps">
          {STEPS.map((s, i) => (
            <li key={s} className={i === step ? 'selected' : ''}>
              {s}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <>
            <h2>Wo?</h2>
            {PLACES.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`proto-choice${draft.placeId === p.id ? ' selected' : ''}`}
                onClick={() => {
                  set({ placeId: p.id })
                  setStep(1)
                }}
              >
                {ACTIVITIES[p.activity].emoji} {p.name}
              </button>
            ))}
          </>
        )}

        {step === 1 && draft.kind === 'now' && (
          <>
            <h2>Wie lange bist du da?</h2>
            {[1, 2, 3, 4].map((h) => (
              <button key={h} type="button" className={`proto-choice${draft.hours === h ? ' selected' : ''}`} onClick={() => set({ hours: h })}>
                {h} {h === 1 ? 'Stunde' : 'Stunden'}
              </button>
            ))}
          </>
        )}
        {step === 1 && draft.kind === 'later' && (
          <>
            <h2>Morgen um wie viel Uhr?</h2>
            <input type="time" value={draft.start} onChange={(e) => set({ start: e.target.value })} />
          </>
        )}
        {step === 1 && draft.kind === 'series' && (
          <>
            <h2>An welchen Tagen?</h2>
            <div className="proto-chips">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <button
                  key={d}
                  type="button"
                  className={draft.weekdays.includes(d) ? 'selected' : ''}
                  onClick={() => set({ weekdays: draft.weekdays.includes(d) ? draft.weekdays.filter((x) => x !== d) : [...draft.weekdays, d] })}
                >
                  {WEEKDAYS[d]}
                </button>
              ))}
            </div>
            <label>
              Uhrzeit
              <input type="time" value={draft.time} onChange={(e) => set({ time: e.target.value })} />
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <h2>Wie viele seid ihr?</h2>
            <PartySizeSelect value={draft.partySize} onChange={(n) => set({ partySize: n })} />
          </>
        )}

        {step === 3 && (
          <>
            <h2>Passt das?</h2>
            <p>
              {ACTIVITIES[placeById(draft.placeId!).activity].emoji} {placeById(draft.placeId!).name}
              <br />
              {draft.kind === 'now' && `Jetzt, für ${draft.hours} h`}
              {draft.kind === 'later' && `Morgen, ${draft.start}`}
              {draft.kind === 'series' && `Jede Woche ${draft.weekdays.map((d) => WEEKDAYS[d]).join(', ')}, ${draft.time}`}
              <br />
              {draft.partySize} {draft.partySize === 1 ? 'Person' : 'Personen'}
            </p>
            <button type="button" className="primary" onClick={() => finish(draft)}>
              {draft.kind === 'now' ? 'Ich bin jetzt hier' : 'Treffen ankündigen'}
            </button>
          </>
        )}

        <div className="proto-nav">
          <button type="button" onClick={() => (step === 0 ? setDraft(null) : setStep(step - 1))}>
            ‹ {step === 0 ? 'Abbrechen' : 'Zurück'}
          </button>
          {step > 0 && step < 3 && (
            <button type="button" className="primary" onClick={() => setStep(step + 1)} disabled={draft.kind === 'series' && draft.weekdays.length === 0}>
              Weiter ›
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="proto-page proto-wizard">
      <button type="button" className="proto-big now" onClick={() => start('now')}>
        📍 Ich bin jetzt hier
      </button>
      <button type="button" className="proto-big" onClick={() => start('later')}>
        🗓 Treffen planen
      </button>
      <button type="button" className="proto-big small" onClick={() => start('series')}>
        🔁 Jede Woche
      </button>

      <h4>Meine Treffen</h4>
      {mine.length === 0 && <p>Du bist bei keinem Treffen dabei.</p>}
      {mine.map((m) => (
        <MeetupSummary key={m.id} meetup={m} onOpen={() => setOpenId(m.id)} />
      ))}
      <h4>Andere Treffen</h4>
      {others.map((m) => (
        <MeetupSummary key={m.id} meetup={m} onOpen={() => setOpenId(m.id)} />
      ))}
    </div>
  )
}
