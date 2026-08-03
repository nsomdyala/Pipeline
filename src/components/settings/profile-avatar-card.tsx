"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";

type MeUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
};

export function ProfileAvatarCard() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [me, setMe] = useState<MeUser | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void fetch("/api/me")
      .then((r) => r.json())
      .then((d: { user?: MeUser }) => {
        if (d.user) setMe(d.user);
      })
      .catch(() => setError("Could not load your profile."));
  }, []);

  function onPick(file: File | null) {
    setError(null);
    setNotice(null);
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError("Only JPG, PNG or WebP images are allowed.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Image must be 3 MB or smaller.");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    startTransition(async () => {
      try {
        const body = new FormData();
        body.set("file", file);
        const res = await fetch("/api/me/avatar", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed.");
        setMe(data.user);
        setPreview(null);
        setNotice("Profile picture saved.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  function removeAvatar() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/me/avatar", { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not remove.");
        setMe(data.user);
        setPreview(null);
        setNotice("Profile picture removed.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not remove.");
      }
    });
  }

  if (!me) {
    return (
      <section className="surface mb-8 p-5 md:p-6">
        <p className="text-sm text-muted">Loading your profile…</p>
      </section>
    );
  }

  return (
    <section className="surface mb-8 p-5 md:p-6">
      <h2 className="text-base font-semibold text-ink">My profile</h2>
      <p className="mt-1 text-sm text-muted">
        Upload a photo so your team recognises you in chat and discussions.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Avatar
          name={me.name}
          src={preview ?? me.avatarUrl}
          size={72}
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{me.name}</p>
          <p className="text-sm text-muted">{me.email}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="btn btn-primary cursor-pointer">
              {pending ? "Saving…" : me.avatarUrl ? "Replace photo" : "Upload photo"}
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={pending}
                onChange={(e) => onPick(e.target.files?.[0] ?? null)}
              />
            </label>
            {me.avatarUrl ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={pending}
                onClick={removeAvatar}
              >
                Remove
              </button>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-muted">JPG, PNG or WebP · max 3 MB</p>
        </div>
      </div>
      {error ? (
        <p className="mt-3 text-sm font-semibold text-coral" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-3 text-sm font-semibold text-mint">{notice}</p>
      ) : null}
    </section>
  );
}
