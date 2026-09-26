import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'

// Bootstrap is a dependency, so it is bundled instead of loaded from a CDN:
// the app no longer needs internet access to be styled, and the version is
// pinned by package-lock.json. The JS bundle is what powers the navbar
// collapse on small screens.
import 'bootstrap/dist/css/bootstrap.min.css'
// Only the collapse behaviour is needed (the navbar toggle); importing the
// full bundle would add ~90 kB of components the app never uses.
import 'bootstrap/js/dist/collapse'

import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
