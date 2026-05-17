import { getPool } from "./db";

export type LiveDisplayMode = "timeline" | "single_english";

export type AppSettings = {
  enableHindiTranslation: boolean;
  liveDisplayMode: LiveDisplayMode;
};

const DEFAULT_SETTINGS: AppSettings = {
  enableHindiTranslation: false,
  liveDisplayMode: "timeline"
};

function toLiveDisplayMode(value: unknown): LiveDisplayMode {
  return value === "single_english" ? "single_english" : "timeline";
}

export async function getAppSettings(): Promise<AppSettings> {
  await getPool().query(
    `
      INSERT INTO app_settings (id)
      VALUES (1)
      ON CONFLICT (id) DO NOTHING;
    `
  );

  const { rows } = await getPool().query<{
    enable_hindi_translation: boolean;
    live_display_mode: string;
  }>(
    `
      SELECT enable_hindi_translation, live_display_mode
      FROM app_settings
      WHERE id = 1
      LIMIT 1;
    `
  );

  const row = rows[0];
  if (!row) {
    return DEFAULT_SETTINGS;
  }

  return {
    enableHindiTranslation: Boolean(row.enable_hindi_translation),
    liveDisplayMode: toLiveDisplayMode(row.live_display_mode)
  };
}

export async function updateAppSettings(input: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getAppSettings();
  const next: AppSettings = {
    enableHindiTranslation:
      typeof input.enableHindiTranslation === "boolean"
        ? input.enableHindiTranslation
        : current.enableHindiTranslation,
    liveDisplayMode: input.liveDisplayMode ? toLiveDisplayMode(input.liveDisplayMode) : current.liveDisplayMode
  };

  const { rows } = await getPool().query<{
    enable_hindi_translation: boolean;
    live_display_mode: string;
  }>(
    `
      INSERT INTO app_settings (id, enable_hindi_translation, live_display_mode, updated_at)
      VALUES (1, $1, $2, now())
      ON CONFLICT (id) DO UPDATE SET
        enable_hindi_translation = EXCLUDED.enable_hindi_translation,
        live_display_mode = EXCLUDED.live_display_mode,
        updated_at = now()
      RETURNING enable_hindi_translation, live_display_mode;
    `,
    [next.enableHindiTranslation, next.liveDisplayMode]
  );

  return {
    enableHindiTranslation: Boolean(rows[0]?.enable_hindi_translation),
    liveDisplayMode: toLiveDisplayMode(rows[0]?.live_display_mode)
  };
}

