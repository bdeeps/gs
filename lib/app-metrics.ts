import { getPool } from "./db";

export type AppMetrics = {
  totalSearchRequests: number;
  totalLiveRequests: number;
  totalVersesMatched: number;
  totalTranslationsRequested: number;
  totalTranslationsSucceeded: number;
};

const ZERO_METRICS: AppMetrics = {
  totalSearchRequests: 0,
  totalLiveRequests: 0,
  totalVersesMatched: 0,
  totalTranslationsRequested: 0,
  totalTranslationsSucceeded: 0
};

async function ensureMetricsRow() {
  await getPool().query(
    `
      INSERT INTO app_metrics (id)
      VALUES (1)
      ON CONFLICT (id) DO NOTHING;
    `
  );
}

export async function getAppMetrics(): Promise<AppMetrics> {
  try {
    await ensureMetricsRow();
    const { rows } = await getPool().query<{
      total_search_requests: number;
      total_live_requests: number;
      total_verses_matched: number;
      total_translations_requested: number;
      total_translations_succeeded: number;
    }>(
      `
        SELECT
          total_search_requests,
          total_live_requests,
          total_verses_matched,
          total_translations_requested,
          total_translations_succeeded
        FROM app_metrics
        WHERE id = 1
        LIMIT 1;
      `
    );

    const row = rows[0];
    if (!row) {
      return ZERO_METRICS;
    }

    return {
      totalSearchRequests: Number(row.total_search_requests) || 0,
      totalLiveRequests: Number(row.total_live_requests) || 0,
      totalVersesMatched: Number(row.total_verses_matched) || 0,
      totalTranslationsRequested: Number(row.total_translations_requested) || 0,
      totalTranslationsSucceeded: Number(row.total_translations_succeeded) || 0
    };
  } catch (error) {
    console.error("[metrics] failed to read metrics", error);
    return ZERO_METRICS;
  }
}

export async function incrementAppMetrics(input: Partial<AppMetrics>) {
  try {
    await ensureMetricsRow();
    await getPool().query(
      `
        UPDATE app_metrics
        SET
          total_search_requests = total_search_requests + $2::int,
          total_live_requests = total_live_requests + $3::int,
          total_verses_matched = total_verses_matched + $4::int,
          total_translations_requested = total_translations_requested + $5::int,
          total_translations_succeeded = total_translations_succeeded + $6::int,
          updated_at = now()
        WHERE id = $1::smallint
      `,
      [
        1,
        input.totalSearchRequests ?? 0,
        input.totalLiveRequests ?? 0,
        input.totalVersesMatched ?? 0,
        input.totalTranslationsRequested ?? 0,
        input.totalTranslationsSucceeded ?? 0
      ]
    );
  } catch (error) {
    console.error("[metrics] failed to update metrics", error);
  }
}

