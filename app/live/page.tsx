"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StreamingRecitationScreen } from "@/components/StreamingRecitationScreen";
import type { AppSettings } from "@/lib/app-settings";
import { resolveEffectiveVerseMode } from "@/lib/display-layout";
import { getMarketingStrings, type MarketingLang } from "@/lib/marketingI18n";

const DEFAULT_SETTINGS: Pick<
  AppSettings,
  "enableHindiTranslation" | "displayTemplate" | "verseMode" | "fontScale" | "cardStyle" | "liveDisplayMode"
> = {
  enableHindiTranslation: false,
  displayTemplate: "darbar_focus",
  verseMode: "single",
  fontScale: "xlarge",
  cardStyle: "soft",
  liveDisplayMode: "timeline"
};

export default function LiveRecitationPage() {
  const router = useRouter();
  const [lang, setLang] = useState<MarketingLang>("pa");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("gurbani-marketing-lang");
    if (saved === "en" || saved === "pa" || saved === "hi") {
      setLang(saved);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/config", { cache: "no-store" });
      const data = (await res.json()) as { settings?: Partial<AppSettings> };
      setSettings({
        enableHindiTranslation: Boolean(data.settings?.enableHindiTranslation),
        displayTemplate: data.settings?.displayTemplate ?? DEFAULT_SETTINGS.displayTemplate,
        verseMode: data.settings?.verseMode ?? DEFAULT_SETTINGS.verseMode,
        fontScale: data.settings?.fontScale ?? DEFAULT_SETTINGS.fontScale,
        cardStyle: data.settings?.cardStyle ?? DEFAULT_SETTINGS.cardStyle,
        liveDisplayMode: data.settings?.liveDisplayMode ?? DEFAULT_SETTINGS.liveDisplayMode
      });
    } catch {
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setSettingsLoaded(true);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
    const onFocus = () => void loadSettings();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadSettings]);

  const m = useMemo(() => getMarketingStrings(lang), [lang]);
  const langClass = lang === "pa" ? "font-gurmukhi" : "";
  const effectiveVerseMode = resolveEffectiveVerseMode(settings);

  if (!settingsLoaded) {
    return (
      <main lang={lang === "pa" ? "pa" : lang === "hi" ? "hi" : "en"} className="flex min-h-screen items-center justify-center bg-[#fefcf6]">
        <p className="text-sm text-stone-500">Loading display settings…</p>
      </main>
    );
  }

  return (
    <main lang={lang === "pa" ? "pa" : lang === "hi" ? "hi" : "en"}>
      <StreamingRecitationScreen
        open
        enableHindiTranslation={settings.enableHindiTranslation}
        displayTemplate={settings.displayTemplate}
        verseMode={effectiveVerseMode}
        fontScale={settings.fontScale}
        cardStyle={settings.cardStyle}
        liveDisplayMode={settings.liveDisplayMode}
        copy={m.streaming}
        langClass={langClass}
        onClose={() => router.push("/")}
        onRefreshSettings={loadSettings}
      />
    </main>
  );
}
