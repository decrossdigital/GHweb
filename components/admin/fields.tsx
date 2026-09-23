"use client";

import { useState } from "react";
import type { HomeLink, IconLink, PlatformLink } from "@/lib/types";

export function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function publicImage(src: string) {
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/")) return src;
  return `/${src.split("/").map(encodeURIComponent).join("/")}`;
}

export function Field({
  label,
  value,
  onChange,
  wide,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  wide?: boolean;
}) {
  return (
    <label className={`field${wide ? " span-2" : ""}`}>
      {label}
      <input type="text" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  return (
    <label className="field span-2">
      {label}
      <input type="text" value={value} onChange={(event) => onChange(event.target.value)} />
      <input
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        disabled={uploading}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setUploading(true);
          setError("");
          try {
            const body = new FormData();
            body.set("file", file);
            const response = await fetch("/api/upload", { method: "POST", body });
            const payload = (await response.json()) as { path?: string; error?: string };
            if (!response.ok || !payload.path) {
              throw new Error(payload.error || "Upload failed");
            }
            onChange(payload.path);
          } catch (uploadError) {
            setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
          } finally {
            setUploading(false);
          }
        }}
      />
      {uploading ? <span>Uploading…</span> : null}
      {error ? <span>{error}</span> : null}
      {value ? <img className="thumb" src={publicImage(value)} alt="" /> : null}
    </label>
  );
}

export function PlatformsEditor({
  platforms,
  onChange,
}: {
  platforms: PlatformLink[];
  onChange: (platforms: PlatformLink[]) => void;
}) {
  return (
    <div>
      <strong>Listen links</strong>
      <p className="hint">Leave the URL blank to show the name as plain text, the way YouTube and Spotify appear on Just Believe and Peter&apos;s Song.</p>
      {platforms.map((platform, index) => (
        <div className="admin-grid" key={`${platform.label}-${index}`}>
          <Field
            label="Label"
            value={platform.label}
            onChange={(label) => {
              const next = platforms.slice();
              next[index] = { ...platform, label };
              onChange(next);
            }}
          />
          <Field
            label="URL"
            value={platform.href}
            onChange={(href) => {
              const next = platforms.slice();
              next[index] = { ...platform, href };
              onChange(next);
            }}
          />
          <div className="row-actions span-2">
            <button
              type="button"
              className="secondary"
              onClick={() => {
                if (index === 0) return;
                const next = platforms.slice();
                const [item] = next.splice(index, 1);
                next.splice(index - 1, 0, item);
                onChange(next);
              }}
            >
              Up
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                if (index >= platforms.length - 1) return;
                const next = platforms.slice();
                const [item] = next.splice(index, 1);
                next.splice(index + 1, 0, item);
                onChange(next);
              }}
            >
              Down
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => onChange(platforms.filter((_, itemIndex) => itemIndex !== index))}
            >
              Remove link
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="secondary" onClick={() => onChange([...platforms, { label: "Bandcamp", href: "" }])}>
        Add link
      </button>
    </div>
  );
}

export function IconFields({
  link,
  onChange,
}: {
  link: IconLink;
  onChange: (link: IconLink) => void;
}) {
  return (
    <div className="admin-grid">
      <Field label="URL" value={link.href} wide onChange={(href) => onChange({ ...link, href })} />
      <Field label="Icon class" value={link.icon} onChange={(icon) => onChange({ ...link, icon })} />
      <Field label="Visible text" value={link.label} onChange={(label) => onChange({ ...link, label })} />
      <label className="check span-2">
        <input
          type="checkbox"
          checked={link.active}
          onChange={(event) => onChange({ ...link, active: event.target.checked })}
        />
        Mark active
      </label>
    </div>
  );
}

export function HomeLinkFields({ link, onChange }: { link: HomeLink; onChange: (link: HomeLink) => void }) {
  if (link.type === "text") {
    return <Field label="Text" value={link.text} onChange={(text) => onChange({ ...link, text })} />;
  }
  if (link.type === "image") {
    return (
      <div className="admin-grid">
        <Field label="Link" value={link.href} wide onChange={(href) => onChange({ ...link, href })} />
        <ImageField label="Image" value={link.src} onChange={(src) => onChange({ ...link, src })} />
        <Field label="Description" value={link.alt} wide onChange={(alt) => onChange({ ...link, alt })} />
      </div>
    );
  }
  return <IconFields link={link} onChange={(next) => onChange({ ...link, ...next, type: "icon" })} />;
}
