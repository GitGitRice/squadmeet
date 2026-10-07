// PROTOTYPE (SCRUM-17): three different Meetup screen layouts on one page, switched with
// ?variant=A|B|C. All three share the same test data, so a Meetup made in A shows up in B.
import { useReducer, useState } from 'react'
import { INITIAL_STATE, reducer } from './data'
import { PersonaBar, VariantSwitcher, type Variant } from './shared'
import VariantList from './VariantList'
import VariantMap from './VariantMap'
import VariantWizard from './VariantWizard'

const VARIANTS: Variant[] = [
  { key: 'A', name: 'Karte + Bottom Sheet' },
  { key: 'B', name: 'Liste ohne Karte' },
  { key: 'C', name: 'Assistent' },
]

function variantFromUrl(): string {
  const key = new URLSearchParams(window.location.search).get('variant') ?? 'A'
  return VARIANTS.some((v) => v.key === key) ? key : 'A'
}

export default function MeetupPrototype() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const [variant, setVariant] = useState(variantFromUrl)

  function changeVariant(key: string) {
    const url = new URL(window.location.href)
    url.searchParams.set('variant', key)
    window.history.replaceState(null, '', url)
    setVariant(key)
  }

  return (
    <div className="proto-root">
      <PersonaBar state={state} dispatch={dispatch} />
      <div className="proto-body">
        {variant === 'A' && <VariantMap state={state} dispatch={dispatch} />}
        {variant === 'B' && <VariantList state={state} dispatch={dispatch} />}
        {variant === 'C' && <VariantWizard state={state} dispatch={dispatch} />}
      </div>
      <VariantSwitcher variants={VARIANTS} current={variant} onChange={changeVariant} />
    </div>
  )
}
