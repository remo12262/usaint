import json
from typing import List, Dict, Optional
from datetime import datetime


class UsaintDB:
    def __init__(self):
        self.nodes: Dict[str, Dict] = {}
        self.edges: Dict[str, Dict] = {}
        self.predictions: Dict[str, Dict] = {}
        self.alerts: Dict[str, Dict] = {}
        self.hidden_networks: Dict[str, Dict] = {}

    async def init(self):
        if not self.nodes:
            self._seed_baseline()

    def _seed_baseline(self):
        now = datetime.utcnow().isoformat()
        nodes = [
            ("trump_d",      "Donald Trump",                 "PolicyMaker",         "political", "US", "Presidente USA. Leader del movimento MAGA. Asse con tech e media conservatori.", 98, 15),
            ("vance_jd",     "JD Vance",                     "PolicyMaker",         "political", "US", "Vicepresidente USA. Ponte tra base MAGA e nuova destra tech.", 80, 25),
            ("johnson_m",    "Mike Johnson",                 "PolicyMaker",         "political", "US", "Speaker della Camera. Gestisce l'agenda legislativa repubblicana.", 75, 20),
            ("thune_j",      "John Thune",                   "PolicyMaker",         "political", "US", "Leader della maggioranza al Senato. Mediatore interno GOP.", 72, 22),
            ("schumer_c",    "Chuck Schumer",                "PolicyMaker",         "political", "US", "Leader della minoranza al Senato. Stratega del Partito Democratico.", 70, 18),
            ("jeffries_h",   "Hakeem Jeffries",              "PolicyMaker",         "political", "US", "Leader della minoranza alla Camera. Volto della nuova generazione Dem.", 68, 15),
            ("gop_us",       "Partito Repubblicano",         "PoliticalParty",      "political", "US", "Maggioranza al Congresso e alla Casa Bianca. Identità ridefinita da Trump.", 90, 18),
            ("dem_us",       "Partito Democratico",          "PoliticalParty",      "political", "US", "Principale forza di opposizione. Ricostruzione di coalizione e messaggio.", 82, 18),
            ("maga_inc",     "MAGA Inc.",                    "PAC",                 "political", "US", "Super PAC pro-Trump. Canale principale di raccolta fondi del movimento MAGA.", 75, 70),
            ("future_fwd",   "Future Forward USA",           "PAC",                 "political", "US", "Super PAC democratico. Finanziato da grandi donatori tech e Wall Street.", 65, 65),
            ("heritage_f",   "Heritage Foundation",          "LobbyGroup",          "political", "US", "Think tank conservatore. Autore di Project 2025, framework per nomine e policy.", 78, 60),
            ("nra_us",       "NRA",                          "LobbyGroup",          "political", "US", "Lobby delle armi. Influenza storica sulla legislazione sul Secondo Emendamento.", 65, 55),
            ("aipac_us",     "AIPAC",                        "PAC",                 "political", "US", "Comitato pro-Israele. Tra i finanziatori di campagne più potenti degli USA.", 80, 68),
            ("fox_news",     "Fox News",                     "MediaOutlet",         "political", "US", "Network conservatore. Agenda-setting per l'elettorato repubblicano.", 85, 50),
            ("msnbc_us",     "MSNBC",                        "MediaOutlet",         "political", "US", "Network progressista. Copertura allineata all'establishment democratico.", 70, 45),
            ("musk_e",       "Elon Musk",                    "Person",              "political", "US", "CEO Tesla/SpaceX/X. Mega-donatore e consigliere informale della Casa Bianca.", 92, 78),
            ("koch_ind",     "Koch Industries",              "Corporation",         "political", "US", "Conglomerato energetico. Rete di finanziamento libertarian e GOP.", 75, 72),
            ("blackrock_us", "BlackRock",                    "InvestorInstitution", "political", "US", "Maggiore asset manager mondiale. Influenza su policy economiche e difesa.", 85, 70),
            ("pentagon_us",  "Pentagono / Dept. of Defense", "GovernmentAgency",    "political", "US", "Dipartimento della Difesa USA. Hub primario del lobbying sulla difesa.", 88, 35),
            ("thiel_p",      "Peter Thiel",                  "Person",              "political", "US", "Investitore. Finanziatore di reti tech-conservatrici e nuova destra.", 72, 75),
        ]
        edges = [
            ("e01", "fox_news",     "trump_d",     "CITA_POSITIVO",     "Fox News storicamente allineato a Trump. Copertura favorevole costante.", 80, 40, "2024-11"),
            ("e02", "msnbc_us",     "trump_d",     "CITA_NEGATIVO",     "MSNBC critica sistematicamente l'amministrazione Trump.", 65, 30, "2025-01"),
            ("e03", "maga_inc",     "trump_d",     "FINANZIA_CAMPAGNA", "Il Super PAC raccoglie fondi per campagne e iniziative legate a Trump.", 85, 35, "2024-06"),
            ("e04", "musk_e",       "maga_inc",    "DONA_A_PAC",        "Musk tra i maggiori donatori del Super PAC pro-Trump.", 88, 60, "2024-08"),
            ("e05", "musk_e",       "trump_d",     "RETE_INFORMALE",    "Rapporto informale di consulenza su tagli federali e regolazione tech.", 85, 70, "2025-01"),
            ("e06", "thiel_p",      "vance_jd",    "REVOLVING_DOOR",    "Thiel mentore politico di Vance, lo ha lanciato in politica.", 78, 65, "2021-01"),
            ("e07", "heritage_f",   "trump_d",     "LOBBYING_SU",       "Heritage Foundation autrice di Project 2025, framework per nomine e policy.", 80, 58, "2024-01"),
            ("e08", "aipac_us",     "johnson_m",   "FINANZIA_CAMPAGNA", "AIPAC finanzia campagne di membri chiave della leadership del Congresso.", 75, 55, "2024-03"),
            ("e09", "aipac_us",     "jeffries_h",  "FINANZIA_CAMPAGNA", "AIPAC sostiene anche figure democratiche filo-Israele.", 60, 50, "2024-03"),
            ("e10", "nra_us",       "gop_us",      "ALLEATO_DI",        "NRA storicamente alleata del Partito Repubblicano sulle armi.", 70, 20, "2016-01"),
            ("e11", "koch_ind",     "heritage_f",  "FINANZIA_OCCULTO",  "Rete Koch finanzia indirettamente think tank e reti policy conservatrici.", 75, 75, "2020-01"),
            ("e12", "blackrock_us", "pentagon_us", "LOBBYING_SU",       "BlackRock tra i principali gestori di fondi pensione legati alla difesa.", 65, 68, "2023-05"),
            ("e13", "future_fwd",   "dem_us",      "FINANZIA_CAMPAGNA", "Future Forward è il canale principale di raccolta fondi per i Democratici.", 70, 50, "2024-02"),
            ("e14", "thiel_p",      "future_fwd",  "OPPOSTO_A",         "Thiel finanzia reti contrapposte all'establishment progressista.", 55, 30, "2024-01"),
            ("e15", "pentagon_us",  "trump_d",     "NOMINA",            "Trump nomina i vertici del Pentagono allineati alla sua agenda.", 80, 25, "2025-01"),
            ("e16", "trump_d",      "gop_us",      "MEMBRO_DI",         "Trump guida e ridefinisce l'identità del Partito Repubblicano.", 92, 10, "2016-01"),
            ("e17", "schumer_c",    "dem_us",      "MEMBRO_DI",         "Schumer è il leader storico della delegazione democratica al Senato.", 75, 10, "2017-01"),
            ("e18", "vance_jd",     "trump_d",     "ALLEATO_DI",        "Vance scelto come vicepresidente: alleanza centrale dell'amministrazione.", 88, 15, "2024-07"),
            ("e19", "musk_e",       "fox_news",    "CONTROLLA_MEDIA",   "Musk e la piattaforma X amplificano e si allineano alla narrativa Fox.", 70, 60, "2024-10"),
            ("e20", "koch_ind",     "thune_j",     "LOBBYING_SU",       "Rete Koch fa lobbying sull'agenda energetica e fiscale al Senato.", 68, 62, "2023-09"),
        ]
        for n in nodes:
            self.nodes[n[0]] = {
                "id": n[0], "label": n[1], "type": n[2], "domain": n[3],
                "country": n[4], "description": n[5],
                "influence_score": n[6], "hidden_score": n[7],
                "created_at": now, "updated_at": now,
            }
        for e in edges:
            self.edges[e[0]] = {
                "id": e[0], "source": e[1], "target": e[2], "type": e[3],
                "fact": e[4], "influence_score": e[5], "hidden_score": e[6],
                "source_doc": "", "date": e[7], "created_at": now,
            }

    async def get_nodes(self, domain=None) -> List[Dict]:
        nodes = list(self.nodes.values())
        return sorted(nodes, key=lambda n: n.get("influence_score", 0), reverse=True)

    async def get_edges(self, domain=None) -> List[Dict]:
        edges = list(self.edges.values())
        return sorted(edges, key=lambda e: e.get("hidden_score", 0), reverse=True)

    async def get_node(self, node_id: str) -> Optional[Dict]:
        return self.nodes.get(node_id)

    async def get_node_relations(self, node_id: str) -> List[Dict]:
        results = []
        for e in self.edges.values():
            if e["source"] == node_id or e["target"] == node_id:
                src = self.nodes.get(e["source"], {})
                tgt = self.nodes.get(e["target"], {})
                results.append({
                    **e,
                    "source_label": src.get("label", ""),
                    "source_type":  src.get("type", ""),
                    "target_label": tgt.get("label", ""),
                    "target_type":  tgt.get("type", ""),
                })
        return sorted(results, key=lambda e: e.get("hidden_score", 0), reverse=True)

    async def get_influence_path(self, node_id: str) -> List[Dict]:
        neighbour_ids = set()
        for e in self.edges.values():
            if e["source"] == node_id:
                neighbour_ids.add(e["target"])
            elif e["target"] == node_id:
                neighbour_ids.add(e["source"])
        neighbours = [self.nodes[nid] for nid in neighbour_ids if nid in self.nodes]
        return sorted(neighbours, key=lambda n: n.get("influence_score", 0), reverse=True)[:10]

    async def get_predictions(self) -> List[Dict]:
        preds = sorted(
            self.predictions.values(),
            key=lambda p: (p.get("confidence", 0), p.get("created_at", "")),
            reverse=True,
        )
        return preds[:30]

    async def get_hidden_networks(self) -> List[Dict]:
        return sorted(
            self.hidden_networks.values(),
            key=lambda h: h.get("opacity_score", 0),
            reverse=True,
        )

    async def get_alerts(self, severity=None) -> List[Dict]:
        alerts = list(self.alerts.values())
        if severity:
            alerts = [a for a in alerts if a.get("severity") == severity]
        return sorted(
            alerts,
            key=lambda a: (a.get("confidence", 0), a.get("created_at", "")),
            reverse=True,
        )[:50]

    async def get_influence_ranking(self) -> List[Dict]:
        nodes = sorted(
            self.nodes.values(),
            key=lambda n: (n.get("influence_score", 0) + n.get("hidden_score", 0)) / 2,
            reverse=True,
        )[:20]
        return [
            {
                "id": n["id"], "label": n["label"], "type": n["type"],
                "country": n.get("country"),
                "influence_score": n.get("influence_score", 0),
                "hidden_score": n.get("hidden_score", 0),
                "combined_score": (n.get("influence_score", 0) + n.get("hidden_score", 0)) // 2,
            }
            for n in nodes
        ]

    async def search_nodes(self, q: str) -> List[Dict]:
        q_lower = q.lower()
        matches = [
            n for n in self.nodes.values()
            if q_lower in n.get("label", "").lower()
            or q_lower in n.get("description", "").lower()
        ]
        return sorted(matches, key=lambda n: n.get("influence_score", 0), reverse=True)[:20]

    async def get_stats(self) -> Dict:
        unread = sum(1 for a in self.alerts.values() if not a.get("is_read"))
        hi_opacity = sum(1 for n in self.nodes.values() if n.get("hidden_score", 0) > 60)
        return {
            "nodes": len(self.nodes),
            "edges": len(self.edges),
            "predictions": len(self.predictions),
            "unread_alerts": unread,
            "hidden_networks": len(self.hidden_networks),
            "high_opacity_actors": hi_opacity,
        }

    async def upsert_entities(self, entities: List[Dict]):
        now = datetime.utcnow().isoformat()
        for e in entities:
            eid = e.get("id")
            if not eid:
                continue
            if eid in self.nodes:
                self.nodes[eid]["influence_score"] = max(
                    self.nodes[eid].get("influence_score", 0), e.get("influence_score", 0)
                )
                self.nodes[eid]["hidden_score"] = max(
                    self.nodes[eid].get("hidden_score", 0), e.get("hidden_score", 0)
                )
                self.nodes[eid]["updated_at"] = now
            else:
                self.nodes[eid] = {
                    "id": eid, "label": e.get("label", ""),
                    "type": e.get("type", "Organization"), "domain": "political",
                    "country": e.get("country"), "description": e.get("description", ""),
                    "influence_score": e.get("influence_score", 0),
                    "hidden_score": e.get("hidden_score", 0),
                    "created_at": now, "updated_at": now,
                }

    async def upsert_relations(self, relations: List[Dict]):
        now = datetime.utcnow().isoformat()
        for r in relations:
            rid = f"{r.get('source')}_{r.get('target')}_{r.get('type')}"
            if rid in self.edges:
                self.edges[rid]["hidden_score"] = max(
                    self.edges[rid].get("hidden_score", 0), r.get("hidden_score", 0)
                )
            else:
                self.edges[rid] = {
                    "id": rid, "source": r.get("source"), "target": r.get("target"),
                    "type": r.get("type", "COLLEGATO_A"), "fact": r.get("fact"),
                    "influence_score": r.get("influence_score", 0),
                    "hidden_score": r.get("hidden_score", 0),
                    "source_doc": r.get("source_doc", ""), "date": r.get("date"),
                    "created_at": now,
                }

    async def upsert_predictions(self, predictions: List[Dict]):
        now = datetime.utcnow().isoformat()
        for p in predictions:
            pid = p.get("id", f"pred_{now}")
            self.predictions[pid] = {
                "id": pid, "title": p.get("title"), "prediction": p.get("prediction"),
                "actors_involved": json.dumps(p.get("actors_involved", [])),
                "hidden_network": p.get("hidden_network", ""),
                "confidence": p.get("confidence", 0), "timeframe": p.get("timeframe", ""),
                "evidence": p.get("evidence", ""), "trigger_event": p.get("trigger_event", ""),
                "impact_score": p.get("impact_score", 0),
                "category": p.get("category", "POLICY"), "severity": p.get("severity", "MEDIUM"),
                "created_at": now, "is_verified": 0,
            }

    async def upsert_hidden_networks(self, networks: List[Dict]):
        now = datetime.utcnow().isoformat()
        for hn in networks:
            hid = hn.get("id")
            if not hid:
                continue
            self.hidden_networks[hid] = {
                "id": hid, "name": hn.get("name"), "description": hn.get("description"),
                "core_actors": json.dumps(hn.get("core_actors", [])),
                "mechanism": hn.get("mechanism", ""),
                "opacity_score": hn.get("opacity_score", 0),
                "reach_score": hn.get("reach_score", 0),
                "policy_areas": json.dumps(hn.get("policy_areas", [])),
                "created_at": now,
            }

    async def upsert_alerts(self, alerts: List[Dict]):
        now = datetime.utcnow().isoformat()
        for a in alerts:
            aid = a.get("id", f"alert_{now}")
            self.alerts[aid] = {
                "id": aid, "title": a.get("title"), "description": a.get("description"),
                "severity": a.get("severity", "MEDIUM"),
                "entities_involved": a.get("entities_involved", "[]"),
                "predicted_impact": a.get("predicted_impact"),
                "timeframe": a.get("timeframe"), "recommendation": a.get("recommendation"),
                "hidden_network": a.get("hidden_network", ""),
                "confidence": a.get("confidence", 0),
                "created_at": now, "is_read": False,
            }
