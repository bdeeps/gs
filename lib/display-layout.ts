import type { DisplayTemplate, LiveDisplayMode, VerseMode } from "./app-settings";

/** Templates that imply a fixed verse layout regardless of verse_mode in DB. */
export function verseModeForTemplate(template: DisplayTemplate): VerseMode | null {
  switch (template) {
    case "shabad_pair":
    case "shabad_pair_vertical":
    case "pothi_panel":
      return "two";
    case "seva_stream":
      return "streaming";
    default:
      return null;
  }
}

export function resolveEffectiveVerseMode(settings: {
  displayTemplate: DisplayTemplate;
  verseMode?: VerseMode;
  liveDisplayMode?: LiveDisplayMode;
}): VerseMode {
  const fromTemplate = verseModeForTemplate(settings.displayTemplate);
  if (fromTemplate) {
    return fromTemplate;
  }
  if (settings.verseMode) {
    return settings.verseMode;
  }
  return settings.liveDisplayMode === "single_english" ? "single" : "streaming";
}

export function isTwoColumnTemplate(template: DisplayTemplate): boolean {
  return template === "shabad_pair" || template === "pothi_panel";
}
