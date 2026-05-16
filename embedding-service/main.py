"""
Self-hosted intfloat/multilingual-e5-large embeddings.

Matches the gs app's Hugging Face calls: "{prefix}: {text}" with L2-normalized
1024-d vectors so existing pgvector rows do not need re-seeding.
"""

import os
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

MODEL_NAME = os.getenv("EMBEDDING_MODEL", "intfloat/multilingual-e5-large")
EXPECTED_DIM = 1024

_model: SentenceTransformer | None = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global _model
    print(f"Loading embedding model {MODEL_NAME}...")
    _model = SentenceTransformer(MODEL_NAME)
    dim = _model.get_sentence_embedding_dimension()
    if dim != EXPECTED_DIM:
        raise RuntimeError(f"Expected {EXPECTED_DIM} dimensions, model has {dim}")
    print(f"Model ready ({dim} dimensions).")
    yield


app = FastAPI(title="Gurbani Embedding Service", lifespan=lifespan)


class EmbedRequest(BaseModel):
    input: str = Field(min_length=1, max_length=4000)
    prefix: Literal["query", "passage"]


class EmbedResponse(BaseModel):
    embedding: list[float]
    dimensions: int
    model: str


@app.get("/health")
def health():
    return {
        "ok": _model is not None,
        "model": MODEL_NAME,
        "dimensions": EXPECTED_DIM,
    }


@app.post("/embed", response_model=EmbedResponse)
def embed(body: EmbedRequest):
    if _model is None:
        raise HTTPException(status_code=503, detail="Model is still loading.")

    text = f"{body.prefix}: {body.input.strip()}"
    vector = _model.encode(text, normalize_embeddings=True)
    embedding = vector.tolist()

    if len(embedding) != EXPECTED_DIM:
        raise HTTPException(
            status_code=500,
            detail=f"Embedding dimension mismatch: expected {EXPECTED_DIM}, got {len(embedding)}",
        )

    return EmbedResponse(embedding=embedding, dimensions=len(embedding), model=MODEL_NAME)
