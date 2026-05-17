"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StreamingRecitationScreen } from "@/components/StreamingRecitationScreen";
import type {
  CardStyle,
  DisplayTemplate,
  FontScale,
  LiveDisplayMode,
  VerseMode
} from "@/lib/app-settings";
import { getMarketingStrings, type MarketingLang } from "@/lib/marketingI18n";

export default function LiveRecitationPage() {
  const router = useRouter();
  const [lang, setLang] = useState<MarketingLang>("pa");
  const [enableHindiTranslation, setEnableHindiTranslation] = useState(false);
  const [displayTemplate, setDisplayTemplate] = useState<DisplayTemplate>("darbar_focus");
  const [verseMode, setVerseMode] = useState<VerseMode>("single");
  const [fontScale, setFontScale] = useState<FontScale>("xlarge");
  const [cardStyle, setCardStyle] = useState<CardStyle>("soft");
  const [liveDisplayMode, setLiveDisplayMode] = useState<LiveDisplayMode>("timeline");

  useEffect(() => {
    const saved = window.localStorage.getItem("gurbani-marketing-lang");
    if (saved === "en" || saved === "pa" || saved === "hi") {
      setLang(saved);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/config");
        const data = (await res.json()) as {
          settings?: {
            enableHindiTranslation?: boolean;
            displayTemplate?: DisplayTemplate;
            verseMode?: VerseMode;
            fontScale?: FontScale;
            cardStyle?: CardStyle;
            liveDisplayMode?: LiveDisplayMode;
          };
        };
        if (cancelled) return;
        setEnableHindiTranslation(Boolean(data.settings?.enableHindiTranslation));
        setDisplayTemplate(data.settings?.displayTemplate ?? "darbar_focus");
        setVerseMode(data.settings?.verseMode ?? "single");
        setFontScale(data.settings?.fontScale ?? "xlarge");
        setCardStyle(data.settings?.cardStyle ?? "soft");
        setLiveDisplayMode(
          data.settings?.liveDisplayMode === "single_english" ? "single_english" : "timeline"
        );
      } catch {
        if (cancelled) return;
        setEnableHindiTranslation(false);
        setDisplayTemplate("darbar_focus");
        setVerseMode("single");
        setFontScale("xlarge");
        setCardStyle("soft");
        setLiveDisplayMode("timeline");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const m = useMemo(() => getMarketingStrings(lang), [lang]);
  const langClass = lang === "pa" ? "font-gurmukhi" : "";

  return (
    <main lang={lang === "pa" ? "pa" : lang === "hi" ? "hi" : "en"}>
      <StreamingRecitationScreen
        open
        enableHindiTranslation={enableHindiTranslation}
        displayTemplate={displayTemplate}
        verseMode={verseMode}
        fontScale={fontScale}
        cardStyle={cardStyle}
        liveDisplayMode={liveDisplayMode}
        copy={m.streaming}
        langClass={langClass}
        onClose={() => router.push("/")}
      />
    </main>
  );
}

