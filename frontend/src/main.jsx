import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import LegalGate from './LegalGate.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LegalGate
      appName="USAint"
      description="USAint mappa le reti di influenza politica e mediatica statunitensi a partire da fonti pubbliche: attori, narrazioni e connessioni del sistema politico USA, restituiti come grafi leggibili. Uno strumento di analisi per capire le dinamiche del potere, non per accusarlo."
    >
      <App />
    </LegalGate>
  </React.StrictMode>
)
