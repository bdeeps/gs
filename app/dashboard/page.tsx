"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GurudwaraLogoutButton } from "@/components/GurudwaraLogoutButton";

type MeUser = {
  id: string;
  email: string;
  name: string;
  verified: boolean;
};

export default function DashboardPage() {
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = (await res.json()) as { user: MeUser | null };
        if (!cancelled) {
          setUser(data.user ?? null);
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

        {!user.verified ? (
          <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            This email is not yet confirmed. Please check your inbox for the confirmation message, or use “Resend
            confirmation email” on the{" "}
            <Link href="/login" className="font-bold underline">
              sign-in
            </Link>{" "}
            page.
          </div>
        ) : (
          <p className="text-sm text-blue-100">
            Your account is active. Open{" "}
            <Link href="/live" className="font-bold text-white underline">
              live search
            </Link>{" "}
            from the home page when serving during diwan.
          </p>
        )}

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
