"use client";

import { useState } from "react";

const PALETTE = [
  "#E01E5A",
  "#E8912D",
  "#2BAC76",
  "#1164A3",
  "#611F69",
  "#3F0E40",
  "#1FC79C",
  "#1264A3",
];

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

type AvatarProps = {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
};

/** Slack-style rounded-square avatar with initials fallback. */
export function Avatar({ name, src, size = 32, className = "" }: AvatarProps) {
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(src) && !broken;
  const initials = initialsFromName(name);
  const bg = colorFromName(name || "User");

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden font-semibold text-white ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: "var(--radius-avatar)",
        background: showImage ? "var(--slack-border)" : bg,
        fontSize: Math.max(10, Math.round(size * 0.34)),
      }}
      aria-label={name}
      title={name}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={name}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <span aria-hidden>{initials}</span>
      )}
    </span>
  );
}
