from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import asyncio
from datetime import datetime

from scraper import PoliticalScraper
from extractor import InfluenceExtractor
from graph import UsaintDB
from scheduler import Scheduler

app = FastAPI(title="USAINT API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

db = UsaintDB()
scraper = PoliticalScraper()
extractor = InfluenceExtractor()
scheduler = Scheduler(scraper, extractor, db)


@app.on_event("startup")
async def startup():
    await db.init()
    asyncio.create_task(scheduler.run())


# ── Graph ────────────────────────────────────────────────────

@app.get("/api/graph")
async def get_graph(domain: Optional[str] = None, min_influence: int = 0):
    nodes = await db.get_nodes(domain)
    edges = await db.get_edges(domain)
    if min_influence > 0:
        nodes = [n for n in nodes if n.get("influence_score", 0) >= min_influence]
        node_ids = {n["id"] for n in nodes}
        edges = [e for e in edges if e["source"] in node_ids and e["target"] in node_ids]
    return {"nodes": nodes, "edges": edges}


@app.get("/api/node/{node_id}")
async def get_node(node_id: str):
    node = await db.get_node(node_id)
    if not node:
        raise HTTPException(404, "Node not found")
    relations = await db.get_node_relations(node_id)
    # Compute influence path
    influence_path = await db.get_influence_path(node_id)
    return {"node": node, "relations": relations, "influence_path": influence_path}


@app.get("/api/hidden-networks")
async def get_hidden_networks():
    """Return detected hidden influence clusters."""
    return await db.get_hidden_networks()


@app.get("/api/alerts")
async def get_alerts(severity: Optional[str] = None):
    return await db.get_alerts(severity)


@app.get("/api/influence-ranking")
async def get_influence_ranking():
    """Top actors ranked by hidden influence score."""
    return await db.get_influence_ranking()


@app.get("/api/search")
async def search(q: str):
    """Search nodes by name or description."""
    return await db.search_nodes(q)


@app.post("/api/refresh")
async def trigger_refresh(background_tasks: BackgroundTasks):
    background_tasks.add_task(scheduler.run_once)
    return {"status": "refresh started", "timestamp": datetime.utcnow().isoformat()}


@app.get("/api/stats")
async def get_stats():
    return await db.get_stats()


@app.get("/health")
async def health():
    return {"status": "ok"}
