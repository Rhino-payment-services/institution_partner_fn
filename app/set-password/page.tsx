"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { completeInvitationWithPassword, verifyInvitationToken } from "@/lib/api";
import type { InvitationVerifyResponse } from "@/lib/api";

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => (searchParams.get("token") || "").trim(), [searchParams]);

  const [verifyState, setVerifyState] = useState<InvitationVerifyResponse | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const runVerify = useCallback(async () => {
    if (!token || token.length < 32) {
      setVerifyState({ valid: false, reason: "INVALID" });
      setVerifyLoading(false);
      return;
    }
    setVerifyLoading(true);
    setError("");
    try {
      const res = await verifyInvitationToken(token);
      setVerifyState(res);
    } catch (e) {
      setVerifyState({ valid: false, reason: "INVALID" });
      setError(e instanceof Error ? e.message : "Could not verify invitation");
    } finally {
      setVerifyLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void runVerify();
  }, [runVerify]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await completeInvitationWithPassword(token, password);
      setDone(true);
      setTimeout(() => {
        router.replace("/");
      }, 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set password");
    } finally {
      setSubmitting(false);
    }
  }

  const reasonMessage = (() => {
    if (!verifyState || verifyState.valid) return "";
    switch (verifyState.reason) {
      case "EXPIRED":
        return "This invitation link has expired. Ask your administrator to resend the invitation.";
      case "ALREADY_USED":
        return "This invitation link has already been used. Sign in with your password, or request a new invitation.";
      case "CANCELLED":
        return "This invitation is no longer valid.";
      default:
        return "This invitation link is invalid or could not be verified.";
    }
  })();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Image
            src="/images/logoRukapay.png"
            alt="Rukapay logo"
            width={110}
            height={56}
            priority
            className="h-auto w-auto object-contain"
          />
        </div>

        <h1 className="text-center text-2xl font-bold tracking-tight text-neutral-900">Set your password</h1>
        <p className="mt-2 text-center text-sm text-neutral-500">
          Complete your institution partner account activation.
        </p>

        {verifyLoading ? (
          <p className="mt-8 text-center text-sm text-neutral-600">Validating invitation…</p>
        ) : verifyState?.valid ? (
          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            {verifyState.email ? (
              <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
                Activating account for{" "}
                <span className="font-medium text-neutral-900">{verifyState.email}</span>
              </p>
            ) : null}
            <div>
              <label htmlFor="pw" className="mb-2 block text-sm font-semibold text-neutral-900">
                Password
              </label>
              <input
                id="pw"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-[var(--rukapay-primary)] focus:ring-2 focus:ring-[#08163d]/15"
                minLength={8}
                required
              />
            </div>
            <div>
              <label htmlFor="pw2" className="mb-2 block text-sm font-semibold text-neutral-900">
                Confirm password
              </label>
              <input
                id="pw2"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-[var(--rukapay-primary)] focus:ring-2 focus:ring-[#08163d]/15"
                minLength={8}
                required
              />
            </div>
            {error ? (
              <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
            ) : null}
            {done ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Password saved. Redirecting to sign in…
              </p>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-[var(--rukapay-primary)] to-[var(--rukapay-primary-muted)] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:from-[var(--rukapay-primary-hover)] hover:to-[var(--rukapay-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Activate account"}
              </button>
            )}
          </form>
        ) : (
          <div className="mt-8 space-y-4">
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {reasonMessage}
            </p>
            {error ? (
              <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
            ) : null}
            <Link
              href="/"
              className="block w-full rounded-lg border border-neutral-200 px-4 py-3 text-center text-sm font-medium text-neutral-800 hover:bg-neutral-50"
            >
              Back to sign in
            </Link>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-neutral-500">
          Never share your password. RukaPay staff will never ask for it by email.
        </p>
      </div>
    </main>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-white px-4">
          <p className="text-sm text-neutral-600">Loading…</p>
        </main>
      }
    >
      <SetPasswordForm />
    </Suspense>
  );
}
