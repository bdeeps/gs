"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StreamingRecitationScreen } from "@/components/StreamingRecitationScreen";
import { getMarketingStrings, type MarketingLang } from "@/lib/marketingI18n";

export default function LiveRecitationPage() {
  const router = useRouter();
  const [lang, setLang] = useState<MarketingLang>("pa");

  useEffect(() => {
    const saved = window.localStorage.getItem("gurbani-marketing-lang");
    if (saved === "en" || saved === "pa" || saved === "hi") {
      setLang(saved);
    }
  }, []);

  const m = useMemo(() => getMarketingStrings(lang), [lang]);
  const langClass = lang === "pa" ? "font-gurmukhi" : "";

  return (
    <main lang={lang === "pa" ? "pa" : lang === "hi" ? "hi" : "en"}>
      <StreamingRecitationScreen
        open
        copy={m.streaming}
        langClass={langClass}
        onClose={() => router.push("/")}
      />
    </main>
  );
}

