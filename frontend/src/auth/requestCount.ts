// The number on the "Konto" button: open Contact requests to the user (SCRUM-32). The count is
// kept with the user it was loaded for, so after a logout and another login nobody sees the
// count of the user before.

export type RequestCount = { userId: number; count: number }

export function countFor(stored: RequestCount | null, userId: number | undefined): number {
  return stored !== null && stored.userId === userId ? stored.count : 0
}
