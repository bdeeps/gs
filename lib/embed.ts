import {
  EMBEDDING_TIMEOUT_MS,
  EXPECTED_EMBEDDING_DIMENSIONS
} from "./config";
import { fetchWithTimeout, isAbortError } from "./http";

const DEFAULT_MODEL = "intfloat/multilingual-e5-large";

type HuggingFaceEmbedding = number[] | number[][] | number[][][];

function getEmbeddingModel() {
  return process.env.EMBEDDING_MODEL || DEFAULT_MODEL;
}

/**
 * Hugging Face retired the legacy serverless URL
 * `https://api-inference.huggingface.co/pipeline/feature-extraction/...` (it now returns 404).
 * Current stack uses the router + hf-inference path (same as @huggingface/inference).
 *
 * @see https://huggingface.co/docs/api-inference/en/quicktour
 */
function getFeatureExtractionUrl() {
  const base = (process.env.HF_INFERENCE_BASE_URL || "https://router.huggingface.co/hf-inference").replace(
    /\/+$/,
    ""
  );
  const model = encodeURIComponent(getEmbeddingModel());
  return `${base}/models/${model}/pipeline/feature-extraction`;
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

  const endpoint = getFeatureExtractionUrl();
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        endpoint,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.HF_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            inputs: `${prefix}: ${input}`,
            parameters: { normalize: true }
          })
        },
        EMBEDDING_TIMEOUT_MS
      );

      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`Embedding provider returned ${response.status}.`);
        await wait(attempt * 750);
        continue;
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "Hugging Face rejected the API key. Create a token with permission to call Inference Providers, set it as HF_API_KEY, and redeploy."
        );
      }

      if (!response.ok) {
        throw new Error(`Embedding provider rejected the request with ${response.status}.`);
      }

      const payload = (await response.json()) as HuggingFaceEmbedding;
      const embedding = normalizeEmbedding(payload);
      if (embedding.length !== EXPECTED_EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Embedding dimension mismatch: expected ${EXPECTED_EMBEDDING_DIMENSIONS}, received ${embedding.length}.`
        );
      }

      return embedding;
    } catch (error) {
      lastError = error;
      if (!isAbortError(error) && attempt === 3) {
        break;
      }

      await wait(attempt * 750);
    }
  }

  if (isAbortError(lastError)) {
    throw new Error("Embedding service timed out. Please try again.");
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Embedding service is unavailable.");
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function embedQuery(input: string) {
  return embedText(input, "query");
}

export function embedPassage(input: string) {
  return embedText(input, "passage");
}
