"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setMessage(data.message || "If an account exists, check your email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-saffron-page px-5 py-10 text-stone-950 sm:px-8">
      <div className="mx-auto max-w-md rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-saffron backdrop-blur">
        <h1 className="text-2xl font-bold text-stone-900">Forgot password</h1>
        <p className="mt-2 text-sm text-stone-600">We will email you a reset link if this address is registered.</p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <label className="block text-sm font-semibold text-stone-800">
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="mt-1 w-full rounded-xl border border-orange-200 bg-white px-3 py-2.5 outline-none ring-orange-300 focus:ring-2"
              autoComplete="email"
            />
          </label>
          {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
          {message ? <p className="text-sm font-medium text-emerald-800">{message}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-blue-950 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="font-semibold text-orange-800 hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
