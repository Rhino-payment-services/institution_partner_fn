"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { changePartnerPassword } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ipc } from "@/lib/dashboard-ui";

export default function AccountPasswordPage() {
  const { isHydrated, isAuthenticated, user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const homeHref = user?.scope === "INSTITUTION" ? "/sacco" : "/dashboard";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setFeedback("");
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await changePartnerPassword({ currentPassword, newPassword });
      setFeedback(res.message || "Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isHydrated || !isAuthenticated) {
    return (
      <main className={`flex min-h-screen items-center justify-center px-4 ${ipc.pageBg}`}>
        <p className="text-sm font-medium text-slate-700">Loading…</p>
      </main>
    );
  }

  return (
    <main className={`min-h-screen ${ipc.pageBg} px-4 py-10`}>
      <div className="mx-auto w-full max-w-md">
        <div className={`${ipc.card} ${ipc.cardPad}`}>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">Update password</h1>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Use your current password, then choose a new one (at least 8 characters).
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {error && (
              <p
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                role="alert"
              >
                {error}
              </p>
            )}
            {feedback && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {feedback}
              </p>
            )}
            <div>
              <label htmlFor="current-password" className={ipc.formLabel}>
                Current password
              </label>
              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={`${ipc.input} mt-2`}
                required
              />
            </div>
            <div>
              <label htmlFor="new-password" className={ipc.formLabel}>
                New password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`${ipc.input} mt-2`}
                required
                minLength={8}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className={ipc.formLabel}>
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`${ipc.input} mt-2`}
                required
                minLength={8}
              />
            </div>
            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <Link href={homeHref} className={`${ipc.btnSecondary} inline-flex justify-center text-center`}>
                Cancel
              </Link>
              <button type="submit" disabled={submitting} className={ipc.btnPrimary}>
                {submitting ? "Saving…" : "Save new password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
