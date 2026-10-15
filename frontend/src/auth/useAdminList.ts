import { useEffect, useState } from 'react'

type Item = { id: number }
type Action = (token: string, id: number) => Promise<void>

/** The list of an Admin dialog (SCRUM-56, SCRUM-57): it loads the items, and `decide` runs one
 * action on an item, takes the item off the list and tells the parent. `confirmingId` is the
 * item whose second step ("Ja, …") shows. */
export function useAdminList<T extends Item>(
  token: string,
  load: (token: string) => Promise<T[]>,
  onChanged: () => void,
) {
  const [items, setItems] = useState<T[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)

  useEffect(() => {
    load(token)
      .then(setItems)
      .catch((err: Error) => setError(err.message))
  }, [token, load])

  async function decide(id: number, action: Action) {
    setBusyId(id)
    setError(null)
    try {
      await action(token, id)
      setItems((current) => current?.filter((item) => item.id !== id) ?? null)
      setConfirmingId(null)
      onChanged()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  return { items, error, busyId, confirmingId, setConfirmingId, decide }
}
