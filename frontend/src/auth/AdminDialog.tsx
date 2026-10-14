import LockedPlacesDialog from './LockedPlacesDialog'
import SuggestionApprovalDialog from './SuggestionApprovalDialog'

// The Admin dialogs of the Konto dialog: "Gesperrte Plätze" (SCRUM-39) and
// "Platzvorschläge freigeben" (SCRUM-56).
export type AdminDialogKind = 'locked' | 'approvals'

type Props = {
  kind: AdminDialogKind
  token: string
  // A Place came back, became active or is gone: the parent loads the map and the detail again.
  onChanged: () => void
  onOpenPlace: (id: number) => void
  onClose: () => void
}

export default function AdminDialog({ kind, token, onChanged, onOpenPlace, onClose }: Props) {
  if (kind === 'locked') return <LockedPlacesDialog token={token} onUnlocked={onChanged} onClose={onClose} />
  return <SuggestionApprovalDialog token={token} onChanged={onChanged} onOpenPlace={onOpenPlace} onClose={onClose} />
}
