# George Hillman

Public site for George Hillman, a Christian singer, songwriter, and multi-instrumentalist. This is a Next.js port of the original one-page site (HTML5 UP Astral). The public pages keep the original layout, colors, type, and panel navigation.

The site has four panels on one page:

- Home (`/#` or `/#home`)
- Discography (`/#discography`)
- Contact (`/#contact`)
- Individual songs (`/#songs`)

`/admin` edits the live copy in three tabs: site text, the song catalog, and albums. A song is a single, on one album, or unassigned. Changes are stored in `data/content.json`. There is no database.

The public site stays open. `/admin` asks for the GeoHillman account. Copy `.env.example` to `.env.local` and set `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` (scrypt), and `SESSION_SECRET`. The live password hash is kept in `data/admin-auth.json`, which is created from the env hash the first time it is missing. Changing the password in the admin updates that file without a restart.

## Run locally

```bash
npm install
npm run dev
```

The dev server in this workspace is started with:

```bash
npm run dev -- --hostname 0.0.0.0 --port 3000
```

Then open [http://127.0.0.1:3000](http://127.0.0.1:3000). Admin is [http://127.0.0.1:3000/admin](http://127.0.0.1:3000/admin).

Save in the admin, then reload the public page. Image uploads are written to `public/images/`.
