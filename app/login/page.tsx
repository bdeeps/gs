"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sessionExpired = search.get("session") === "expired";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = (await res.json()) as { error?: string; user?: { verified: boolean } };
      if (!res.ok) {
        setError(data.error || "Could not sign in.");
        return;
      }
      router.push(next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-saffron backdrop-blur">
      <p className="font-gurmukhi text-xl font-semibold text-orange-950">ਸਾਈਨ ਇਨ</p>
      <h1 className="mt-2 text-2xl font-bold text-stone-900">Sign in</h1>
      <p className="mt-2 text-sm text-stone-600">Gurudwara operator access to the dashboard.</p>

      {sessionExpired ? (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          Your session has ended. Please sign in again.
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <label className="block text-sm font-semibold text-stone-800">
          Email
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
          Password
          <input
            required
            type="password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            className="mt-1 w-full rounded-xl border border-orange-200 bg-white px-3 py-2.5 text-stone-900 outline-none ring-orange-300 focus:ring-2"
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-orange-700 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-orange-800 disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-4 flex flex-col gap-2 text-center text-sm">
        <Link href="/forgot-password" className="font-semibold text-stone-600 hover:text-orange-800">
          Forgot password?
        </Link>
      </div>

      <p className="mt-6 text-center text-sm text-stone-600">
        No account?{" "}
        <Link href="/register" className="font-semibold text-orange-800 underline-offset-2 hover:underline">
          Create one
        </Link>
      </p>
      <p className="mt-4 text-center">
        <Link href="/" className="text-sm font-semibold text-stone-500 hover:text-orange-800">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-saffron-page px-5 py-10 text-stone-950 sm:px-8">
      <Suspense fallback={<div className="mx-auto max-w-md animate-pulse rounded-[2rem] bg-white/50 p-8" />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
