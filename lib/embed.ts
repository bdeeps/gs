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

function getEmbeddingServiceUrl() {
  return process.env.EMBEDDING_SERVICE_URL?.replace(/\/+$/, "");
}

function useLocalEmbeddingService() {
  return Boolean(getEmbeddingServiceUrl());
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

function assertEmbeddingDimensions(embedding: number[]) {
  if (embedding.length !== EXPECTED_EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Embedding dimension mismatch: expected ${EXPECTED_EMBEDDING_DIMENSIONS}, received ${embedding.length}.`
    );
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestWithRetries(
  request: (attempt: number) => Promise<Response>,
  options: { retryStatuses: number[]; label: string }
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await request(attempt);

      if (options.retryStatuses.includes(response.status)) {
        lastError = new Error(`${options.label} returned ${response.status}.`);
        await wait(attempt * 750);
        continue;
      }

      return response;
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

async function embedViaLocalService(input: string, prefix: "query" | "passage") {
  const base = getEmbeddingServiceUrl();
  if (!base) {
    throw new Error("EMBEDDING_SERVICE_URL is not configured.");
  }

  const response = await requestWithRetries(
    (attempt) =>
      fetchWithTimeout(
        `${base}/embed`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input, prefix })
        },
        EMBEDDING_TIMEOUT_MS * attempt
      ),
    { retryStatuses: [429, 502, 503, 504], label: "Embedding service" }
  );

  if (!response.ok) {
    throw new Error(`Embedding service rejected the request with ${response.status}.`);
  }

  const payload = (await response.json()) as { embedding?: number[] };
  if (!Array.isArray(payload.embedding) || payload.embedding.length === 0) {
    throw new Error("Embedding service returned an empty response.");
  }

  assertEmbeddingDimensions(payload.embedding);
  return payload.embedding;
}

async function embedViaHuggingFace(input: string, prefix: "query" | "passage") {
  if (!process.env.HF_API_KEY) {
    throw new Error(
      "HF_API_KEY is required when EMBEDDING_SERVICE_URL is unset. Set EMBEDDING_SERVICE_URL to your self-hosted E5 service instead."
    );
  }

  const endpoint = getFeatureExtractionUrl();

  const response = await requestWithRetries(
    () =>
      fetchWithTimeout(
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
      ),
    { retryStatuses: [429, 500, 502, 503, 504], label: "Embedding provider" }
  );

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
  assertEmbeddingDimensions(embedding);
  return embedding;
}

async function embedText(input: string, prefix: "query" | "passage") {
  if (useLocalEmbeddingService()) {
    return embedViaLocalService(input, prefix);
  }

  return embedViaHuggingFace(input, prefix);
}

export function embedQuery(input: string) {
  return embedText(input, "query");
}

export function embedPassage(input: string) {
  return embedText(input, "passage");
}

export function getEmbeddingBackend(): "local" | "huggingface" {
  return useLocalEmbeddingService() ? "local" : "huggingface";
}
