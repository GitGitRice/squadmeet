import { ACTIVITIES, ACTIVITY_TYPES, type ActivityType } from './activities'

type Props = {
  chosen: ReadonlySet<ActivityType>
  onChange: (chosen: Set<ActivityType>) => void
}

// One button per Activity type; each one switches its type on or off (SCRUM-24).
export default function ActivityFilter({ chosen, onChange }: Props) {
  function toggle(type: ActivityType) {
    const next = new Set(chosen)
    if (next.has(type)) next.delete(type)
    else next.add(type)
    onChange(next)
  }

  return (
    <div className="activity-filter" role="group" aria-label="Aktivitäten filtern">
      {ACTIVITY_TYPES.map((type) => {
        const { emoji, label, color } = ACTIVITIES[type]
        const on = chosen.has(type)
        return (
          <button
            key={type}
            type="button"
            aria-pressed={on}
            className={on ? 'on' : ''}
            style={{ borderColor: color, background: on ? color : undefined }}
            onClick={() => toggle(type)}
          >
            <span aria-hidden="true">{emoji}</span> {label}
          </button>
        )
      })}
    </div>
  )
}
