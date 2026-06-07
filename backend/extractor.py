import anthropic
import json
import os
from typing import Dict, List

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """Sei un sistema di intelligence politica avanzato specializzato nella politica USA, focalizzato su:
1. Identificazione di reti di influenza NASCOSTE (non dichiarate)
2. Analisi predittiva di decisioni politiche future a Washington e negli Stati
3. Tracciamento flussi di finanziamento elettorale, dark money e lobbying (K Street)

Tipi di entità:
- PolicyMaker: presidente, vicepresidente, senatori, deputati, governatori, segretari di gabinetto, giudici
- PoliticalParty: partiti, caucus, fazioni interne (es. Freedom Caucus, Squad)
- PAC: comitati di azione politica, Super PAC, gruppi dark money
- LobbyGroup: studi di lobbying K Street, associazioni di categoria, think tank
- MediaOutlet: network TV, giornali, piattaforme, podcaster e influencer politici
- Corporation: aziende con interessi politici (difesa, tech, energia, farma, finanza)
- Foundation: fondazioni, ONG, centri studi con agenda politica
- GovernmentAgency: agenzie federali, dipartimenti, istituzioni statali
- Person: individui chiave (CEO, grandi donatori, consulenti, strateghi)
- InvestorInstitution: fondi, banche, hedge fund, family office con influenza politica

Tipi di relazione (focus su INFLUENZA NASCOSTA):
- FINANZIA_OCCULTO: finanziamento non trasparente o indiretto (dark money)
- CONTROLLA_MEDIA: controllo editoriale di media
- LOBBYING_SU: attività lobbying verso decisore
- REVOLVING_DOOR: ex funzionario ora in azienda/lobby o viceversa
- RETE_INFORMALE: connessione informale non documentata
- FINANZIA_CAMPAGNA: finanziamento elettorale dichiarato (donazioni FEC)
- DONA_A_PAC: donazione a comitato di azione politica / Super PAC
- MEMBRO_DI: membership in organizzazioni
- ALLEATO_DI: alleanza politica
- OPPOSTO_A: opposizione politica
- NOMINA: ha nominato / è stato nominato o confermato da
- CITA_POSITIVO: media cita positivamente
- CITA_NEGATIVO: media cita negativamente

Per ogni relazione calcola:
- influence_score (0-100): quanto questa relazione impatta sulle decisioni politiche
- hidden_score (0-100): quanto questa relazione è nascosta/non trasparente
- ALTA hidden_score se: finanziamento indiretto/dark money, revolving door, media control, connessioni non dichiarate"""

EXTRACT_PROMPT = """Analizza questo testo politico ed estrai entità e relazioni di influenza.
Focalizzati su connessioni NON OVVIE e reti di influenza nascoste.

Testo:
{text}

REGOLE CRITICHE:
- FINANZIA_OCCULTO: SOLO per flussi monetari non dichiarati. MAI per voti o consenso.
- RETE_INFORMALE: per accordi taciti, voti incrociati, simpatie elettorali.
- hidden_score sopra 70: SOLO se relazione esplicitamente segreta o da indagini.
- hidden_score 40-70: relazioni poco trasparenti ma non illecite.
- hidden_score sotto 40: relazioni pubbliche e dichiarate.

IMPORTANTE per il campo sentiment: analizza il testo e determina se la relazione
tra le due entità è FAVOREVOLE (accordo, alleanza, sostegno), CONTRARIO (opposizione,
critica, conflitto) o NEUTRO (semplice menzione, contatto istituzionale).

Rispondi SOLO con JSON:
{{
  "entities": [
    {{
      "id": "slug_univoco",
      "label": "Nome",
      "type": "TipoEntità",
      "country": "IT/EU/US/etc",
      "description": "ruolo e contesto",
      "influence_score": 0,
      "hidden_score": 0
    }}
  ],
  "relations": [
    {{
      "source": "id1",
      "target": "id2",
      "type": "TIPO_RELAZIONE",
      "fact": "descrizione concisa della relazione",
      "sentiment": "FAVOREVOLE|CONTRARIO|NEUTRO",
      "influence_score": 0,
      "hidden_score": 0,
      "date": "YYYY-MM o null",
      "source_url": null,
      "source_title": null
    }}
  ]
}}"""

PREDICT_PROMPT = """Sei un analista politico di intelligence di alto livello.
Analizza questo knowledge graph di influenze politiche e genera previsioni concrete.

Graph data:
{graph_data}

Genera 4-6 previsioni predittive strutturate così:
[
  {{
    "id": "pred_slug",
    "title": "Titolo previsione concreta",
    "prediction": "Descrizione dettagliata di cosa accadrà",
    "actors_involved": ["id1", "id2"],
    "hidden_network": "Descrizione della rete nascosta che guida questo evento",
    "confidence": 70,
    "timeframe": "es. 2-4 mesi",
    "evidence": "Evidenze nel grafo che supportano questa previsione",
    "trigger_event": "Evento scatenante atteso",
    "impact_score": 70,
    "category": "POLICY|ELECTION|APPOINTMENT|REGULATION|ALLIANCE|FINANCIAL",
    "severity": "CRITICAL|HIGH|MEDIUM|LOW"
  }}
]

Focus su:
- Nomine imminenti guidate da reti informali
- Cambi di posizione su normative EU (AI Act, energia, difesa)
- Alleanze e rotture di coalizioni
- Movimenti di finanziamento che anticipano decisioni politiche
- Pattern di media coverage che preannunciano mosse politiche

Rispondi SOLO con JSON valido. Nessun testo prima o dopo il JSON."""

HIDDEN_NETWORKS_PROMPT = """Analizza questo grafo di influenze e identifica cluster di influenza nascosta.

Entità: {entities}
Relazioni: {relations}

Identifica 3-5 reti di influenza nascoste:
[
  {{
    "id": "network_slug",
    "name": "Nome rete",
    "description": "Come opera questa rete di influenza",
    "core_actors": ["id1", "id2"],
    "mechanism": "Come esercita influenza (es. media control, finanziamenti, revolving door)",
    "opacity_score": 70,
    "reach_score": 70,
    "policy_areas": ["es. energia", "difesa", "AI regulation"]
  }}
]

Rispondi SOLO con JSON valido. Nessun testo prima o dopo il JSON."""


class InfluenceExtractor:

    def _slug(self, text: str) -> str:
        import re
        return re.sub(r'[^a-z0-9_]', '', text.lower().replace(' ', '_'))[:32]

    def _parse_json_from_response(self, msg) -> str:
        raw = ""
        for block in msg.content:
            if hasattr(block, "text"):
                text = block.text.strip()
                if text.startswith("[") or text.startswith("{"):
                    raw = text
                    break
        if not raw:
            for block in msg.content:
                if hasattr(block, "text") and block.text.strip():
                    raw = block.text.strip()
                    if "```json" in raw:
                        raw = raw.split("```json")[1].split("```")[0].strip()
                        break
                    elif "```" in raw:
                        raw = raw.split("```")[1].split("```")[0].strip()
                        break
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return raw.strip()

    async def extract(self, text: str, source_id: str = "", source_url: str = "") -> Dict:
        if not text or len(text.strip()) < 50:
            return {"entities": [], "relations": []}
        try:
            msg = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                system=SYSTEM_PROMPT,
                tools=[{"type": "web_search_20250305", "name": "web_search"}],
                messages=[{"role": "user", "content": EXTRACT_PROMPT.format(text=text[:3000])}]
            )
            raw = self._parse_json_from_response(msg)
            result = json.loads(raw)
            for e in result.get("entities", []):
                if not e.get("id"):
                    e["id"] = self._slug(e.get("label", "unknown"))
            for r in result.get("relations", []):
                r["source_doc"] = source_id
                r["source_url"] = source_url
                if not r.get("source_title"): r["source_title"] = None
            return result
        except Exception as e:
            print(f"[extractor] extract error: {e}")
            return {"entities": [], "relations": []}

    async def extract_batch(self, items: List[Dict], text_field: str = "summary") -> Dict:
        import asyncio
        all_entities: Dict[str, Dict] = {}
        all_relations: List[Dict] = []
        tasks = [
            self.extract(
                item.get(text_field, "") + " " + item.get("title", ""),
                source_id=item.get("id", ""),
                source_url=item.get("url", "")
            )
            for item in items[:12]
        ]
        results = []
        for task in tasks:
            result = await task
            results.append(result)
            await asyncio.sleep(3)
        for result in results:
            for entity in result.get("entities", []):
                eid = entity["id"]
                if eid not in all_entities:
                    all_entities[eid] = entity
                else:
                    existing = all_entities[eid]
                    existing["influence_score"] = max(
                        existing.get("influence_score", 0),
                        entity.get("influence_score", 0)
                    )
                    existing["hidden_score"] = max(
                        existing.get("hidden_score", 0),
                        entity.get("hidden_score", 0)
                    )
            all_relations.extend(result.get("relations", []))
        return {"entities": list(all_entities.values()), "relations": all_relations}

    async def generate_predictions(self, nodes: List[Dict], edges: List[Dict]) -> List[Dict]:
        if not nodes:
            return []
        key_nodes = sorted(nodes, key=lambda n: n.get("influence_score", 0) + n.get("hidden_score", 0), reverse=True)[:15]
        key_edges = sorted(edges, key=lambda e: e.get("hidden_score", 0), reverse=True)[:20]
        graph_data = json.dumps({
            "key_actors": key_nodes,
            "hidden_relations": key_edges,
            "total_nodes": len(nodes),
            "total_edges": len(edges),
        }, indent=2, ensure_ascii=False)
        try:
            msg = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2500,
                messages=[{"role": "user", "content": PREDICT_PROMPT.format(graph_data=graph_data)}]
            )
            raw = self._parse_json_from_response(msg)
            return json.loads(raw)
        except Exception as e:
            print(f"[extractor] prediction error: {e}")
            return []

    async def detect_hidden_networks(self, nodes: List[Dict], edges: List[Dict]) -> List[Dict]:
        if not nodes:
            return []
        hidden_nodes = [n for n in nodes if n.get("hidden_score", 0) > 40][:20]
        hidden_edges = [e for e in edges if e.get("hidden_score", 0) > 40][:25]
        if not hidden_nodes:
            hidden_nodes = nodes[:10]
        try:
            msg = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                messages=[{"role": "user", "content": HIDDEN_NETWORKS_PROMPT.format(
                    entities=json.dumps(hidden_nodes, ensure_ascii=False),
                    relations=json.dumps(hidden_edges, ensure_ascii=False)
                )}]
            )
            raw = self._parse_json_from_response(msg)
            return json.loads(raw)
        except Exception as e:
            print(f"[extractor] hidden networks error: {e}")
            return []

    async def generate_alerts(self, predictions: List[Dict]) -> List[Dict]:
        alerts = []
        for p in predictions:
            if p.get("confidence", 0) >= 60:
                alerts.append({
                    "id": f"alert_{p.get('id', '')}",
                    "title": p.get("title", ""),
                    "description": p.get("prediction", ""),
                    "severity": p.get("severity", "MEDIUM"),
                    "entities_involved": json.dumps(p.get("actors_involved", [])),
                    "predicted_impact": p.get("evidence", ""),
                    "timeframe": p.get("timeframe", ""),
                    "recommendation": f"Categoria: {p.get('category','')} · Confidence: {p.get('confidence',0)}%",
                    "hidden_network": p.get("hidden_network", ""),
                    "confidence": p.get("confidence", 0),
                })
        return alerts
