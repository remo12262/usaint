import asyncio
from datetime import datetime

REFRESH_INTERVAL = 24 * 60 * 60  # 24 hours


class Scheduler:

    def __init__(self, scraper, extractor, db):
        self.scraper = scraper
        self.extractor = extractor
        self.db = db
        self.last_run = None

    async def run_once(self):
        print(f"[scheduler] USAINT refresh started at {datetime.utcnow().isoformat()}")
        try:
            # 1. Fetch raw political data
            data = await self.scraper.fetch_all()
            print(f"[scheduler] Fetched: {len(data['news'])} news, {len(data['lobby'])} lobby, {len(data['peps'])} PEPs")

            # 2. Extract influence entities from news
            if data["news"]:
                result = await self.extractor.extract_batch(data["news"])
                await self.db.upsert_entities(result["entities"])
                await self.db.upsert_relations(result["relations"])
                print(f"[scheduler] Extracted {len(result['entities'])} entities, {len(result['relations'])} relations")

            # 3. Get current graph state
            nodes = await self.db.get_nodes()
            edges = await self.db.get_edges()

            # 4. Generate predictive analysis
            predictions = await self.extractor.generate_predictions(nodes, edges)
            if predictions:
                await self.db.upsert_predictions(predictions)
                print(f"[scheduler] Generated {len(predictions)} predictions")

            # 5. Detect hidden influence networks
            hidden = await self.extractor.detect_hidden_networks(nodes, edges)
            if hidden:
                await self.db.upsert_hidden_networks(hidden)
                print(f"[scheduler] Detected {len(hidden)} hidden networks")

            # 6. Convert high-confidence predictions to alerts
            alerts = await self.extractor.generate_alerts(predictions)
            if alerts:
                await self.db.upsert_alerts(alerts)
                print(f"[scheduler] Generated {len(alerts)} alerts")

            self.last_run = datetime.utcnow().isoformat()
            print(f"[scheduler] USAINT refresh complete at {self.last_run}")

        except Exception as e:
            print(f"[scheduler] Error: {e}")

    async def run(self):
        """Runs once at startup. Use POST /api/refresh to trigger manually."""
        await self.run_once()
        # await asyncio.sleep(REFRESH_INTERVAL)  # disabled: manual-only via POST /api/refresh
