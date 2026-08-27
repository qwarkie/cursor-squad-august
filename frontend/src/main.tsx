import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'
import StackCheck from './StackCheck.tsx'
import './index.css'

/**
 * The product mounts by default (T032).
 *
 * `StackCheck` is a toolchain probe, not the product — mounting it here is right
 * for spotting a sprite regression and fatal for a demo, because deploying that
 * state ships the test page as the app. It stays one query parameter away rather
 * than being deleted, since it is the fastest way to see every sprite at once.
 *
 * Read once at startup: the choice is fixed for the life of the page, so there is
 * no reactive state here and no router dependency for a single-screen app.
 */
const showStackCheck = new URLSearchParams(window.location.search).has('stackcheck')

createRoot(document.getElementById('root')!).render(
  <StrictMode>{showStackCheck ? <StackCheck /> : <App />}</StrictMode>,
)
