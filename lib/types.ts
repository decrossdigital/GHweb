export type PlatformLink = {
  label: string;
  href: string;
};

export type SongLinks = {
  bandcamp: string;
  spotify: string;
  youtube: string;
};

export type Assignment =
  | { type: "unassigned" }
  | { type: "single" }
  | { type: "album"; albumId: string };

export type Song = {
  id: string;
  title: string;
  duration: string;
  releaseDate: string;
  albumArt: string;
  links: SongLinks;
  assignment: Assignment;
  singleLabel: string;
  singleCaption: string;
  singleAlt: string;
  hidden: boolean;
};

export type Album = {
  id: string;
  type: "album" | "ep";
  title: string;
  caption: string;
  image: string;
  alt: string;
  platforms: PlatformLink[];
  trackIds: string[];
  hidden: boolean;
};

export type IconLink = {
  id: string;
  href: string;
  icon: string;
  label: string;
  active: boolean;
};

export type NavItem = {
  id: string;
  href: string;
  icon: string;
  label: string;
  active: boolean;
};

export type HomeImageLink = {
  id: string;
  type: "image";
  href: string;
  src: string;
  alt: string;
};

export type HomeIconLink = {
  id: string;
  type: "icon";
  href: string;
  icon: string;
  label: string;
  active: boolean;
};

export type HomeTextLink = {
  id: string;
  type: "text";
  text: string;
};

export type HomeLink = HomeImageLink | HomeIconLink | HomeTextLink;

export type SiteContent = {
  meta: {
    title: string;
    description: string;
    keywords: string;
    author: string;
    siteUrl: string;
  };
  nav: NavItem[];
  home: {
    name: string;
    taglineLine1: string;
    taglineLine2: string;
    producerNote: string;
    producerUrl: string;
    portrait: { src: string; alt: string };
    jumplink: { href: string; label: string };
    links: HomeLink[];
  };
  discography: {
    title: string;
    intro: string;
    songsLinkLabel: string;
    albumsHeading: string;
    singlesHeading: string;
  };
  contact: {
    title: string;
    links: IconLink[];
  };
  songsPanel: {
    title: string;
    intro: string;
    discographyLinkLabel: string;
  };
  albums: Album[];
  songs: Song[];
  singlesOrder: string[];
  footer: {
    credit: string;
  };
  jsonLd: Record<string, unknown>;
};
