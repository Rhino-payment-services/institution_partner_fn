"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { loginInstitutionUser } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && password.length >= 4;
  }, [email, password]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginInstitutionUser({
        email: email.trim(),
        password,
      });
      login({
        accessToken: data.accessToken,
        refreshToken: data?.refreshToken,
        user: data?.user,
      });
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-[400px]">
        {/* Logo — overlapping parallelograms */}
        <div className="mb-8 flex justify-center">
          <div className="relative h-12 w-14">
            <span
              className="absolute left-0 top-0 h-9 w-11 -skew-x-12 rounded-sm bg-[var(--rukapay-primary)]"
              aria-hidden
            />
            <span
              className="absolute bottom-0 right-0 h-9 w-11 -skew-x-12 rounded-sm bg-[var(--rukapay-primary-muted)]"
              aria-hidden
            />
          </div>
        </div>

        <h1 className="text-center text-2xl font-bold tracking-tight text-neutral-900">
          Welcome Back !
        </h1>
        <p className="mt-2 text-center text-sm text-neutral-500">Please enter your details</p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-neutral-900"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@sacco.com"
              className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[var(--rukapay-primary)] focus:ring-2 focus:ring-[#08163d]/15"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-neutral-900"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[var(--rukapay-primary)] focus:ring-2 focus:ring-[#08163d]/15"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex cursor-pointer items-center gap-2 text-neutral-500">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 accent-[var(--rukapay-primary)] focus:ring-2 focus:ring-[#08163d]/20"
              />
              Remember me
            </label>
            <Link
              href="#"
              className="font-medium text-neutral-500 hover:text-[var(--rukapay-primary)]"
              onClick={(e) => e.preventDefault()}
            >
              Forgot Password?
            </Link>
          </div>

          {error && (
            <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--rukapay-primary)] to-[var(--rukapay-primary-muted)] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:from-[var(--rukapay-primary-hover)] hover:to-[var(--rukapay-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              "Signing in..."
            ) : (
              <>
                Login
                <span aria-hidden className="text-lg leading-none">
                  →
                </span>
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-xs leading-relaxed text-neutral-500">
          By creating an account, you agree to our{" "}
          <Link
            href="#"
            className="text-[var(--rukapay-primary)] hover:underline"
            onClick={(e) => e.preventDefault()}
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="#"
            className="text-[var(--rukapay-primary)] hover:underline"
            onClick={(e) => e.preventDefault()}
          >
            Privacy Policy
          </Link>
          .
        </p>
        <p className="mt-4 text-center text-sm text-neutral-500">
          Don&apos;t have an account?{" "}
          <Link
            href="#"
            className="font-medium text-[var(--rukapay-primary)] hover:underline"
            onClick={(e) => e.preventDefault()}
          >
            Sign Up
          </Link>
        </p>
      </div>
    </main>
  );
}
