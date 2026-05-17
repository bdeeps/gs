"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StreamingRecitationScreen } from "@/components/StreamingRecitationScreen";
import type { LiveDisplayMode } from "@/lib/app-settings";
import { getMarketingStrings, type MarketingLang } from "@/lib/marketingI18n";

export default function LiveRecitationPage() {
  const router = useRouter();
  const [lang, setLang] = useState<MarketingLang>("pa");
  const [enableHindiTranslation, setEnableHindiTranslation] = useState(false);
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
            liveDisplayMode?: LiveDisplayMode;
          };
        };
        if (cancelled) return;
        setEnableHindiTranslation(Boolean(data.settings?.enableHindiTranslation));
        setLiveDisplayMode(
          data.settings?.liveDisplayMode === "single_english" ? "single_english" : "timeline"
        );
      } catch {
        if (cancelled) return;
        setEnableHindiTranslation(false);
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
        liveDisplayMode={liveDisplayMode}
        copy={m.streaming}
        langClass={langClass}
        onClose={() => router.push("/")}
      />
    </main>
  );
}

