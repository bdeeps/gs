const DEFAULT_MODEL = "intfloat/multilingual-e5-large";

type HuggingFaceEmbedding = number[] | number[][] | number[][][];

function getEmbeddingModel() {
  return process.env.EMBEDDING_MODEL || DEFAULT_MODEL;
}

function normalizeEmbedding(payload: HuggingFaceEmbedding): number[] {
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error("Embedding provider returned an empty response.");
  }

  if (typeof payload[0] === "number") {
    return payload as number[];
  }

  const first = payload[0] as number[] | number[][];
  if (Array.isArray(first) && typeof first[0] === "number") {
    const rows = payload as number[][];
    if (rows.length === 1) {
      return rows[0];
    }

    return meanPool(rows);
  }

  const rows = first as number[][];
  if (Array.isArray(rows[0]) && typeof rows[0][0] === "number") {
    return meanPool(rows);
  }

  throw new Error("Could not parse embedding response.");
}

function meanPool(rows: number[][]) {
  const dimensions = rows[0]?.length;
  if (!dimensions) {
    throw new Error("Embedding provider returned an invalid token matrix.");
  }

  const totals = new Array<number>(dimensions).fill(0);
  for (const row of rows) {
    for (let index = 0; index < dimensions; index += 1) {
      totals[index] += row[index] || 0;
    }
  }

  const pooled = totals.map((value) => value / rows.length);
  const norm = Math.hypot(...pooled);
  return norm > 0 ? pooled.map((value) => value / norm) : pooled;
}

async function embedText(input: string, prefix: "query" | "passage") {
  if (!process.env.HF_API_KEY) {
    throw new Error("HF_API_KEY is required for embeddings.");
  }

  const response = await fetch(
    `https://api-inference.huggingface.co/pipeline/feature-extraction/${getEmbeddingModel()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: `${prefix}: ${input}`,
        parameters: { pooling: "mean", normalize: true },
        options: { wait_for_model: true }
      })
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Embedding request failed: ${message}`);
  }

  const payload = (await response.json()) as HuggingFaceEmbedding;
  return normalizeEmbedding(payload);
}

export function embedQuery(input: string) {
  return embedText(input, "query");
}

export function embedPassage(input: string) {
  return embedText(input, "passage");
}
