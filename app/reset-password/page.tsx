"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token")?.trim() || "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("Missing reset token. Open the link from your email.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not reset password.");
        return;
      }
      router.push("/login");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-saffron">
        <p className="text-stone-700">Open the password reset link from your email, or request a new one.</p>
        <Link href="/forgot-password" className="mt-4 inline-block font-semibold text-orange-800 hover:underline">
          Request reset link
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-saffron backdrop-blur">
      <h1 className="text-2xl font-bold text-stone-900">Set new password</h1>
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <label className="block text-sm font-semibold text-stone-800">
          New password (min. 10 characters)
          <input
            required
            type="password"
            minLength={10}
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            className="mt-1 w-full rounded-xl border border-orange-200 bg-white px-3 py-2.5 outline-none ring-orange-300 focus:ring-2"
            autoComplete="new-password"
          />
        </label>
        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-orange-700 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-saffron-page px-5 py-10 text-stone-950 sm:px-8">
      <Suspense fallback={<div className="mx-auto max-w-md animate-pulse rounded-[2rem] bg-white/50 p-8" />}>
        <ResetForm />
      </Suspense>
    </main>
  );
}
