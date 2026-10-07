// PROTOTYPE (SCRUM-17), variant B: no map. A list of Meetups by time, each opens a full page.
import { useState, type Dispatch } from 'react'
import { type Action, type Meetup, type State } from './data'
import { CreateMeetupForm, MeetupDetail, MeetupSummary } from './shared'

type Tab = 'now' | 'today' | 'later' | 'mine'

const TAB_LABELS: Record<Tab, string> = { now: 'Jetzt', today: 'Heute', later: 'Später', mine: 'Meine' }

function inTab(meetup: Meetup, tab: Tab, me: string): boolean {
  const today = new Date().toDateString()
  if (tab === 'mine') return meetup.joins.some((j) => j.userId === me) || meetup.hostId === me
  if (meetup.state !== 'active') return false
  if (tab === 'now') return meetup.kind === 'now'
  if (tab === 'today') return meetup.kind === 'later' && new Date(meetup.start).toDateString() === today
  return meetup.kind === 'later' && new Date(meetup.start).toDateString() !== today
}

export default function VariantList({ state, dispatch }: { state: State; dispatch: Dispatch<Action> }) {
  const [tab, setTab] = useState<Tab>('now')
  const [page, setPage] = useState<{ view: 'list' } | { view: 'create' } | { view: 'meetup'; meetupId: number }>({ view: 'list' })

  const meetup = page.view === 'meetup' ? state.meetups.find((m) => m.id === page.meetupId) : undefined
  const meetups = state.meetups.filter((m) => inTab(m, tab, state.me)).sort((a, b) => a.start - b.start)

  if (page.view !== 'list') {
    return (
      <div className="proto-page">
        <button type="button" onClick={() => setPage({ view: 'list' })}>
          ‹ Alle Treffen
        </button>
        {page.view === 'create' && <h2>Neues Treffen</h2>}
        {page.view === 'create' && <CreateMeetupForm dispatch={dispatch} onDone={() => setPage({ view: 'list' })} />}
        {meetup && <MeetupDetail key={meetup.id} meetup={meetup} state={state} dispatch={dispatch} />}
      </div>
    )
  }

  return (
    <div className="proto-page">
      <h2>Treffen in Leipzig</h2>
      <div className="proto-tabs">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button key={t} type="button" className={t === tab ? 'selected' : ''} onClick={() => setTab(t)}>
            {TAB_LABELS[t]} ({state.meetups.filter((m) => inTab(m, t, state.me)).length})
          </button>
        ))}
      </div>
      {meetups.length === 0 && <p>Hier ist nichts.</p>}
      {meetups.map((m) => (
        <MeetupSummary key={m.id} meetup={m} onOpen={() => setPage({ view: 'meetup', meetupId: m.id })} />
      ))}
      <button type="button" className="proto-fab" onClick={() => setPage({ view: 'create' })} aria-label="Neues Treffen">
        +
      </button>
    </div>
  )
}
