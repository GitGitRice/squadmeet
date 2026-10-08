// The Activity types. The keys must match ActivityType in backend/app/activities.py.
// Each type has its own marker: an emoji in a ring of its own colour (SCRUM-24).
export const ACTIVITIES = {
  table_tennis: { emoji: '🏓', label: 'Tischtennis', color: '#0b7285' },
  basketball: { emoji: '🏀', label: 'Basketball', color: '#d9480f' },
  football: { emoji: '⚽', label: 'Fußball', color: '#2b8a3e' },
  beach_volleyball: { emoji: '🏐', label: 'Beachvolleyball', color: '#b8860b' },
  outdoor_fitness: { emoji: '💪', label: 'Outdoor-Fitness', color: '#5f3dc4' },
} as const

export type ActivityType = keyof typeof ACTIVITIES

export const ACTIVITY_TYPES = Object.keys(ACTIVITIES) as ActivityType[]

// The API sends a plain string; an unknown type gets a neutral look instead of a crash.
export function activityOf(type: string) {
  return ACTIVITIES[type as ActivityType] ?? { emoji: '📍', label: type, color: '#495057' }
}
