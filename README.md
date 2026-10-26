# Ludo Club Online — beginner starter

A React + Vite Ludo starter with Supabase database snapshots and realtime Postgres changes. It is designed to be run locally first, then connected to your own Supabase project and deployed to Vercel.

## 1. Install Node.js (fixes `npm: command not found`)

1. Open https://nodejs.org/en/download
2. Download and install the **LTS** version for macOS.
3. Close and reopen Terminal (and VS Code if it is open).
4. Run:

```bash
node -v
npm -v
```

Both commands should print version numbers. If `node` works but `npm` does not, reopen Terminal and reinstall Node.js LTS before continuing.

## 2. Run the game locally

In Terminal, go to the folder where you extracted this project. Example if it is in Downloads:

```bash
cd ~/Downloads/ludo-online
npm install
cp .env.example .env
npm run dev
```

- `cd` changes folders.
- `npm install` downloads the project's dependencies.
- `cp` copies the example environment file so you can add your own settings.
- `npm run dev` starts the local development server.

Vite will print a local URL, usually `http://localhost:5173`. Open it in your browser. Without Supabase settings, the app shows setup instructions and won't offer online rooms.

## 3. Create Supabase project

1. Go to https://supabase.com and create a project.
2. In Project Settings / API (or Connect), copy the **Project URL** and the **publishable key** (or legacy `anon` key). Never use a `service_role` or secret key in a browser app.
3. Put them in `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

4. In Supabase Dashboard, open **SQL Editor**, create a query, paste `supabase-setup.sql`, and run it.
5. In Project Settings > API, confirm the public client key is the one in `.env`.
6. Stop and restart Vite after changing `.env` (press Ctrl+C, then `npm run dev`).

### Prototype security note

The SQL policy is deliberately permissive to make a first demo easy to connect. Anyone with a room code could read or change its state. This is **not suitable for sensitive data, prizes, or a competitive production game**. Before a larger public launch, move turn validation and dice rolls to a trusted server/Edge Function and restrict database access to verified room members.

## 4. Play with a friend

1. Open the local site and create a room.
2. Share the room code with a friend.
3. Your friend opens the site and enters that code.
4. Use separate browser windows/devices to verify the board updates.

A local `localhost` URL only works on your own device. Your friend needs the deployed URL (or a carefully configured temporary tunnel) to connect from elsewhere.

## 5. Deploy on Vercel

1. Push this project to a GitHub repository.
2. Go to https://vercel.com and import the repository.
3. Framework preset: **Vite** (usually detected automatically).
4. Add these Environment Variables in Vercel Project Settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy. When the build succeeds, open the Vercel-provided HTTPS URL.
6. Test by opening the URL on two different devices or browsers and joining the same room.

Do not claim the project is live until you have opened the public URL and confirmed two players can join and see synchronized changes.

## Included rule choices

This starter implements a common Ludo rule set: six to leave the yard; exact roll to finish; safe start squares; captures send unprotected opponents back to their yard; rolling a six or capturing grants another turn; three consecutive sixes forfeits the turn. Ludo house rules vary, so adjust these choices if your group uses different rules.

## Notes on multiplayer trust

The browser currently calculates moves and writes the resulting game snapshot. This is fine for learning and a friendly prototype, but it is not cheat-resistant. A production version should validate moves server-side and use authenticated membership or short-lived room access tokens.
