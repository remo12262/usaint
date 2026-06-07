import httpx
import feedparser
from datetime import datetime, timedelta
from typing import List, Dict

NEWS_SOURCES = [
    "https://rss.politico.com/politics-news.xml",
    "https://thehill.com/homenews/feed/",
    "https://feeds.npr.org/1014/rss.xml",
    "http://feeds.washingtonpost.com/rss/politics",
    "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml",
    "https://api.axios.com/feed/",
]

KEYWORDS = [
    "lobbying", "super PAC", "campaign finance", "donor", "fundraising",
    "think tank", "foundation", "donation", "earmark", "nomination",
    "revolving door", "conflict of interest", "congressman", "senator", "committee",
    "executive order", "Supreme Court", "midterms", "primary", "filibuster",
    "Trump", "Vance", "Johnson", "Thune", "Schumer", "Jeffries",
    "DeSantis", "Newsom", "geopolitics", "NATO", "China",
]


class PoliticalScraper:

    async def fetch_news(self) -> List[Dict]:
        articles = []
        for url in NEWS_SOURCES:
            try:
                feed = feedparser.parse(url)
                for entry in feed.entries[:25]:
                    title = entry.get("title", "")
                    summary = entry.get("summary", "")
                    text = f"{title} {summary}".lower()
                    if any(kw.lower() in text for kw in KEYWORDS):
                        articles.append({
                            "id": entry.get("id", entry.get("link", "")),
                            "title": title,
                            "summary": summary[:800],
                            "url": entry.get("link", ""),
                            "published": entry.get("published", ""),
                            "source": feed.feed.get("title", url),
                        })
            except Exception as e:
                print(f"[scraper] RSS error {url}: {e}")
        return articles

    async def fetch_eu_parliament(self) -> List[Dict]:
        """Fetch recent EU Parliament voting records via open data API."""
        url = "https://data.europarl.europa.eu/api/v1/votes"
        params = {"format": "application/ld+json", "limit": 20}
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.get(url, params=params)
                data = r.json()
                votes = []
                for item in data.get("data", [])[:20]:
                    votes.append({
                        "id": item.get("id", ""),
                        "title": item.get("label", ""),
                        "date": item.get("date", ""),
                        "type": "EU_VOTE",
                    })
                return votes
        except Exception as e:
            print(f"[scraper] EU Parliament error: {e}")
            return []

    async def fetch_lobbyfacts(self) -> List[Dict]:
        """Fetch EU lobby transparency register data."""
        url = "https://api.lobbyfacts.eu/api/1/entity"
        params = {"limit": 30, "format": "json"}
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.get(url, params=params)
                data = r.json()
                entities = []
                for item in data.get("results", []):
                    entities.append({
                        "id": f"lobby_{item.get('id','')}",
                        "name": item.get("name", ""),
                        "type": "LobbyGroup",
                        "country": item.get("country", {}).get("code", ""),
                        "budget": item.get("turnover_absolute", 0),
                        "employees": item.get("fte_lobby", 0),
                    })
                return entities
        except Exception as e:
            print(f"[scraper] LobbyFacts error: {e}")
            return []

    async def fetch_opensanctions_political(self) -> List[Dict]:
        """Fetch politically exposed persons (PEP) from OpenSanctions."""
        url = "https://api.opensanctions.org/search/default"
        params = {"q": "politician minister parliament Italy Europe", "limit": 20, "schema": "Person"}
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.get(url, params=params)
                data = r.json()
                persons = []
                for item in data.get("results", []):
                    persons.append({
                        "id": item.get("id", ""),
                        "name": item.get("caption", ""),
                        "country": item.get("properties", {}).get("country", [None])[0],
                        "position": item.get("properties", {}).get("position", [None])[0],
                        "type": "Person",
                    })
                return persons
        except Exception as e:
            print(f"[scraper] OpenSanctions PEP error: {e}")
            return []

    async def fetch_all(self) -> Dict:
        import asyncio
        news, votes, lobby, peps = await asyncio.gather(
            self.fetch_news(),
            self.fetch_eu_parliament(),
            self.fetch_lobbyfacts(),
            self.fetch_opensanctions_political(),
        )
        return {
            "news": news,
            "votes": votes,
            "lobby": lobby,
            "peps": peps,
            "fetched_at": datetime.utcnow().isoformat(),
        }
