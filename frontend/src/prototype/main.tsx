// PROTOTYPE (SCRUM-17): only the dev server serves this page (`npm run prototype`).
// The production build has only index.html, so this page never ships.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import './prototype.css'
import MeetupPrototype from './MeetupPrototype'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MeetupPrototype />
  </StrictMode>,
)
