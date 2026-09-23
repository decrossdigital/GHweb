"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type MouseEvent } from "react";
import {
  assignmentSummary,
  hideAlbum,
  moveAlbumTrack,
  orderedSingles,
  patchAlbum,
  patchSong,
  removeAlbum,
  removeAlbumAndSongs,
  removeSong,
  reorderAlbums,
  reorderSingles,
  setAlbumTracks,
  setSongAssignment,
  setSongHidden,
  showAlbum,
} from "@/lib/catalog";
import type { Album, HomeLink, SiteContent, Song } from "@/lib/types";
import { Field, HomeLinkFields, IconFields, ImageField, PlatformsEditor, publicImage, uid } from "./fields";

type Editor = (recipe: (current: SiteContent) => SiteContent) => void;
type Tab = "site" | "songs" | "albums";

function emptySong(): Song {
  return {
    id: uid("song"),
    title: "",
    duration: "",
    releaseDate: "",
    albumArt: "",
    links: { bandcamp: "", spotify: "", youtube: "" },
    assignment: { type: "unassigned" },
    singleLabel: "Single",
    singleCaption: "",
    singleAlt: "",
    hidden: false,
  };
}

function emptyAlbum(): Album {
  return {
    id: uid("album"),
    type: "album",
    title: "",
    caption: "",
    image: "",
    alt: "",
    platforms: [
      { label: "YouTube", href: "" },
      { label: "Bandcamp", href: "" },
      { label: "Spotify", href: "" },
    ],
    trackIds: [],
    hidden: false,
  };
}

function patchSongLinks(
  content: SiteContent,
  songId: string,
  links: Partial<Song["links"]>,
) {
  const song = content.songs.find((item) => item.id === songId);
  if (!song) return content;
  return patchSong(content, songId, { links: { ...song.links, ...links } });
}

function assignmentValue(song: Song) {
  if (song.assignment.type === "album") return `album:${song.assignment.albumId}`;
  return song.assignment.type;
}

function stopToggle(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
}

export function AdminApp({ initial }: { initial: SiteContent }) {
  const router = useRouter();
  const [content, setContent] = useState(initial);
  const [tab, setTab] = useState<Tab>("site");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function edit(recipe: (current: SiteContent) => SiteContent) {
    setContent((current) => recipe(current));
  }

  async function save() {
    setSaving(true);
    setStatus("");
    setError("");
    try {
      const response = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      const payload = (await response.json()) as SiteContent & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Save failed");
      setContent(payload);
      setStatus("Saved. Reload the public site to see it.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  async function discard() {
    setError("");
    setStatus("");
    const response = await fetch("/api/content", { cache: "no-store" });
    const payload = (await response.json()) as SiteContent & { error?: string };
    if (!response.ok) {
      setError(payload.error || "Could not reload");
      return;
    }
    setContent(payload);
    setStatus("Reloaded the saved copy.");
  }

  return (
    <div className="admin-wrap">
      <div className="admin-top">
        <div>
          <h1>Site admin</h1>
          <p>Songs are the catalog. Each one is a single, on one album, or unassigned.</p>
        </div>
        <div className="admin-actions">
          <a className="button secondary" href="/">
            View site
          </a>
          <button type="button" className="secondary" onClick={discard}>
            Discard unsaved edits
          </button>
          <button type="button" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button type="button" className="secondary" onClick={logout}>
            Log out
          </button>
        </div>
      </div>
      {status ? <p className="admin-status">{status}</p> : null}
      {error ? <p className="admin-status error">{error}</p> : null}

      <AccountPanel />

      <div className="tabs" role="tablist">
        {(
          [
            ["site", "Site"],
            ["songs", "Songs"],
            ["albums", "Albums"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            data-tab={id}
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "site" ? <SiteTab content={content} edit={edit} /> : null}
      {tab === "songs" ? <SongsTab content={content} edit={edit} /> : null}
      {tab === "albums" ? <AlbumsTab content={content} edit={edit} /> : null}

      <div className="admin-actions">
        <button type="button" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function AccountPanel() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setStatus("");
    setError("");
    try {
      const response = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not change the password");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStatus("Password updated. The next sign-in uses it.");
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : "Could not change the password");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="admin-section" id="change-password">
      <h2>Change password</h2>
      <p className="hint">Use the current password, then a new one of at least 16 characters.</p>
      {status ? <p className="admin-status">{status}</p> : null}
      {error ? <p className="admin-status error">{error}</p> : null}
      <form className="account-grid" onSubmit={onSubmit}>
        <label className="field">
          Current password
          <input
            type="password"
            name="current-password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </label>
        <label className="field">
          New password
          <input
            type="password"
            name="new-password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </label>
        <label className="field">
          Confirm new password
          <input
            type="password"
            name="confirm-password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </label>
        <button type="submit" disabled={pending}>
          {pending ? "Updating…" : "Update password"}
        </button>
      </form>
    </section>
  );
}

function SiteTab({ content, edit }: { content: SiteContent; edit: Editor }) {
  return (
    <div>
      <section className="admin-section">
        <h2>Home</h2>
        <div className="admin-grid">
          <Field label="Name" value={content.home.name} onChange={(name) => edit((current) => ({ ...current, home: { ...current.home, name } }))} />
          <Field
            label="Tagline, first line"
            value={content.home.taglineLine1}
            onChange={(taglineLine1) => edit((current) => ({ ...current, home: { ...current.home, taglineLine1 } }))}
          />
          <Field
            label="Tagline, second line"
            value={content.home.taglineLine2}
            onChange={(taglineLine2) => edit((current) => ({ ...current, home: { ...current.home, taglineLine2 } }))}
          />
          <Field
            label="Producer note"
            value={content.home.producerNote}
            wide
            onChange={(producerNote) => edit((current) => ({ ...current, home: { ...current.home, producerNote } }))}
          />
          <Field
            label="Producer link"
            value={content.home.producerUrl}
            wide
            onChange={(producerUrl) => edit((current) => ({ ...current, home: { ...current.home, producerUrl } }))}
          />
          <ImageField
            label="Portrait image"
            value={content.home.portrait.src}
            onChange={(src) =>
              edit((current) => ({ ...current, home: { ...current.home, portrait: { ...current.home.portrait, src } } }))
            }
          />
          <Field
            label="Portrait description"
            value={content.home.portrait.alt}
            wide
            onChange={(alt) =>
              edit((current) => ({ ...current, home: { ...current.home, portrait: { ...current.home.portrait, alt } } }))
            }
          />
        </div>
        <h3>Home links</h3>
        {content.home.links.map((link, index) => (
          <div className="card" key={link.id}>
            <div className="card-head">
              <strong>{link.type === "text" ? `Text “${link.text}”` : link.type === "image" ? "Image link" : "Icon link"}</strong>
              <div className="row-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    edit((current) => ({
                      ...current,
                      home: { ...current.home, links: moveLinks(current.home.links, index, -1) },
                    }))
                  }
                >
                  Up
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    edit((current) => ({
                      ...current,
                      home: { ...current.home, links: moveLinks(current.home.links, index, 1) },
                    }))
                  }
                >
                  Down
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() =>
                    edit((current) => ({
                      ...current,
                      home: { ...current.home, links: current.home.links.filter((item) => item.id !== link.id) },
                    }))
                  }
                >
                  Remove
                </button>
              </div>
            </div>
            <HomeLinkFields
              link={link}
              onChange={(next) =>
                edit((current) => ({
                  ...current,
                  home: {
                    ...current.home,
                    links: current.home.links.map((item) => (item.id === link.id ? next : item)),
                  },
                }))
              }
            />
          </div>
        ))}
        <div className="row-actions">
          <button
            type="button"
            className="secondary"
            onClick={() =>
              edit((current) => ({
                ...current,
                home: {
                  ...current.home,
                  links: [
                    ...current.home.links,
                    { id: uid("icon"), type: "icon", href: "", icon: "fa-spotify", label: "", active: false },
                  ],
                },
              }))
            }
          >
            Add icon link
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() =>
              edit((current) => ({
                ...current,
                home: {
                  ...current.home,
                  links: [...current.home.links, { id: uid("image"), type: "image", href: "", src: "", alt: "" }],
                },
              }))
            }
          >
            Add image link
          </button>
        </div>
      </section>

      <section className="admin-section">
        <h2>Navigation</h2>
        {content.nav.map((item) => (
          <div className="admin-grid" key={item.id}>
            <Field
              label="Label"
              value={item.label}
              onChange={(label) =>
                edit((current) => ({
                  ...current,
                  nav: current.nav.map((navItem) => (navItem.id === item.id ? { ...navItem, label } : navItem)),
                }))
              }
            />
            <Field
              label="Icon class"
              value={item.icon}
              onChange={(icon) =>
                edit((current) => ({
                  ...current,
                  nav: current.nav.map((navItem) => (navItem.id === item.id ? { ...navItem, icon } : navItem)),
                }))
              }
            />
          </div>
        ))}
      </section>

      <section className="admin-section">
        <h2>Contact</h2>
        <Field
          label="Heading"
          value={content.contact.title}
          onChange={(title) => edit((current) => ({ ...current, contact: { ...current.contact, title } }))}
        />
        {content.contact.links.map((link) => (
          <div className="card" key={link.id}>
            <IconFields
              link={link}
              onChange={(next) =>
                edit((current) => ({
                  ...current,
                  contact: {
                    ...current.contact,
                    links: current.contact.links.map((item) => (item.id === link.id ? next : item)),
                  },
                }))
              }
            />
            <button
              type="button"
              className="danger"
              onClick={() =>
                edit((current) => ({
                  ...current,
                  contact: { ...current.contact, links: current.contact.links.filter((item) => item.id !== link.id) },
                }))
              }
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="secondary"
          onClick={() =>
            edit((current) => ({
              ...current,
              contact: {
                ...current.contact,
                links: [...current.contact.links, { id: uid("contact"), href: "", icon: "fa-envelope", label: "", active: false }],
              },
            }))
          }
        >
          Add contact link
        </button>
      </section>

      <section className="admin-section">
        <h2>Footer</h2>
        <Field
          label="Footer credit"
          value={content.footer.credit}
          wide
          onChange={(credit) => edit((current) => ({ ...current, footer: { credit } }))}
        />
      </section>

      <section className="admin-section">
        <h2>Discography and songs</h2>
        <div className="admin-grid">
          <Field
            label="Discography heading"
            value={content.discography.title}
            onChange={(title) => edit((current) => ({ ...current, discography: { ...current.discography, title } }))}
          />
          <Field
            label="Discography intro"
            value={content.discography.intro}
            onChange={(intro) => edit((current) => ({ ...current, discography: { ...current.discography, intro } }))}
          />
          <Field
            label="Songs link"
            value={content.discography.songsLinkLabel}
            wide
            onChange={(songsLinkLabel) =>
              edit((current) => ({ ...current, discography: { ...current.discography, songsLinkLabel } }))
            }
          />
          <Field
            label="Albums section heading"
            value={content.discography.albumsHeading}
            onChange={(albumsHeading) =>
              edit((current) => ({ ...current, discography: { ...current.discography, albumsHeading } }))
            }
          />
          <Field
            label="Singles section heading"
            value={content.discography.singlesHeading}
            onChange={(singlesHeading) =>
              edit((current) => ({ ...current, discography: { ...current.discography, singlesHeading } }))
            }
          />
          <Field
            label="Songs panel heading"
            value={content.songsPanel.title}
            onChange={(title) => edit((current) => ({ ...current, songsPanel: { ...current.songsPanel, title } }))}
          />
          <Field
            label="Songs panel intro"
            value={content.songsPanel.intro}
            onChange={(intro) => edit((current) => ({ ...current, songsPanel: { ...current.songsPanel, intro } }))}
          />
          <Field
            label="Discography link"
            value={content.songsPanel.discographyLinkLabel}
            wide
            onChange={(discographyLinkLabel) =>
              edit((current) => ({ ...current, songsPanel: { ...current.songsPanel, discographyLinkLabel } }))
            }
          />
        </div>
      </section>

      <details className="card">
        <summary>Page title, description, and keywords</summary>
        <div className="admin-grid">
          <Field
            label="Page title"
            value={content.meta.title}
            wide
            onChange={(title) => edit((current) => ({ ...current, meta: { ...current.meta, title } }))}
          />
          <label className="field span-2">
            Description
            <textarea
              value={content.meta.description}
              onChange={(event) =>
                edit((current) => ({ ...current, meta: { ...current.meta, description: event.target.value } }))
              }
            />
          </label>
          <Field
            label="Keywords"
            value={content.meta.keywords}
            wide
            onChange={(keywords) => edit((current) => ({ ...current, meta: { ...current.meta, keywords } }))}
          />
        </div>
      </details>
    </div>
  );
}

function moveLinks(links: HomeLink[], index: number, direction: -1 | 1) {
  const next = index + direction;
  if (next < 0 || next >= links.length) return links;
  const copy = links.slice();
  const [item] = copy.splice(index, 1);
  copy.splice(next, 0, item);
  return copy;
}

function SongsTab({ content, edit }: { content: SiteContent; edit: Editor }) {
  const singles = orderedSingles(content);
  const [addSingleId, setAddSingleId] = useState("");
  const [deleteSongId, setDeleteSongId] = useState<string | null>(null);
  const available = content.songs.filter((song) => song.assignment.type !== "single");
  const songToDelete = content.songs.find((song) => song.id === deleteSongId);

  return (
    <section className="admin-section">
      <h2>Songs</h2>
      <p className="hint">
        Every visible song is in the public table, newest year first. Hiding a song keeps its assignment and its place on an album or in the singles order.
      </p>

      <h3>Singles on the discography</h3>
      <p className="hint">Only songs assigned Single appear in the singles grid, in this order. The cover caption is separate from the song-table label.</p>
      {singles.length === 0 ? <p className="hint">No singles yet.</p> : null}
      {singles.map((song, index) => (
        <div className={song.hidden ? "order-row is-hidden" : "order-row"} key={song.id}>
          <strong>{song.title || "Untitled"}{song.hidden ? " (hidden)" : ""}</strong>
          <div className="row-actions">
            <button type="button" className="secondary" onClick={() => edit((current) => reorderSingles(current, index, -1))}>
              Up
            </button>
            <button type="button" className="secondary" onClick={() => edit((current) => reorderSingles(current, index, 1))}>
              Down
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => edit((current) => setSongAssignment(current, song.id, { type: "unassigned" }))}
            >
              Remove from singles
            </button>
          </div>
        </div>
      ))}
      <div className="picker">
        <label className="field">
          Add an existing song to the singles grid
          <select value={addSingleId} onChange={(event) => setAddSingleId(event.target.value)}>
            <option value="">Choose a song</option>
            {available.map((song) => (
              <option key={song.id} value={song.id}>
                {song.title || "Untitled"} — {assignmentSummary(content, song)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!addSingleId}
          onClick={() => {
            const songId = addSingleId;
            setAddSingleId("");
            edit((current) => setSongAssignment(current, songId, { type: "single" }));
          }}
        >
          Add to singles
        </button>
      </div>

      <h3>Catalog</h3>
      {content.songs.length === 0 ? <p className="hint">No songs yet.</p> : null}
      {content.songs.map((song) => (
        <details className={song.hidden ? "card is-hidden" : "card"} key={song.id} data-song-id={song.id}>
          <summary>
            <span className="collapsed-line">
              <strong className="grow">{song.title || "New song"}</strong>
              <span>{song.releaseDate}</span>
              <span className="badge">{assignmentSummary(content, song)}</span>
              {song.hidden ? <span className="badge">Hidden</span> : null}
              <span className="row-actions">
                <button
                  type="button"
                  className="secondary"
                  data-action={song.hidden ? "show-song" : "hide-song"}
                  onClick={(event) => {
                    stopToggle(event);
                    edit((current) => setSongHidden(current, song.id, !song.hidden));
                  }}
                >
                  {song.hidden ? "Show" : "Hide"}
                </button>
                <button
                  type="button"
                  className="danger"
                  data-action="delete-song"
                  onClick={(event) => {
                    stopToggle(event);
                    setDeleteSongId(song.id);
                  }}
                >
                  Delete
                </button>
              </span>
            </span>
          </summary>
          <div className="admin-grid">
            <Field label="Title" value={song.title} onChange={(title) => edit((current) => patchSong(current, song.id, { title }))} />
            <Field
              label="Year"
              value={song.releaseDate}
              onChange={(releaseDate) => edit((current) => patchSong(current, song.id, { releaseDate }))}
            />
            <Field
              label="Duration"
              value={song.duration}
              onChange={(duration) => edit((current) => patchSong(current, song.id, { duration }))}
            />
            <label className="field">
              Assignment
              <select
                value={assignmentValue(song)}
                onChange={(event) => {
                  const value = event.target.value;
                  edit((current) => {
                    if (value === "single") return setSongAssignment(current, song.id, { type: "single" });
                    if (value === "unassigned") return setSongAssignment(current, song.id, { type: "unassigned" });
                    return setSongAssignment(current, song.id, { type: "album", albumId: value.slice("album:".length) });
                  });
                }}
              >
                <option value="unassigned">Unassigned</option>
                <option value="single">Single</option>
                {content.albums.map((album) => (
                  <option key={album.id} value={`album:${album.id}`}>
                    {album.title || "Untitled album"}
                  </option>
                ))}
              </select>
            </label>
            {song.assignment.type === "single" ? (
              <>
                <Field
                  label="Song table label"
                  value={song.singleLabel}
                  onChange={(singleLabel) => edit((current) => patchSong(current, song.id, { singleLabel }))}
                />
                <Field
                  label="Cover caption"
                  value={song.singleCaption}
                  onChange={(singleCaption) => edit((current) => patchSong(current, song.id, { singleCaption }))}
                />
                <Field
                  label="Cover description"
                  value={song.singleAlt}
                  wide
                  onChange={(singleAlt) => edit((current) => patchSong(current, song.id, { singleAlt }))}
                />
              </>
            ) : null}
            <ImageField
              label="Artwork"
              value={song.albumArt}
              onChange={(albumArt) => edit((current) => patchSong(current, song.id, { albumArt }))}
            />
            <Field
              label="Bandcamp"
              value={song.links.bandcamp}
              wide
              onChange={(bandcamp) => edit((current) => patchSongLinks(current, song.id, { bandcamp }))}
            />
            <Field
              label="Spotify"
              value={song.links.spotify}
              wide
              onChange={(spotify) => edit((current) => patchSongLinks(current, song.id, { spotify }))}
            />
            <Field
              label="YouTube"
              value={song.links.youtube}
              wide
              onChange={(youtube) => edit((current) => patchSongLinks(current, song.id, { youtube }))}
            />
          </div>
        </details>
      ))}
      <button type="button" onClick={() => edit((current) => ({ ...current, songs: [...current.songs, emptySong()] }))}>
        Add song
      </button>
      {songToDelete ? (
        <ChoiceDialog
          dialog="delete-song"
          title={`Delete ${songToDelete.title || "this song"}?`}
          choices={[
            {
              label: "Delete",
              danger: true,
              onClick: () => {
                const songId = songToDelete.id;
                setDeleteSongId(null);
                edit((current) => removeSong(current, songId));
              },
            },
          ]}
          onCancel={() => setDeleteSongId(null)}
        />
      ) : null}
    </section>
  );
}

function AlbumsTab({ content, edit }: { content: SiteContent; edit: Editor }) {
  const [hideAlbumId, setHideAlbumId] = useState<string | null>(null);
  const [deleteAlbumId, setDeleteAlbumId] = useState<string | null>(null);
  const albumToHide = content.albums.find((album) => album.id === hideAlbumId);
  const albumToDelete = content.albums.find((album) => album.id === deleteAlbumId);

  return (
    <section className="admin-section">
      <h2>Albums</h2>
      <p className="hint">
        Albums and EPs both appear under the albums heading, in this order. Putting a song on an album clears Single. Marking it Single on the Songs tab takes it off the album.
      </p>
      {content.albums.length === 0 ? <p className="hint">No albums yet.</p> : null}
      {content.albums.map((album, index) => (
        <details className={album.hidden ? "card is-hidden" : "card"} key={album.id} data-album-id={album.id}>
          <summary>
            <span className="collapsed-line">
              {album.image ? <img className="mini-thumb" src={publicImage(album.image)} alt="" /> : <span className="mini-thumb" />}
              <strong className="grow">{album.title || "New album"}</strong>
              <span className="badge">{album.type === "ep" ? "EP" : "Album"}</span>
              <span>{album.trackIds.length} {album.trackIds.length === 1 ? "track" : "tracks"}</span>
              {album.hidden ? <span className="badge">Hidden</span> : null}
              <span className="row-actions">
                <button type="button" className="secondary" onClick={(event) => { stopToggle(event); edit((current) => reorderAlbums(current, index, -1)); }}>
                  Up
                </button>
                <button type="button" className="secondary" onClick={(event) => { stopToggle(event); edit((current) => reorderAlbums(current, index, 1)); }}>
                  Down
                </button>
                <button
                  type="button"
                  className="secondary"
                  data-action={album.hidden ? "show-album" : "hide-album"}
                  onClick={(event) => {
                    stopToggle(event);
                    if (album.hidden) edit((current) => showAlbum(current, album.id));
                    else setHideAlbumId(album.id);
                  }}
                >
                  {album.hidden ? "Show" : "Hide"}
                </button>
                <button
                  type="button"
                  className="danger"
                  data-action="delete-album"
                  onClick={(event) => {
                    stopToggle(event);
                    setDeleteAlbumId(album.id);
                  }}
                >
                  Delete
                </button>
              </span>
            </span>
          </summary>
          <AlbumFields album={album} content={content} edit={edit} />
        </details>
      ))}
      <button type="button" onClick={() => edit((current) => ({ ...current, albums: [...current.albums, emptyAlbum()] }))}>
        Add album
      </button>
      {albumToHide ? (
        <ChoiceDialog
          dialog="hide-album"
          title={`Hide ${albumToHide.title || "this album"}?`}
          choices={[
            {
              label: "Hide this album only",
              onClick: () => {
                const albumId = albumToHide.id;
                setHideAlbumId(null);
                edit((current) => hideAlbum(current, albumId, false));
              },
            },
            {
              label: "Hide this album and its songs",
              onClick: () => {
                const albumId = albumToHide.id;
                setHideAlbumId(null);
                edit((current) => hideAlbum(current, albumId, true));
              },
            },
          ]}
          onCancel={() => setHideAlbumId(null)}
        />
      ) : null}
      {albumToDelete ? (
        <ChoiceDialog
          dialog="delete-album"
          title={`Delete ${albumToDelete.title || "this album"}?`}
          choices={[
            {
              label: "Delete this album only",
              danger: true,
              onClick: () => {
                const albumId = albumToDelete.id;
                setDeleteAlbumId(null);
                edit((current) => removeAlbum(current, albumId));
              },
            },
            {
              label: "Delete this album and its songs",
              danger: true,
              onClick: () => {
                const albumId = albumToDelete.id;
                setDeleteAlbumId(null);
                edit((current) => removeAlbumAndSongs(current, albumId));
              },
            },
          ]}
          onCancel={() => setDeleteAlbumId(null)}
        />
      ) : null}
    </section>
  );
}

function ChoiceDialog({
  dialog,
  title,
  choices,
  onCancel,
}: {
  dialog: string;
  title: string;
  choices: { label: string; onClick: () => void; danger?: boolean }[];
  onCancel: () => void;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" data-dialog={dialog}>
      <div className="modal">
        <p>{title}</p>
        <div className="row-actions">
          {choices.map((choice) => (
            <button key={choice.label} type="button" className={choice.danger ? "danger" : ""} onClick={choice.onClick}>
              {choice.label}
            </button>
          ))}
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function AlbumFields({ album, content, edit }: { album: Album; content: SiteContent; edit: Editor }) {
  const [pick, setPick] = useState("");
  const tracks = album.trackIds
    .map((id) => content.songs.find((song) => song.id === id))
    .filter((song): song is Song => !!song);
  const available = content.songs.filter((song) => !album.trackIds.includes(song.id));

  return (
    <div>
      <div className="admin-grid">
        <label className="field">
          Type
          <select
            value={album.type}
            onChange={(event) => {
              const type = event.target.value === "ep" ? "ep" : "album";
              edit((current) => patchAlbum(current, album.id, { type }));
            }}
          >
            <option value="album">Album</option>
            <option value="ep">EP</option>
          </select>
        </label>
        <Field
          label="Public title"
          value={album.title}
          onChange={(title) => edit((current) => patchAlbum(current, album.id, { title }))}
        />
        <Field
          label="Caption under the art"
          value={album.caption}
          wide
          onChange={(caption) => edit((current) => patchAlbum(current, album.id, { caption }))}
        />
        <ImageField
          label="Cover"
          value={album.image}
          onChange={(image) => edit((current) => patchAlbum(current, album.id, { image }))}
        />
        <Field
          label="Cover description"
          value={album.alt}
          wide
          onChange={(alt) => edit((current) => patchAlbum(current, album.id, { alt }))}
        />
      </div>
      <PlatformsEditor
        platforms={album.platforms}
        onChange={(platforms) => edit((current) => patchAlbum(current, album.id, { platforms }))}
      />
      <h3>Tracks</h3>
      <p className="hint">This order is only the album. The song table still sorts by year.</p>
      {tracks.length === 0 ? <p className="hint">No tracks yet.</p> : null}
      {tracks.map((song, index) => (
        <div className={song.hidden ? "track-row is-hidden" : "track-row"} key={song.id}>
          <span>{song.title || "Untitled"}{song.hidden ? " (hidden)" : ""}</span>
          <div className="row-actions">
            <button type="button" className="secondary" onClick={() => edit((current) => moveAlbumTrack(current, album.id, index, -1))}>
              Up
            </button>
            <button type="button" className="secondary" onClick={() => edit((current) => moveAlbumTrack(current, album.id, index, 1))}>
              Down
            </button>
            <button
              type="button"
              className="danger"
              onClick={() =>
                edit((current) => {
                  const currentAlbum = current.albums.find((item) => item.id === album.id);
                  return setAlbumTracks(
                    current,
                    album.id,
                    (currentAlbum?.trackIds ?? []).filter((id) => id !== song.id),
                  );
                })
              }
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      <div className="picker">
        <label className="field">
          Add a song
          <select value={pick} onChange={(event) => setPick(event.target.value)}>
            <option value="">Choose a song</option>
            {available.map((song) => (
              <option key={song.id} value={song.id}>
                {song.title || "Untitled"} — {assignmentSummary(content, song)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!pick}
          onClick={() => {
            const songId = pick;
            setPick("");
            edit((current) => {
              const currentAlbum = current.albums.find((item) => item.id === album.id);
              return setAlbumTracks(current, album.id, [...(currentAlbum?.trackIds ?? []), songId]);
            });
          }}
        >
          Add to album
        </button>
      </div>
    </div>
  );
}
