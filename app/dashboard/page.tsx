"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type {
  CardStyle,
  DisplayTemplate,
  FontScale,
  LiveDisplayMode,
  VerseMode
} from "@/lib/app-settings";
import { verseModeForTemplate } from "@/lib/display-layout";
import { GurudwaraLogoutButton } from "@/components/GurudwaraLogoutButton";

type MeUser = {
  id: string;
  email: string;
  name: string;
  verified: boolean;
};

type DashboardMetrics = {
  totalSearchRequests: number;
  totalLiveRequests: number;
  totalVersesMatched: number;
  totalTranslationsRequested: number;
  totalTranslationsSucceeded: number;
};

const TEMPLATE_OPTIONS: { id: DisplayTemplate; title: string; subtitle: string }[] = [
  { id: "darbar_focus", title: "Darbar Focus", subtitle: "Single centered hero verse" },
  { id: "shabad_pair", title: "Shabad Pair", subtitle: "Two verses side-by-side" },
  { id: "shabad_pair_vertical", title: "Shabad Pair Vertical", subtitle: "Two verses stacked" },
  { id: "seva_stream", title: "Seva Stream", subtitle: "Flowing timeline for live recitation" },
  { id: "pothi_panel", title: "Pothi Panel", subtitle: "Structured panel style for projectors" },
  { id: "maryada_minimal", title: "Maryada Minimal", subtitle: "Clean and humble minimal mode" }
];

export default function DashboardPage() {
  const [user, setUser] = useState<MeUser | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [enableHindiTranslation, setEnableHindiTranslation] = useState(false);
  const [displayTemplate, setDisplayTemplate] = useState<DisplayTemplate>("darbar_focus");
  const [verseMode, setVerseMode] = useState<VerseMode>("single");
  const [fontScale, setFontScale] = useState<FontScale>("xlarge");
  const [cardStyle, setCardStyle] = useState<CardStyle>("soft");
  const [liveDisplayMode, setLiveDisplayMode] = useState<LiveDisplayMode>("timeline");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [meRes, settingsRes, statsRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/admin/config"),
          fetch("/api/admin/stats")
        ]);
        const data = (await meRes.json()) as { user: MeUser | null };
        const settings = (await settingsRes.json()) as {
          settings?: {
            enableHindiTranslation?: boolean;
            displayTemplate?: DisplayTemplate;
            verseMode?: VerseMode;
            fontScale?: FontScale;
            cardStyle?: CardStyle;
            liveDisplayMode?: LiveDisplayMode;
          };
        };
        const stats = (await statsRes.json()) as { metrics?: DashboardMetrics };
        if (!cancelled) {
          setUser(data.user ?? null);
          setMetrics(stats.metrics ?? null);
          setEnableHindiTranslation(Boolean(settings.settings?.enableHindiTranslation));
          setDisplayTemplate(settings.settings?.displayTemplate ?? "darbar_focus");
          setVerseMode(settings.settings?.verseMode ?? "single");
          setFontScale(settings.settings?.fontScale ?? "xlarge");
          setCardStyle(settings.settings?.cardStyle ?? "soft");
          setLiveDisplayMode(
            settings.settings?.liveDisplayMode === "single_english" ? "single_english" : "timeline"
          );
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setError("Could not load account.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveSettings() {
    setSaveMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enableHindiTranslation,
          displayTemplate,
          verseMode,
          fontScale,
          cardStyle,
          liveDisplayMode
        })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Could not save settings.");
      }
      setSaveMessage("Settings saved.");
    } catch (caught) {
      setSaveMessage(caught instanceof Error ? caught.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-saffron-page px-5 py-16 text-center text-stone-600">
        Loading…
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-saffron-page px-5 py-16 text-center">
        <p className="text-stone-700">You are not signed in.</p>
        <Link href="/login" className="mt-4 inline-block font-semibold text-orange-800 hover:underline">
          Sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-saffron-page px-4 py-6 text-stone-950 sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className="rounded-3xl border border-white/70 bg-blue-950 p-6 text-white shadow-saffron">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Gurudwara dashboard</p>
              <h1 className="mt-2 text-2xl font-semibold">{user.name}</h1>
              <p className="mt-1 text-sm text-blue-100">{user.email}</p>
            </div>
            <GurudwaraLogoutButton />
          </div>

          <div className="mt-6 space-y-4">
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={enableHindiTranslation}
                onChange={(ev) => setEnableHindiTranslation(ev.target.checked)}
                className="h-4 w-4 rounded border-white/40 bg-transparent"
              />
              Enable Hindi translation
            </label>

            <label className="block text-sm font-medium">
              Template
              <select
                value={displayTemplate}
                onChange={(ev) => {
                  const next = ev.target.value as DisplayTemplate;
                  setDisplayTemplate(next);
                  const implied = verseModeForTemplate(next);
                  if (implied) {
                    setVerseMode(implied);
                  }
                }}
                className="mt-1 w-full rounded-lg border border-white/30 bg-blue-900 px-3 py-2 text-sm"
              >
                {TEMPLATE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium">
              Verse mode
              <select
                value={verseMode}
                onChange={(ev) => setVerseMode(ev.target.value as VerseMode)}
                className="mt-1 w-full rounded-lg border border-white/30 bg-blue-900 px-3 py-2 text-sm"
              >
                <option value="single">Single verse</option>
                <option value="two">Two verses</option>
                <option value="streaming">Streaming verses</option>
              </select>
            </label>

            <label className="block text-sm font-medium">
              Font scale
              <select
                value={fontScale}
                onChange={(ev) => setFontScale(ev.target.value as FontScale)}
                className="mt-1 w-full rounded-lg border border-white/30 bg-blue-900 px-3 py-2 text-sm"
              >
                <option value="large">Large</option>
                <option value="xlarge">X-Large</option>
                <option value="projection">Projection</option>
              </select>
            </label>

            <label className="block text-sm font-medium">
              Card style
              <select
                value={cardStyle}
                onChange={(ev) => setCardStyle(ev.target.value as CardStyle)}
                className="mt-1 w-full rounded-lg border border-white/30 bg-blue-900 px-3 py-2 text-sm"
              >
                <option value="none">No cards</option>
                <option value="soft">Soft cards</option>
                <option value="elevated">Elevated cards</option>
              </select>
            </label>

            <label className="block text-sm font-medium">
              Legacy mode compatibility
              <select
                value={liveDisplayMode}
                onChange={(ev) => setLiveDisplayMode(ev.target.value as LiveDisplayMode)}
                className="mt-1 w-full rounded-lg border border-white/30 bg-blue-900 px-3 py-2 text-sm"
              >
                <option value="timeline">Timeline</option>
                <option value="single_english">Single verse (legacy)</option>
              </select>
            </label>
          </div>

          <div className="mt-6 space-y-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveSettings()}
              className="w-full rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-blue-950 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save settings"}
            </button>
            {saveMessage ? <p className="text-sm text-amber-100">{saveMessage}</p> : null}
          </div>
        </aside>

        {/* Main content */}
        <section className="space-y-6">
          <div className="rounded-3xl border border-stone-200 bg-white/90 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-stone-900">Usage Dashboard</h2>
            <p className="mt-1 text-sm text-stone-600">
              Searches, matches, and translation throughput across sessions.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-xs uppercase tracking-wide text-stone-500">Search requests</p>
                <p className="mt-1 text-3xl font-semibold text-stone-900">{metrics?.totalSearchRequests ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-xs uppercase tracking-wide text-stone-500">Live requests</p>
                <p className="mt-1 text-3xl font-semibold text-stone-900">{metrics?.totalLiveRequests ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-xs uppercase tracking-wide text-stone-500">Verses matched</p>
                <p className="mt-1 text-3xl font-semibold text-stone-900">{metrics?.totalVersesMatched ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-xs uppercase tracking-wide text-stone-500">Translations requested</p>
                <p className="mt-1 text-3xl font-semibold text-stone-900">{metrics?.totalTranslationsRequested ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-xs uppercase tracking-wide text-stone-500">Translations completed</p>
                <p className="mt-1 text-3xl font-semibold text-stone-900">{metrics?.totalTranslationsSucceeded ?? 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white/90 p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-stone-900">Template Library</h3>
            <p className="mt-1 text-sm text-stone-600">
              Professional and humble display presets for projector and stage use.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {TEMPLATE_OPTIONS.map((option) => (
                <div
                  key={option.id}
                  className={`rounded-2xl border p-4 ${
                    option.id === displayTemplate
                      ? "border-orange-300 bg-orange-50"
                      : "border-stone-200 bg-stone-50"
                  }`}
                >
                  <p className="text-base font-semibold text-stone-900">{option.title}</p>
                  <p className="mt-1 text-sm text-stone-600">{option.subtitle}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <Link href="/live" className="rounded-full bg-blue-950 px-4 py-2 font-semibold text-white">
              Open Live View
            </Link>
            <Link href="/" className="font-semibold text-stone-600 hover:text-orange-800">
              ← Back to home
            </Link>
          </div>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </section>
      </div>
    </main>
  );
}
