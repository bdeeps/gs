"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LiveDisplayMode } from "@/lib/app-settings";
import { GurudwaraLogoutButton } from "@/components/GurudwaraLogoutButton";

type MeUser = {
  id: string;
  email: string;
  name: string;
  verified: boolean;
};

export default function DashboardPage() {
  const [user, setUser] = useState<MeUser | null>(null);
  const [enableHindiTranslation, setEnableHindiTranslation] = useState(false);
  const [liveDisplayMode, setLiveDisplayMode] = useState<LiveDisplayMode>("timeline");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [meRes, settingsRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/admin/config")
        ]);
        const data = (await meRes.json()) as { user: MeUser | null };
        const settings = (await settingsRes.json()) as {
          settings?: {
            enableHindiTranslation?: boolean;
            liveDisplayMode?: LiveDisplayMode;
          };
        };
        if (!cancelled) {
          setUser(data.user ?? null);
          setEnableHindiTranslation(Boolean(settings.settings?.enableHindiTranslation));
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
        body: JSON.stringify({ enableHindiTranslation, liveDisplayMode })
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
    <main className="min-h-screen bg-saffron-page px-5 py-10 text-stone-950 sm:px-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 rounded-[2rem] border border-white/70 bg-blue-950 p-8 text-white shadow-saffron sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-300">Gurudwara dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold">{user.name}</h1>
            <p className="mt-2 text-blue-100">{user.email}</p>
          </div>
          <GurudwaraLogoutButton />
        </div>

        <p className="text-sm text-blue-100">
          Your account is active. Open{" "}
          <Link href="/live" className="font-bold text-white underline">
            live search
          </Link>{" "}
          from the home page when serving during diwan.
        </p>

        <div className="rounded-2xl border border-white/20 bg-white/5 p-5">
          <h2 className="text-lg font-semibold text-amber-200">Admin display settings</h2>
          <p className="mt-1 text-sm text-blue-100/90">
            Configure translation and live screen behavior for this deployment.
          </p>

          <label className="mt-4 flex items-center gap-3 text-sm font-medium text-white">
            <input
              type="checkbox"
              checked={enableHindiTranslation}
              onChange={(ev) => setEnableHindiTranslation(ev.target.checked)}
              className="h-4 w-4 rounded border-white/40 bg-transparent"
            />
            Enable Hindi translation (optional)
          </label>

          <label className="mt-4 block text-sm font-medium text-white">
            Live display mode
            <select
              value={liveDisplayMode}
              onChange={(ev) => setLiveDisplayMode(ev.target.value as LiveDisplayMode)}
              className="mt-1 w-full rounded-lg border border-white/30 bg-blue-900 px-3 py-2 text-sm text-white"
            >
              <option value="timeline">Timeline (multiple verses)</option>
              <option value="single_english">Single verse (English translation only)</option>
            </select>
          </label>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveSettings()}
              className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-blue-950 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save settings"}
            </button>
            {saveMessage ? <p className="text-sm text-amber-100">{saveMessage}</p> : null}
          </div>
        </div>

        {error ? <p className="text-sm text-amber-200">{error}</p> : null}

        <p className="text-sm text-blue-200/90">
          <Link href="/" className="font-semibold text-white hover:underline">
            ← Home
          </Link>
        </p>
      </div>
    </main>
  );
}
