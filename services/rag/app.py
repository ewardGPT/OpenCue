from fastapi import FastAPI
from pydantic import BaseModel
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct
from sentence_transformers import SentenceTransformer
import hashlib, os

COLL = os.environ.get("QDRANT_COLLECTION", "opencue")
client = QdrantClient(host="localhost", port=6333)
app = FastAPI()
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

def ensure_collection():
    try:
        client.get_collection(COLL)
    except:
        client.recreate_collection(
            collection_name=COLL,
            vectors_config=VectorParams(size=384, distance=Distance.COSINE)
        )

class IndexIn(BaseModel):
    texts: list[str]
    sources: list[str] | None = None

class SearchIn(BaseModel):
    query: str
    top_k: int = 4

@app.on_event("startup")
def startup():
    ensure_collection()

@app.post("/index")
def index(inp: IndexIn):
    embs = model.encode(inp.texts, normalize_embeddings=True)
    points = []
    for i, (t, e) in enumerate(zip(inp.texts, embs)):
        pid = int(hashlib.md5((inp.sources[i] if inp.sources else t).encode()).hexdigest()[:12], 16)
        points.append(PointStruct(id=pid, vector=e.tolist(), payload={"text": t, "source": (inp.sources[i] if inp.sources else "memory")}))

    client.upsert(collection_name=COLL, points=points)
    return {"ok": True, "count": len(points)}

@app.post("/search")
def search(inp: SearchIn):
    q = model.encode([inp.query], normalize_embeddings=True)[0].tolist()
    res = client.search(collection_name=COLL, query_vector=q, limit=inp.top_k)
    hits = [{"text": h.payload.get("text",""), "score": float(h.score), "meta": {"source": h.payload.get("source")}} for h in res]
    return {"hits": hits}
