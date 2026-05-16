/**
 * Normalize EMBEDDING_SERVICE_URL for fetch().
 * Railway's RAILWAY_PUBLIC_DOMAIN is often set without https:// — Node needs a full URL.
 */
export function normalizeEmbeddingServiceUrl(raw?: string) {
  const value = raw?.trim();
  if (!value) {
    return undefined;
  }

  if (value === "internal" || value === "sidecar") {
    const port = process.env.EMBED_PORT || "8100";
    return `http://127.0.0.1:${port}`;
  }

  let url = value;
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  return url.replace(/\/+$/, "");
}

export function getEmbeddingServiceUrl() {
  return normalizeEmbeddingServiceUrl(process.env.EMBEDDING_SERVICE_URL);
}
