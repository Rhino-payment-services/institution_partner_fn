"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { loginInstitutionUser } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { login } = useAuth();
  const [loginMode, setLoginMode] = useState<"ADMIN" | "SACCO">("ADMIN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantCode, setTenantCode] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const emailValue = String(form.get("email") || email || "").trim();
    const passwordValue = String(form.get("password") || password || "");
    const tenantCodeValue = String(form.get("tenantCode") || tenantCode || "").trim();

    if (!emailValue || passwordValue.length < 4) {
      setError("Please enter a valid email and password.");
      return;
    }
    if (loginMode === "SACCO" && tenantCodeValue.length < 2) {
      setError("Please enter SACCO Code.");
      return;
    }

    setLoading(true);
    try {
      const data = await loginInstitutionUser({
        email: emailValue,
        password: passwordValue,
        tenantCode: loginMode === "SACCO" ? tenantCodeValue : undefined,
      });
      login({
        accessToken: data.accessToken,
        refreshToken: data?.refreshToken,
        user: data?.user,
      });
      const nextPath = data?.user?.scope === "INSTITUTION" ? "/sacco" : "/dashboard";
      window.location.href = nextPath;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-[400px]">
        {/* Brand logo */}
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

        <h1 className="text-center text-2xl font-bold tracking-tight text-neutral-900">
          Welcome Back !
        </h1>
        <p className="mt-2 text-center text-sm text-neutral-500">Please enter your details</p>

        <fieldset className="relative z-10 mt-6 grid grid-cols-2 gap-2 rounded-lg bg-neutral-100 p-1">
          <legend className="sr-only">Login mode</legend>
          <label
            htmlFor="mode-admin"
            className={`cursor-pointer select-none rounded-md px-3 py-2 text-center text-sm font-medium transition ${
              loginMode === "ADMIN"
                ? "bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-200"
                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
            }`}
          >
            <input
              id="mode-admin"
              name="login-mode"
              type="radio"
              className="sr-only"
              checked={loginMode === "ADMIN"}
              onChange={() => setLoginMode("ADMIN")}
            />
            Login as Admin
          </label>
          <label
            htmlFor="mode-sacco"
            className={`cursor-pointer select-none rounded-md px-3 py-2 text-center text-sm font-medium transition ${
              loginMode === "SACCO"
                ? "bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-200"
                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
            }`}
          >
            <input
              id="mode-sacco"
              name="login-mode"
              type="radio"
              className="sr-only"
              checked={loginMode === "SACCO"}
              onChange={() => setLoginMode("SACCO")}
            />
            Login as SACCO
          </label>
        </fieldset>

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
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={loginMode === "SACCO" ? "staff@sacco.com" : "admin@partner.com"}
              className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[var(--rukapay-primary)] focus:ring-2 focus:ring-[#08163d]/15"
            />
          </div>

          {loginMode === "SACCO" && (
            <div>
              <label
                htmlFor="tenantCode"
                className="mb-2 block text-sm font-semibold text-neutral-900"
              >
                SACCO Code <span className="font-normal text-red-500">*</span>
              </label>
              <input
                id="tenantCode"
                name="tenantCode"
                type="text"
                value={tenantCode}
                onChange={(e) => setTenantCode(e.target.value)}
                placeholder="e.g. NAMASUBA"
                className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[var(--rukapay-primary)] focus:ring-2 focus:ring-[#08163d]/15"
                required
              />
              <p className="mt-1 text-xs text-neutral-500">
                Required for SACCO staff login to scope access to one SACCO.
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-neutral-900"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
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
            disabled={loading}
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
