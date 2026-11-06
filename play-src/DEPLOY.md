# Deploying BitBlitz

How BitBlitz goes live. Nothing below has been run yet: deploying is Amali's decision, and
`STATUS.md` records what must be true before students use it. Commands run from
`play-src/` unless a step says otherwise.

## What runs where

| Part | Where | How it updates |
|---|---|---|
| Game server: Worker plus one Durable Object per game | Cloudflare, `https://bitblitz.<your-subdomain>.workers.dev` | `pnpm --filter @bitblitz/server deploy:production` |
| Teacher and student screens (static files) | GitHub Pages, `https://www.thinkinbits.site/play/` | The `play/` folder is committed on `main`; Pages deploys `main` as it does for the rest of the site |

The screens talk to the server across origins. The server only accepts
`https://www.thinkinbits.site` and `https://thinkinbits.site` (`wrangler.toml`,
`[env.production]`).

## Before the first deploy (once)

1. **Cloudflare account on the Free plan.** On Free, usage stops at the daily limits
   instead of costing money: that is the spend ceiling. Check the current Workers and
   Durable Objects limits on the account's plan page against the load estimate in
   `STATUS.md`.
2. **Log in:**
   ```bash
   corepack pnpm --filter @bitblitz/server exec wrangler login
   ```
3. **Secrets.** Choose a new passphrase. Never reuse `bitblitz-dev`. Neither value is
   ever written to a file:
   ```bash
   read -rs PASS && printf '%s' "$PASS" | corepack pnpm -s --filter @bitblitz/server hash-passphrase | corepack pnpm --filter @bitblitz/server exec wrangler secret put HOST_PASSPHRASE_HASH --env production; unset PASS
   ```
   ```bash
   openssl rand -base64 48 | tr -d '\n' | corepack pnpm --filter @bitblitz/server exec wrangler secret put SESSION_SECRET --env production
   ```
   ```bash
   corepack pnpm --filter @bitblitz/server exec wrangler secret list --env production
   ```
   The list must show exactly `HOST_PASSPHRASE_HASH` and `SESSION_SECRET`.

## Each deploy

1. **CI is green for the commit** you are deploying (GitHub → Actions → BitBlitz).
2. **Rehearse the published build locally** with `pnpm dev` running in another terminal:
   ```bash
   VITE_API_BASE=http://localhost:8787 corepack pnpm --filter @bitblitz/web build:publish
   ```
   ```bash
   corepack pnpm --filter @bitblitz/web exec vite preview --port 4173 &
   ```
   ```bash
   corepack pnpm --filter @bitblitz/tools rehearse
   ```
   It must end with `no browser errors and no CSP violations`. Then stop the preview and
   delete the rehearsal build: `rm -rf ../play`.
3. **Server.** It refuses to deploy uncommitted changes, so the version it reports is a
   real commit:
   ```bash
   corepack pnpm --filter @bitblitz/server deploy:production
   ```
   ```bash
   curl -s https://bitblitz.<your-subdomain>.workers.dev/api/health
   ```
   The health check must show the commit: `{"ok":true,"version":"<short sha>"}`.
4. **Screens.** On `main`, with this branch merged in:
   ```bash
   VITE_API_BASE=https://bitblitz.<your-subdomain>.workers.dev corepack pnpm --filter @bitblitz/web build:publish
   ```
   ```bash
   cd .. && git add play && git commit -m "BitBlitz: publish <short sha>" && git push origin main
   ```
   GitHub Pages deploys within a minute or two. The page's
   `<meta name="bitblitz-build">` names the commit it was built from.
5. **Check the live site** end to end:
   ```bash
   BITBLITZ_PUBLISHED_URL=https://www.thinkinbits.site/play/ BITBLITZ_PASSPHRASE='<the passphrase>' corepack pnpm --filter @bitblitz/tools rehearse
   ```
   This creates one throwaway game, which expires on its own after 6 hours.

## Rollback

- **Server:** back to the previous Worker version, in seconds:
  ```bash
  corepack pnpm --filter @bitblitz/server rollback:production
  ```
  Then check `/api/health` reports the older commit. Running games keep their state,
  because the Durable Objects are not touched.
- **Screens:** revert the publish commit on `main`:
  ```bash
  git revert --no-edit <publish commit> && git push origin main
  ```
- **Prove it once** during the first deploy. Deploy, deploy again, roll back, and check
  the health check still answers. `STATUS.md` keeps this gate open until it's done.

## In class, when something goes wrong

First responder: **Amali**, who is in the room.

1. **A phone is stuck:** refresh it. The student returns to the same seat with the same
   score.
2. **The teacher screen is stuck:** refresh it. The game resumes where it was.
3. **Nothing connects:** open `/api/health` on the workers.dev address.
   - **No answer:** it's the network or Cloudflare. If the school Wi-Fi blocks
     `workers.dev`, that's the known risk in `PLAN.md`.
   - **Right after a deploy:** roll back (above).
4. **Fallback:** run the questions aloud, or project the quiz file.
5. **Afterwards:** check Workers Logs (Cloudflare dashboard → Workers → bitblitz → Logs) and
   filter on `event = unhandled_error`. Each line has the request's `ray` ID, the method
   and the path. It never includes headers, bodies or nicknames.
