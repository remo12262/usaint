import { useState, useEffect } from "react";

/*
  LegalGate — password d'accesso + banner di metodo + accettazione Termini.
  Uso:
      <LegalGate appName="POLINT">
        <App />
      </LegalGate>
  Per USAint cambia solo appName="USAint".

  PASSWORD: NON va scritta qui. Si imposta come variabile d'ambiente su Render
  con nome  VITE_ACCESS_PASSWORD  (vedi istruzioni). Se la variabile non e'
  impostata, lo step password viene saltato.

  NOTA DI SICUREZZA: una password lato frontend e' un filtro/deterrente, non una
  protezione forte (e' visibile a chi ispeziona il codice). Per un accesso davvero
  blindato serve un controllo lato server o un servizio come Cloudflare Access.
*/

export default function LegalGate({ appName = "POLINT", children }) {
  const ACCEPT_KEY = `legal_accepted_${appName}`;
  const UNLOCK_KEY = `unlocked_${appName}`;
  const PASSWORD = import.meta.env.VITE_ACCESS_PASSWORD || "";

  const [unlocked, setUnlocked] = useState(true);
  const [accepted, setAccepted] = useState(true);
  const [showTerms, setShowTerms] = useState(false);
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      setUnlocked(!PASSWORD || sessionStorage.getItem(UNLOCK_KEY) === "1");
      setAccepted(localStorage.getItem(ACCEPT_KEY) === "1");
    } catch {
      setUnlocked(!PASSWORD);
      setAccepted(false);
    }
  }, [ACCEPT_KEY, UNLOCK_KEY, PASSWORD]);

  function tryUnlock() {
    if (pw === PASSWORD) {
      try { sessionStorage.setItem(UNLOCK_KEY, "1"); } catch {}
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  }

  function accept() {
    try { localStorage.setItem(ACCEPT_KEY, "1"); } catch {}
    setAccepted(true);
  }

  const overlay = {
    position: "fixed", inset: 0, background: "rgba(6,10,20,0.85)",
    display: "grid", placeItems: "center", zIndex: 9999, padding: 20,
  };
  const box = {
    maxWidth: 620, width: "100%", maxHeight: "85vh", overflow: "auto",
    background: "#10172B", color: "#E7ECF6", border: "1px solid #1E2942",
    borderRadius: 16, padding: 28, fontFamily: "system-ui, sans-serif", lineHeight: 1.55,
  };
  const banner = {
    position: "sticky", top: 0, zIndex: 500,
    background: "#0E1426", color: "#8A96B2", borderBottom: "1px solid #1E2942",
    fontSize: 12.5, padding: "8px 16px", textAlign: "center",
    fontFamily: "system-ui, sans-serif",
  };
  const btn = {
    background: "#8B7FD6", color: "#0B1020", border: "none", borderRadius: 999,
    padding: "11px 22px", fontWeight: 600, cursor: "pointer", fontSize: 14,
  };
  const input = {
    width: "100%", padding: "11px 14px", borderRadius: 10, fontSize: 15,
    background: "#0E1426", color: "#E7ECF6", border: "1px solid #1E2942", marginTop: 6,
  };
  const link = { color: "#8B7FD6", cursor: "pointer", textDecoration: "underline" };

  // STEP 1 — password
  if (!unlocked) {
    return (
      <div style={overlay}>
        <div style={box}>
          <h2 style={{ marginTop: 0, fontSize: "1.25rem" }}>{appName} — accesso riservato</h2>
          <p style={{ color: "#8A96B2" }}>Inserisci la password per accedere.</p>
          <input
            type="password" style={input} value={pw} autoFocus
            onChange={(e) => { setPw(e.target.value); setError(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") tryUnlock(); }}
            placeholder="Password"
          />
          {error && <p style={{ color: "#F25C7A", fontSize: 13 }}>Password errata.</p>}
          <div style={{ marginTop: 18 }}>
            <button style={btn} onClick={tryUnlock}>Entra</button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2 — accettazione Termini
  if (!accepted) {
    return (
      <div style={overlay}>
        <div style={box}>
          <h2 style={{ marginTop: 0, fontSize: "1.25rem" }}>{appName} — prima di entrare</h2>
          <p>
            {appName} analizza reti di influenza politica e mediatica a partire da
            <b> fonti pubbliche</b>. I collegamenti mostrati sono
            <b> correlazioni e co-occorrenze osservate</b>, non affermazioni di
            coordinamento occulto ne' accuse. Ogni relazione riporta la fonte e un grado
            di confidenza. L'analisi riguarda figure pubbliche nella loro attivita' pubblica.
          </p>
          <p>
            Sei l'unico responsabile di cio' che esporti, pubblichi o diffondi all'esterno
            del servizio. Entrando dichiari di aver letto e di accettare i{" "}
            <span style={link} onClick={() => setShowTerms(true)}>Termini di servizio e l'Informativa privacy</span>.
          </p>
          <div style={{ marginTop: 22 }}>
            <button style={btn} onClick={accept}>Ho letto e accetto — entra</button>
          </div>
          {showTerms && <TermsModal appName={appName} onClose={() => setShowTerms(false)} box={box} overlay={overlay} link={link} />}
        </div>
      </div>
    );
  }

  // STEP 3 — app sbloccata + banner di metodo
  return (
    <>
      <div style={banner}>
        Correlazione su dati pubblici · non costituisce accusa · vedi fonte e confidenza ·{" "}
        <span style={link} onClick={() => setShowTerms(true)}>Termini e privacy</span>
      </div>
      {children}
      {showTerms && <TermsModal appName={appName} onClose={() => setShowTerms(false)} box={box} overlay={overlay} link={link} />}
    </>
  );
}

function TermsModal({ appName, onClose, box, overlay }) {
  const close = { float: "right", background: "none", border: "none", color: "#8A96B2", fontSize: 22, cursor: "pointer" };
  return (
    <div style={overlay} onClick={onClose}>
      <div style={box} onClick={(e) => e.stopPropagation()}>
        <button style={close} onClick={onClose} aria-label="Chiudi">×</button>
        <h2 style={{ marginTop: 0 }}>{appName} — Termini e privacy</h2>
        <h3 style={{ fontSize: "1rem" }}>Natura analitica</h3>
        <p>
          Le connessioni indicano correlazioni, co-occorrenze o allineamenti osservati nei
          dati e non implicano accordo, coordinamento o condotta illecita tra i soggetti.
          L'interpretazione dei grafi e' responsabilita' di chi li legge.
        </p>
        <h3 style={{ fontSize: "1rem" }}>Responsabilita' dell'utente</h3>
        <p>
          Chi esporta o diffonde i grafi all'esterno e' l'unico responsabile di tale
          diffusione, anche ai fini della normativa su diffamazione e protezione dei dati.
        </p>
        <h3 style={{ fontSize: "1rem" }}>Dati e privacy (GDPR)</h3>
        <p>
          Sono trattati dati di figure pubbliche relativi alla loro attivita' pubblica, da
          fonti accessibili al pubblico. Base giuridica: interesse pubblico all'informazione
          e dati resi pubblici dall'interessato. Diritti e segnalazioni:  remo.pulcini@libero.it
        </p>
      </div>
    </div>
  );
}
