"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function SetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("Missing invite token. Open the link from your invitation.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not set password.");
        return;
      }
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bone px-4">
      <form
        onSubmit={onSubmit}
        className="surface w-full max-w-md p-6 md:p-8"
      >
        <p className="label-mono mb-2">Pipeline</p>
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">
          Set your password
        </h1>
        <p className="mt-2 text-sm text-muted">
          Finish your invitation to activate your account.
        </p>

        <label className="mt-6 block">
          <span className="label-mono">New password</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field mt-1.5"
          />
        </label>
        <label className="mt-4 block">
          <span className="label-mono">Confirm password</span>
          <input
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="field mt-1.5"
          />
        </label>

        {error ? (
          <p className="mt-3 text-sm font-semibold text-coral" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending || !token}
          className="btn btn-primary mt-6 w-full"
        >
          {pending ? "Saving…" : "Activate account"}
        </button>
      </form>
    </div>
  );
}
