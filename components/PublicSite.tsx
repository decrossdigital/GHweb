import { Fragment, type CSSProperties } from "react";
import Script from "next/script";
import { orderedSingles, singlePlatforms, songsByYear, tableAlbumLabel } from "@/lib/catalog";
import { jsonLdScript, safeHref } from "@/lib/safe-url";
import type { HomeLink, PlatformLink, SiteContent, Song } from "@/lib/types";

const SONGS_CSS = `
#songs .panel { max-height: none; }
#songsTable tbody tr:hover { background: #f0f0f0; }
#songs div[style*="overflow-y"] {
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-top: 20px;
}
#songs div[style*="overflow-y"]::-webkit-scrollbar { width: 8px; }
#songs div[style*="overflow-y"]::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
#songs div[style*="overflow-y"]::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; }
#songs div[style*="overflow-y"]::-webkit-scrollbar-thumb:hover { background: #555; }
a.jumplink[href="#songs"]:hover,
#songs a.jumplink[href="#discography"]:hover { color: #fe0000 !important; }
@media screen and (min-width: 737px) {
  #wrapper { opacity: 1 !important; }
  #discography,
  #contact,
  #songs { display: none; }
  #discography:target,
  #contact:target,
  #songs:target { display: block; }
  body:has(#discography:target) #home,
  body:has(#contact:target) #home,
  body:has(#songs:target) #home { display: none; }
}
`;

const captionStyle: CSSProperties = { fontSize: "0.9em", height: "40%" };
const browseStyle: CSSProperties = {
  fontSize: "0.9em",
  textDecoration: "none",
  color: "#1a2332",
  fontWeight: 400,
  transition: "color 0.3s",
};
const introStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};
const thStyle: CSSProperties = { padding: "10px 8px", textAlign: "left", fontWeight: 400 };
const cellStyle: CSSProperties = { padding: "10px 8px" };

function chunk<T>(items: T[], size: number) {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}

function HomeLinks({ links }: { links: HomeLink[] }) {
  return links.map((link) => {
    if (link.type === "text") {
      return (
        <span key={link.id}>
          {" "}
          {link.text}{" "}
        </span>
      );
    }
    if (link.type === "image") {
      const href = safeHref(link.href);
      const image = <img src={link.src} alt={link.alt} />;
      if (!href) return <span key={link.id}>{image}</span>;
      return (
        <a key={link.id} href={href} target="_blank" rel="noopener noreferrer">
          {image}
        </a>
      );
    }
    const href = safeHref(link.href);
    const className = `icon ${link.icon}${link.active ? " active" : ""}`;
    if (!href) {
      return (
        <span key={link.id} className={className}>
          {link.label}
        </span>
      );
    }
    return (
      <a key={link.id} href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {link.label}
      </a>
    );
  });
}

function Platforms({ platforms }: { platforms: PlatformLink[] }) {
  return platforms.map((platform, index) => {
    const href = safeHref(platform.href);
    return (
      <span key={`${platform.label}-${index}`}>
        {index > 0 ? " | " : null}
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {platform.label}
          </a>
        ) : (
          platform.label
        )}
      </span>
    );
  });
}

function ListenLinks({ song }: { song: Song }) {
  const parts = [
    { label: "Bandcamp", href: safeHref(song.links.bandcamp) },
    { label: "Spotify", href: safeHref(song.links.spotify) },
    { label: "YouTube", href: safeHref(song.links.youtube) },
  ].filter((part) => part.href);

  return parts.map((part, index) => (
    <span key={part.label}>
      {index > 0 ? <br /> : null}
      <a href={part.href} target="_blank" rel="noopener noreferrer" style={{ color: "#1a2332", textDecoration: "none" }}>
        {part.label}
      </a>
    </span>
  ));
}

export function PublicSite({ content }: { content: SiteContent }) {
  const year = new Date().getFullYear();
  const songs = songsByYear(content.songs.filter((song) => !song.hidden)).map((song) => ({
    song,
    album: tableAlbumLabel(content, song),
  }));
  const releaseSections = [
    {
      id: "albums",
      heading: content.discography.albumsHeading,
      releases: content.albums.filter((album) => !album.hidden).map((album) => ({
        id: album.id,
        image: album.image,
        alt: album.alt,
        caption: album.caption,
        platforms: album.platforms,
      })),
    },
    {
      id: "singles",
      heading: content.discography.singlesHeading,
      releases: orderedSingles(content)
        .filter((song) => !song.hidden)
        .map((song) => ({
        id: song.id,
        image: song.albumArt,
        alt: song.singleAlt || song.title,
        caption: song.singleCaption,
        platforms: singlePlatforms(song),
      })),
    },
  ];

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,300italic,400italic"
      />
      <link rel="stylesheet" href="/css/style.css" />
      <link rel="stylesheet" href="/css/style-desktop.css" media="screen and (min-width: 737px)" />
      <link rel="stylesheet" href="/css/style-mobile.css" media="screen and (max-width: 736px)" />
      <style>{SONGS_CSS}</style>
      <noscript>
        <link rel="stylesheet" href="/css/skel.css" />
        <link rel="stylesheet" href="/css/style-noscript.css" />
      </noscript>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(content.jsonLd) }} />

      <div id="wrapper">
        <nav id="nav">
          {content.nav.map((item) => (
            <a
              key={item.id}
              href={safeHref(item.href)}
              className={`icon ${item.icon}${item.active ? " active" : ""}`}
            >
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div id="main">
          <article id="home" className="panel">
            <header>
              <h1>{content.home.name}</h1>
              <p>
                {content.home.taglineLine1}
                <br />
                {content.home.taglineLine2}
                <br />
                <br />
                <span style={{ display: "inline-block", textAlign: "right", width: "100%" }}>
                  <a
                    href={safeHref(content.home.producerUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none", fontSize: "16px", fontStyle: "italic" }}
                  >
                    {content.home.producerNote}
                  </a>
                </span>
                <br />
                <br />
                <span
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    textAlign: "center",
                    width: "100%",
                  }}
                />
                <HomeLinks links={content.home.links} />
              </p>
            </header>
            <a href={safeHref(content.home.jumplink.href)} className="jumplink pic">
              <span className="arrow icon fa-chevron-right">
                <span>{content.home.jumplink.label}</span>
              </span>
              <img src={content.home.portrait.src} alt={content.home.portrait.alt} />
            </a>
          </article>

          <article id="discography" className="panel">
            <header>
              <h1>{content.discography.title}</h1>
            </header>
            <p style={introStyle}>
              <span>{content.discography.intro}</span>
              <a href="#songs" className="jumplink" style={browseStyle}>
                {content.discography.songsLinkLabel}
              </a>
            </p>
            {releaseSections.map((section) => (
              <section key={section.id}>
                <h3>{section.heading}</h3>
                {chunk(section.releases, 3).map((row, rowIndex) => (
                  <div className="row" key={`${section.id}-${rowIndex}`}>
                    {row.map((release) => (
                      <div className="4u" key={release.id}>
                        <img src={release.image} alt={release.alt} className="image fit" />
                        <span style={captionStyle}>
                          {release.caption}
                          <br />
                          <Platforms platforms={release.platforms} />
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </section>
            ))}
          </article>

          <article id="contact" className="panel">
            <header>
              <h2>{content.contact.title}</h2>
              <br />
              <br />
              <span
                style={{
                  display: "flex",
                  justifyContent: "center",
                  fontSize: "2.9em",
                  height: "40%",
                }}
              >
                {content.contact.links.map((link, index) => (
                  <Fragment key={link.id}>
                    {index > 0 ? "\u00A0\u00A0" : null}
                    <a
                      href={safeHref(link.href)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`icon ${link.icon}${link.active ? " active" : ""}`}
                    >
                      {link.label}
                    </a>
                  </Fragment>
                ))}
              </span>
            </header>
          </article>

          <article id="songs" className="panel">
            <header>
              <h1>{content.songsPanel.title}</h1>
            </header>
            <p style={introStyle}>
              <span>{content.songsPanel.intro}</span>
              <a href="#discography" className="jumplink" style={browseStyle}>
                {content.songsPanel.discographyLinkLabel}
              </a>
            </p>
            <div style={{ overflowY: "auto", maxHeight: "500px" }}>
              <table id="songsTable" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85em" }}>
                <thead style={{ position: "sticky", top: 0, background: "#363636", color: "white", zIndex: 1 }}>
                  <tr>
                    <th style={thStyle}>Cover</th>
                    <th style={thStyle}>Song</th>
                    <th style={thStyle}>Duration</th>
                    <th style={thStyle}>Year</th>
                    <th style={thStyle}>In Album</th>
                    <th style={thStyle}>Listen</th>
                  </tr>
                </thead>
                <tbody id="songsBody">
                  {songs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "40px" }}>
                        No songs in the catalog.
                      </td>
                    </tr>
                  ) : (
                    songs.map(({ song, album }) => (
                      <tr key={song.id} style={{ borderBottom: "1px solid #e0e0e0" }}>
                        <td style={cellStyle}>
                          <img
                            src={song.albumArt}
                            alt={album}
                            style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "3px" }}
                          />
                        </td>
                        <td style={{ ...cellStyle, fontWeight: 400 }}>{song.title}</td>
                        <td style={cellStyle}>{song.duration}</td>
                        <td style={cellStyle}>{song.releaseDate}</td>
                        <td style={{ ...cellStyle, fontSize: "0.9em" }}>{album}</td>
                        <td style={{ ...cellStyle, fontSize: "0.85em" }}>
                          <ListenLinks song={song} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </div>

        <div id="footer">
          <ul className="copyright">
            <li>
              &copy; <span id="copyright-year">{year}</span> {content.footer.credit}
            </li>
          </ul>
        </div>
      </div>
      <Script src="/js/boot.js" strategy="afterInteractive" />
    </>
  );
}
