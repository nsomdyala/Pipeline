"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { PipelineMark } from "@/components/brand/pipeline-mark";

type Phase = "splash" | "auth" | "enter";
type Mode = "login" | "register";

export function LoginLanding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>("splash");
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setTimeout(() => setPhase("auth"), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const endpoint =
        mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const body =
        mode === "register"
          ? { name, email, password }
          : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not continue.");
        return;
      }

      setPhase("enter");
      const next = searchParams.get("next");
      const dest = next && next.startsWith("/") ? next : "/";
      window.setTimeout(() => {
        router.replace(dest);
        router.refresh();
      }, 1800);
    });
  }

  return (
    <div className="login-landing relative min-h-dvh overflow-hidden bg-navy text-white">
      <div className="login-atmosphere pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative z-10 flex min-h-dvh items-center justify-center px-6">
        {phase === "splash" ? (
          <div className="login-splash flex flex-col items-center" aria-label="Pipeline">
            <PipelineMark size={96} animated className="login-splash-mark" />
          </div>
        ) : null}

        {phase === "auth" ? (
          <div className="login-auth w-full max-w-sm">
            <div className="mb-8 flex flex-col items-center">
              <PipelineMark size={56} animated />
            </div>

            <div className="mb-4 flex rounded-full bg-white/5 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold ${
                  mode === "login" ? "bg-mint text-navy" : "text-white/60"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
                className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold ${
                  mode === "register" ? "bg-mint text-navy" : "text-white/60"
                }`}
              >
                Create account
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {mode === "register" ? (
                <label className="block">
                  <span className="label-mono text-white/45">Full name</span>
                  <input
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-mint/60 focus:bg-white/[0.09]"
                    placeholder="Your name"
                  />
                </label>
              ) : null}

              <label className="block">
                <span className="label-mono text-white/45">Work email</span>
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-mint/60 focus:bg-white/[0.09]"
                  placeholder="you@company.com"
                />
              </label>

              <label className="block">
                <span className="label-mono text-white/45">Password</span>
                <input
                  type="password"
                  autoComplete={
                    mode === "register" ? "new-password" : "current-password"
                  }
                  required
                  minLength={mode === "register" ? 8 : undefined}
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-mint/60 focus:bg-white/[0.09]"
                  placeholder={
                    mode === "register" ? "At least 8 characters" : "Password"
                  }
                />
              </label>

              {error ? (
                <p className="text-sm font-medium text-coral" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={pending}
                className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-mint px-5 py-3.5 text-sm font-semibold text-navy transition hover:brightness-105 disabled:opacity-60"
              >
                {pending
                  ? mode === "register"
                    ? "Creating…"
                    : "Signing in…"
                  : mode === "register"
                    ? "Create account"
                    : "Sign in"}
              </button>

              <p className="text-center text-xs text-white/45">
                {mode === "register"
                  ? "Creates a bid team member account for this portal."
                  : "Each teammate signs in with their own email and password."}
              </p>
            </form>
          </div>
        ) : null}

        {phase === "enter" ? (
          <div
            className="login-enter flex flex-col items-center gap-4"
            aria-live="polite"
          >
            <PipelineMark size={88} animated className="login-enter-mark" />
            <div className="wordmark text-3xl leading-none tracking-[-0.04em]">
              Pipeline
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
