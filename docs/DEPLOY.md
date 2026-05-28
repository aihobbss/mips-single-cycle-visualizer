# DEPLOY.md — fork this repo and host your own copy on Vercel

This is a static single-page app (one `index.html`, one `.js` data file, one
inline-spliced `.svg`). There is no build step. You can host it on Vercel,
Netlify, GitHub Pages, your own server, or just open `index.html` from a
local file system. The instructions below cover Vercel because that's the
zero-config path that auto-redeploys on every git push.

## Prerequisites

- A GitHub account.
- A Vercel account ([vercel.com](https://vercel.com), free tier is plenty).
- Optional: Node.js + the Vercel CLI if you want to deploy from the
  command line. The Web UI works fine without either.

## 1. Fork the repo

1. Open [github.com/aihobbss/mips-single-cycle-visualizer](https://github.com/aihobbss/mips-single-cycle-visualizer).
2. Click **Fork** (top right) and pick the destination account / org.
3. Clone your fork locally if you plan to edit:

   ```
   git clone https://github.com/<your-account>/mips-single-cycle-visualizer.git
   cd mips-single-cycle-visualizer
   ```

## 2. Import the fork into Vercel

1. Sign in to [vercel.com](https://vercel.com).
2. From the dashboard, click **Add New → Project**.
3. Select your fork from the list of GitHub repositories. (If you don't see
   it, click **Adjust GitHub App Permissions** and grant Vercel access.)
4. On the import screen, leave every default as-is:
   - **Framework Preset:** *Other* (it's a static site)
   - **Build & Output Settings:** untouched — `vercel.json` in the repo
     handles cleanUrls / trailingSlash.
   - **Root Directory:** `./`
5. Click **Deploy**. The first build takes ~10 seconds.

Vercel will assign you a URL like `mips-single-cycle-visualizer-xyz.vercel.app`.
That's your live copy.

## 3. Redeploy after editing

Push to `main` and Vercel rebuilds automatically. Typical loop:

```
# edit cpe315-datapath-data.js or cpe315-datapath-layout.svg
python scripts/splice.py        # only if you edited the SVG layout
git add cpe315-datapath-data.js cpe315-datapath-layout.svg index.html
git commit -m "fix: …"
git push
```

Vercel's dashboard shows the deploy status. New URL goes live in about
20 seconds; the CDN may serve the old version for another 30 seconds.
Hard-refresh (Ctrl+Shift+R / Cmd+Shift+R) to bypass your own browser cache.

## 4. Custom domain (optional)

1. In Vercel, open the project → **Settings → Domains**.
2. Add a domain you own (e.g. `datapath.csc.calpoly.edu`).
3. Vercel prints the DNS record you need to add at your registrar. Once
   propagation finishes (minutes to hours) the domain serves the site.

## 5. CLI deploys (optional)

If you prefer pushing from a terminal:

```
npm install -g vercel
vercel login
vercel --prod
```

The first `vercel` run links the local directory to a Vercel project (it
asks a couple of yes/no questions). Subsequent `vercel --prod` runs deploy
in seconds.

## When deploys fail

| Symptom | Cause / fix |
|---|---|
| Deploy succeeds but the page is blank | `cpe315-datapath-data.js` failed to load. Check the deploy logs / open browser DevTools → Console. Usually a path typo. |
| Diagram renders but no wires light up | `DATAPATH_CPE315 data not loaded` in the console means the data-file script tag is broken. Don't rename the file. |
| Push doesn't trigger a deploy | Check **Settings → Git** in Vercel — the production branch should be `main`. |
| Old version still showing after a deploy | Hard-refresh (Ctrl+Shift+R) to dump the browser cache. Vercel's CDN cache also takes ~30s to roll over. |

See [TROUBLESHOOT.md](TROUBLESHOOT.md) for diagram-specific issues.
