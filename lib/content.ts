import { promises as fs } from "fs";
import path from "path";
import { connection } from "next/server";
import { reconcile } from "./catalog";
import type {
  Album,
  Assignment,
  HomeLink,
  IconLink,
  NavItem,
  SiteContent,
  Song,
} from "./types";

const CONTENT_PATH = path.join(process.cwd(), "data", "content.json");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be text`);
  }
  return value;
}

function bool(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be true or false`);
  }
  return value;
}

function flag(value: unknown, label: string): boolean {
  if (value === undefined) return false;
  return bool(value, label);
}

function arr(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be a list`);
  }
  return value;
}

function uniqueIds(ids: string[], label: string) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`${label} repeats “${id}”`);
    seen.add(id);
  }
}

function parsePlatforms(value: unknown, label: string) {
  return arr(value, label).map((item, index) => {
    if (!isRecord(item)) throw new Error(`${label} ${index + 1} is invalid`);
    return {
      label: str(item.label, `${label} ${index + 1} label`),
      href: str(item.href, `${label} ${index + 1} link`),
    };
  });
}

function parseAssignment(value: unknown, label: string): Assignment {
  if (!isRecord(value)) throw new Error(`${label} assignment is invalid`);
  const type = str(value.type, `${label} assignment`);
  if (type === "unassigned" || type === "single") return { type };
  if (type === "album") {
    return { type, albumId: str(value.albumId, `${label} album`) };
  }
  throw new Error(`${label} assignment must be unassigned, single, or album`);
}

function parseSong(value: unknown, index: number): Song {
  const label = `Song ${index + 1}`;
  if (!isRecord(value) || !isRecord(value.links)) {
    throw new Error(`${label} is invalid`);
  }
  return {
    id: str(value.id, `${label} id`),
    title: str(value.title, `${label} title`),
    duration: str(value.duration, `${label} duration`),
    releaseDate: str(value.releaseDate, `${label} year`),
    albumArt: str(value.albumArt, `${label} artwork`),
    links: {
      bandcamp: str(value.links.bandcamp, `${label} Bandcamp link`),
      spotify: str(value.links.spotify, `${label} Spotify link`),
      youtube: str(value.links.youtube, `${label} YouTube link`),
    },
    assignment: parseAssignment(value.assignment, label),
    singleLabel: str(value.singleLabel, `${label} single label`),
    singleCaption: str(value.singleCaption, `${label} cover caption`),
    singleAlt: str(value.singleAlt, `${label} cover description`),
    hidden: flag(value.hidden, `${label} hidden`),
  };
}

function parseAlbum(value: unknown, index: number): Album {
  const label = `Album ${index + 1}`;
  if (!isRecord(value)) throw new Error(`${label} is invalid`);
  const type = str(value.type, `${label} type`);
  if (type !== "album" && type !== "ep") {
    throw new Error(`${label} type must be album or ep`);
  }
  return {
    id: str(value.id, `${label} id`),
    type,
    title: str(value.title, `${label} title`),
    caption: str(value.caption, `${label} caption`),
    image: str(value.image, `${label} cover`),
    alt: str(value.alt, `${label} alt text`),
    platforms: parsePlatforms(value.platforms, `${label} platforms`),
    trackIds: arr(value.trackIds, `${label} tracks`).map((item, trackIndex) =>
      str(item, `${label} track ${trackIndex + 1}`),
    ),
    hidden: flag(value.hidden, `${label} hidden`),
  };
}

function parseIconLink(value: unknown, label: string): IconLink {
  if (!isRecord(value)) throw new Error(`${label} is invalid`);
  return {
    id: str(value.id, `${label} id`),
    href: str(value.href, `${label} link`),
    icon: str(value.icon, `${label} icon`),
    label: str(value.label, `${label} label`),
    active: bool(value.active, `${label} active`),
  };
}

function parseNav(value: unknown, index: number): NavItem {
  return parseIconLink(value, `Navigation item ${index + 1}`);
}

function parseHomeLink(value: unknown, index: number): HomeLink {
  const label = `Home link ${index + 1}`;
  if (!isRecord(value)) throw new Error(`${label} is invalid`);
  const id = str(value.id, `${label} id`);
  const type = str(value.type, `${label} type`);
  if (type === "text") {
    return { id, type, text: str(value.text, `${label} text`) };
  }
  if (type === "image") {
    return {
      id,
      type,
      href: str(value.href, `${label} link`),
      src: str(value.src, `${label} image`),
      alt: str(value.alt, `${label} alt text`),
    };
  }
  if (type === "icon") {
    return {
      id,
      type,
      href: str(value.href, `${label} link`),
      icon: str(value.icon, `${label} icon`),
      label: str(value.label, `${label} label`),
      active: bool(value.active, `${label} active`),
    };
  }
  throw new Error(`${label} type must be image, icon, or text`);
}

export function parseContent(input: unknown): SiteContent {
  if (!isRecord(input)) throw new Error("Content must be an object");
  const meta = input.meta;
  const home = input.home;
  const discography = input.discography;
  const contact = input.contact;
  const songsPanel = input.songsPanel;
  const footer = input.footer;
  if (!isRecord(meta) || !isRecord(home) || !isRecord(home.portrait) || !isRecord(home.jumplink)) {
    throw new Error("Home or site text is missing");
  }
  if (!isRecord(discography) || !isRecord(contact) || !isRecord(songsPanel) || !isRecord(footer)) {
    throw new Error("Discography, contact, songs, or footer is missing");
  }
  if (!isRecord(input.jsonLd)) throw new Error("Search markup is missing");

  const songs = arr(input.songs, "Songs").map(parseSong);
  const albums = arr(input.albums, "Albums").map(parseAlbum);
  uniqueIds(songs.map((song) => song.id), "Songs");
  uniqueIds(albums.map((album) => album.id), "Albums");

  return reconcile({
    meta: {
      title: str(meta.title, "Title"),
      description: str(meta.description, "Description"),
      keywords: str(meta.keywords, "Keywords"),
      author: str(meta.author, "Author"),
      siteUrl: str(meta.siteUrl, "Site URL"),
    },
    nav: arr(input.nav, "Navigation").map(parseNav),
    home: {
      name: str(home.name, "Name"),
      taglineLine1: str(home.taglineLine1, "Tagline line 1"),
      taglineLine2: str(home.taglineLine2, "Tagline line 2"),
      producerNote: str(home.producerNote, "Producer note"),
      producerUrl: str(home.producerUrl, "Producer link"),
      portrait: {
        src: str(home.portrait.src, "Portrait image"),
        alt: str(home.portrait.alt, "Portrait alt text"),
      },
      jumplink: {
        href: str(home.jumplink.href, "Portrait link"),
        label: str(home.jumplink.label, "Portrait link label"),
      },
      links: arr(home.links, "Home links").map(parseHomeLink),
    },
    discography: {
      title: str(discography.title, "Discography title"),
      intro: str(discography.intro, "Discography intro"),
      songsLinkLabel: str(discography.songsLinkLabel, "Songs link label"),
      albumsHeading: str(discography.albumsHeading, "Albums heading"),
      singlesHeading: str(discography.singlesHeading, "Singles heading"),
    },
    contact: {
      title: str(contact.title, "Contact title"),
      links: arr(contact.links, "Contact links").map((item, index) =>
        parseIconLink(item, `Contact link ${index + 1}`),
      ),
    },
    songsPanel: {
      title: str(songsPanel.title, "Songs title"),
      intro: str(songsPanel.intro, "Songs intro"),
      discographyLinkLabel: str(songsPanel.discographyLinkLabel, "Discography link label"),
    },
    albums,
    songs,
    singlesOrder: arr(input.singlesOrder, "Singles order").map((item, index) =>
      str(item, `Singles order ${index + 1}`),
    ),
    footer: {
      credit: str(footer.credit, "Footer credit"),
    },
    jsonLd: input.jsonLd,
  });
}

export async function readContent(): Promise<SiteContent> {
  await connection();
  const raw = await fs.readFile(CONTENT_PATH, "utf8");
  return parseContent(JSON.parse(raw));
}

export async function writeContent(input: unknown): Promise<SiteContent> {
  const content = parseContent(input);
  const json = JSON.stringify(content, null, 2) + "\n";
  const tempPath = `${CONTENT_PATH}.tmp`;
  await fs.writeFile(tempPath, json, "utf8");
  await fs.rename(tempPath, CONTENT_PATH);
  return content;
}
