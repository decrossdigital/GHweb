import type { Album, Assignment, PlatformLink, SiteContent, Song } from "./types";

export function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const next = index + direction;
  if (next < 0 || next >= items.length) return items;
  const copy = items.slice();
  const [item] = copy.splice(index, 1);
  copy.splice(next, 0, item);
  return copy;
}

export function albumById(content: SiteContent, albumId: string): Album | undefined {
  return content.albums.find((album) => album.id === albumId);
}

export function tableAlbumLabel(content: SiteContent, song: Song): string {
  if (song.assignment.type === "single") {
    return song.singleLabel.trim() || "Single";
  }
  if (song.assignment.type === "album") {
    const album = albumById(content, song.assignment.albumId);
    if (!album || album.hidden) return "";
    return album.title;
  }
  return "";
}

export function assignmentSummary(content: SiteContent, song: Song): string {
  if (song.assignment.type === "unassigned") return "Unassigned";
  if (song.assignment.type === "single") return song.singleLabel.trim() || "Single";
  if (song.assignment.type === "album") {
    return albumById(content, song.assignment.albumId)?.title || "Album";
  }
  return "Unassigned";
}

export function orderedSingles(content: SiteContent): Song[] {
  const byId = new Map(content.songs.map((song) => [song.id, song]));
  return content.singlesOrder
    .map((id) => byId.get(id))
    .filter((song): song is Song => !!song && song.assignment.type === "single");
}

export function songsByYear(songs: Song[]): Song[] {
  return [...songs].sort((a, b) => parseInt(b.releaseDate, 10) - parseInt(a.releaseDate, 10));
}

export function singlePlatforms(song: Song): PlatformLink[] {
  return [
    { label: "YouTube", href: song.links.youtube },
    { label: "Bandcamp", href: song.links.bandcamp },
    { label: "Spotify", href: song.links.spotify },
  ];
}

export function reconcile(content: SiteContent): SiteContent {
  const albumIds = new Set(content.albums.map((album) => album.id));
  const songs = content.songs.map((song) => {
    if (song.assignment.type === "album" && !albumIds.has(song.assignment.albumId)) {
      return { ...song, assignment: { type: "unassigned" as const } };
    }
    if (song.assignment.type === "single") {
      const singleLabel = song.singleLabel.trim() || "Single";
      return singleLabel === song.singleLabel ? song : { ...song, singleLabel };
    }
    return song;
  });
  const songById = new Map(songs.map((song) => [song.id, song]));

  const albums = content.albums.map((album) => {
    const kept = album.trackIds.filter((id) => {
      const song = songById.get(id);
      return song?.assignment.type === "album" && song.assignment.albumId === album.id;
    });
    const seen = new Set(kept);
    for (const song of songs) {
      if (song.assignment.type === "album" && song.assignment.albumId === album.id && !seen.has(song.id)) {
        kept.push(song.id);
        seen.add(song.id);
      }
    }
    return { ...album, trackIds: kept };
  });

  const singlesOrder: string[] = [];
  const seenSingles = new Set<string>();
  for (const id of content.singlesOrder) {
    const song = songById.get(id);
    if (song?.assignment.type === "single" && !seenSingles.has(id)) {
      singlesOrder.push(id);
      seenSingles.add(id);
    }
  }
  for (const song of songs) {
    if (song.assignment.type === "single" && !seenSingles.has(song.id)) {
      singlesOrder.push(song.id);
    }
  }

  return { ...content, songs, albums, singlesOrder };
}

export function setSongAssignment(content: SiteContent, songId: string, assignment: Assignment): SiteContent {
  const songs = content.songs.map((song) => {
    if (song.id !== songId) return song;
    if (assignment.type === "single") {
      return { ...song, assignment, singleLabel: song.singleLabel.trim() || "Single" };
    }
    return { ...song, assignment };
  });
  let albums = content.albums.map((album) => ({
    ...album,
    trackIds: album.trackIds.filter((id) => id !== songId),
  }));
  let singlesOrder = content.singlesOrder.filter((id) => id !== songId);
  if (assignment.type === "album") {
    albums = albums.map((album) =>
      album.id === assignment.albumId ? { ...album, trackIds: [...album.trackIds, songId] } : album,
    );
  }
  if (assignment.type === "single") {
    singlesOrder = [...singlesOrder, songId];
  }
  return reconcile({ ...content, songs, albums, singlesOrder });
}

export function setAlbumTracks(content: SiteContent, albumId: string, trackIds: string[]): SiteContent {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const id of trackIds) {
    if (!seen.has(id) && content.songs.some((song) => song.id === id)) {
      unique.push(id);
      seen.add(id);
    }
  }
  const songs = content.songs.map((song) => {
    if (seen.has(song.id)) {
      return { ...song, assignment: { type: "album" as const, albumId } };
    }
    if (song.assignment.type === "album" && song.assignment.albumId === albumId) {
      return { ...song, assignment: { type: "unassigned" as const } };
    }
    return song;
  });
  const albums = content.albums.map((album) => {
    if (album.id === albumId) return { ...album, trackIds: unique };
    return { ...album, trackIds: album.trackIds.filter((id) => !seen.has(id)) };
  });
  const singlesOrder = content.singlesOrder.filter((id) => !seen.has(id));
  return reconcile({ ...content, songs, albums, singlesOrder });
}

export function moveAlbumTrack(
  content: SiteContent,
  albumId: string,
  index: number,
  direction: -1 | 1,
): SiteContent {
  const album = albumById(content, albumId);
  if (!album) return content;
  return setAlbumTracks(content, albumId, moveItem(album.trackIds, index, direction));
}

export function patchSong(
  content: SiteContent,
  songId: string,
  patch: Partial<Omit<Song, "id" | "assignment">>,
): SiteContent {
  return {
    ...content,
    songs: content.songs.map((song) =>
      song.id === songId ? { ...song, ...patch, id: song.id, assignment: song.assignment } : song,
    ),
  };
}

export function patchAlbum(
  content: SiteContent,
  albumId: string,
  patch: Partial<Omit<Album, "id" | "trackIds">>,
): SiteContent {
  return {
    ...content,
    albums: content.albums.map((album) =>
      album.id === albumId ? { ...album, ...patch, id: album.id, trackIds: album.trackIds } : album,
    ),
  };
}

export function removeSong(content: SiteContent, songId: string): SiteContent {
  return reconcile({
    ...content,
    songs: content.songs.filter((song) => song.id !== songId),
    albums: content.albums.map((album) => ({
      ...album,
      trackIds: album.trackIds.filter((id) => id !== songId),
    })),
    singlesOrder: content.singlesOrder.filter((id) => id !== songId),
  });
}

export function removeAlbum(content: SiteContent, albumId: string): SiteContent {
  return reconcile({
    ...content,
    albums: content.albums.filter((album) => album.id !== albumId),
    songs: content.songs.map((song) =>
      song.assignment.type === "album" && song.assignment.albumId === albumId
        ? { ...song, assignment: { type: "unassigned" } }
        : song,
    ),
  });
}

export function removeAlbumAndSongs(content: SiteContent, albumId: string): SiteContent {
  const trackIds = new Set(albumById(content, albumId)?.trackIds ?? []);
  return reconcile({
    ...content,
    albums: content.albums.filter((album) => album.id !== albumId),
    songs: content.songs.filter((song) => !trackIds.has(song.id)),
    singlesOrder: content.singlesOrder.filter((id) => !trackIds.has(id)),
  });
}

export function setSongHidden(content: SiteContent, songId: string, hidden: boolean): SiteContent {
  return {
    ...content,
    songs: content.songs.map((song) => (song.id === songId ? { ...song, hidden } : song)),
  };
}

export function hideAlbum(content: SiteContent, albumId: string, andSongs: boolean): SiteContent {
  const trackIds = new Set(albumById(content, albumId)?.trackIds ?? []);
  return {
    ...content,
    albums: content.albums.map((album) => (album.id === albumId ? { ...album, hidden: true } : album)),
    songs: andSongs
      ? content.songs.map((song) => (trackIds.has(song.id) ? { ...song, hidden: true } : song))
      : content.songs,
  };
}

export function showAlbum(content: SiteContent, albumId: string): SiteContent {
  const trackIds = new Set(albumById(content, albumId)?.trackIds ?? []);
  return {
    ...content,
    albums: content.albums.map((album) => (album.id === albumId ? { ...album, hidden: false } : album)),
    songs: content.songs.map((song) => (trackIds.has(song.id) ? { ...song, hidden: false } : song)),
  };
}

export function reorderAlbums(content: SiteContent, index: number, direction: -1 | 1): SiteContent {
  return { ...content, albums: moveItem(content.albums, index, direction) };
}

export function reorderSingles(content: SiteContent, index: number, direction: -1 | 1): SiteContent {
  return { ...content, singlesOrder: moveItem(content.singlesOrder, index, direction) };
}
