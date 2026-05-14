"use client";

import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const [gurudwaraName, setGurudwaraName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gurudwaraName, email, password })
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.error || "Could not create account.");
        return;
      }
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-saffron-page px-5 py-10 text-stone-950 sm:px-8">
      <div className="mx-auto max-w-md rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-saffron backdrop-blur">
        <p className="font-gurmukhi text-xl font-semibold text-orange-950">ਗੁਰਦੁਆਰਾ ਖਾਤਾ</p>
        <h1 className="mt-2 text-2xl font-bold text-stone-900">Register Gurudwara account</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          For sevadars who present Gurbani during diwan. We will send a secure link so you may confirm your email
          before the account is used.
        </p>

        {done ? (
          <p className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
            Please check your email for the confirmation link. You may close this window.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
            <label className="block text-sm font-semibold text-stone-800">
              Gurudwara / organization name
              <input
                required
                value={gurudwaraName}
                onChange={(ev) => setGurudwaraName(ev.target.value)}
                className="mt-1 w-full rounded-xl border border-orange-200 bg-white px-3 py-2.5 text-stone-900 outline-none ring-orange-300 focus:ring-2"
                autoComplete="organization"
              />
            </label>
            <label className="block text-sm font-semibold text-stone-800">
              Work email
              <input
                required
                type="email"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                className="mt-1 w-full rounded-xl border border-orange-200 bg-white px-3 py-2.5 text-stone-900 outline-none ring-orange-300 focus:ring-2"
                autoComplete="email"
              />
            </label>
            <label className="block text-sm font-semibold text-stone-800">
              Password (min. 10 characters)
              <input
                required
                type="password"
                minLength={10}
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                className="mt-1 w-full rounded-xl border border-orange-200 bg-white px-3 py-2.5 text-stone-900 outline-none ring-orange-300 focus:ring-2"
                autoComplete="new-password"
              />
            </label>
            {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-blue-950 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-blue-900 disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create account"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-stone-600">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-orange-800 underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
        <p className="mt-4 text-center">
          <Link href="/" className="text-sm font-semibold text-stone-500 hover:text-orange-800">
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
