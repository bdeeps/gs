import { getPool } from "./db";

export type LiveDisplayMode = "timeline" | "single_english";
export type DisplayTemplate =
  | "darbar_focus"
  | "shabad_pair"
  | "shabad_pair_vertical"
  | "seva_stream"
  | "pothi_panel"
  | "maryada_minimal";
export type VerseMode = "single" | "two" | "streaming";
export type FontScale = "large" | "xlarge" | "projection";
export type CardStyle = "none" | "soft" | "elevated";

export type AppSettings = {
  enableHindiTranslation: boolean;
  displayTemplate: DisplayTemplate;
  verseMode: VerseMode;
  fontScale: FontScale;
  cardStyle: CardStyle;
  liveDisplayMode: LiveDisplayMode;
};

const DEFAULT_SETTINGS: AppSettings = {
  enableHindiTranslation: false,
  displayTemplate: "darbar_focus",
  verseMode: "single",
  fontScale: "xlarge",
  cardStyle: "soft",
  liveDisplayMode: "timeline"
};

function toLiveDisplayMode(value: unknown): LiveDisplayMode {
  return value === "single_english" ? "single_english" : "timeline";
}

function toDisplayTemplate(value: unknown): DisplayTemplate {
  switch (value) {
    case "darbar_focus":
    case "shabad_pair":
    case "shabad_pair_vertical":
    case "seva_stream":
    case "pothi_panel":
    case "maryada_minimal":
      return value;
    default:
      return DEFAULT_SETTINGS.displayTemplate;
  }
}

function toVerseMode(value: unknown): VerseMode {
  return value === "single" || value === "two" || value === "streaming"
    ? value
    : DEFAULT_SETTINGS.verseMode;
}

function toFontScale(value: unknown): FontScale {
  return value === "large" || value === "xlarge" || value === "projection"
    ? value
    : DEFAULT_SETTINGS.fontScale;
}

function toCardStyle(value: unknown): CardStyle {
  return value === "none" || value === "soft" || value === "elevated"
    ? value
    : DEFAULT_SETTINGS.cardStyle;
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
    display_template: string | null;
    verse_mode: string | null;
    font_scale: string | null;
    card_style: string | null;
    live_display_mode: string;
  }>(
    `
      SELECT
        enable_hindi_translation,
        display_template,
        verse_mode,
        font_scale,
        card_style,
        live_display_mode
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
    displayTemplate: toDisplayTemplate(row.display_template),
    verseMode: toVerseMode(row.verse_mode),
    fontScale: toFontScale(row.font_scale),
    cardStyle: toCardStyle(row.card_style),
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
    displayTemplate: input.displayTemplate
      ? toDisplayTemplate(input.displayTemplate)
      : current.displayTemplate,
    verseMode: input.verseMode ? toVerseMode(input.verseMode) : current.verseMode,
    fontScale: input.fontScale ? toFontScale(input.fontScale) : current.fontScale,
    cardStyle: input.cardStyle ? toCardStyle(input.cardStyle) : current.cardStyle,
    liveDisplayMode: input.liveDisplayMode ? toLiveDisplayMode(input.liveDisplayMode) : current.liveDisplayMode
  };

  const { rows } = await getPool().query<{
    enable_hindi_translation: boolean;
    display_template: string | null;
    verse_mode: string | null;
    font_scale: string | null;
    card_style: string | null;
    live_display_mode: string;
  }>(
    `
      INSERT INTO app_settings (
        id,
        enable_hindi_translation,
        display_template,
        verse_mode,
        font_scale,
        card_style,
        live_display_mode,
        updated_at
      )
      VALUES (1, $1, $2, $3, $4, $5, $6, now())
      ON CONFLICT (id) DO UPDATE SET
        enable_hindi_translation = EXCLUDED.enable_hindi_translation,
        display_template = EXCLUDED.display_template,
        verse_mode = EXCLUDED.verse_mode,
        font_scale = EXCLUDED.font_scale,
        card_style = EXCLUDED.card_style,
        live_display_mode = EXCLUDED.live_display_mode,
        updated_at = now()
      RETURNING
        enable_hindi_translation,
        display_template,
        verse_mode,
        font_scale,
        card_style,
        live_display_mode;
    `,
    [
      next.enableHindiTranslation,
      next.displayTemplate,
      next.verseMode,
      next.fontScale,
      next.cardStyle,
      next.liveDisplayMode
    ]
  );

  return {
    enableHindiTranslation: Boolean(rows[0]?.enable_hindi_translation),
    displayTemplate: toDisplayTemplate(rows[0]?.display_template),
    verseMode: toVerseMode(rows[0]?.verse_mode),
    fontScale: toFontScale(rows[0]?.font_scale),
    cardStyle: toCardStyle(rows[0]?.card_style),
    liveDisplayMode: toLiveDisplayMode(rows[0]?.live_display_mode)
  };
}

