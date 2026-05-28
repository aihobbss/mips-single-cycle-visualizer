# TROUBLESHOOT.md

## "I edited a file and my change isn't showing"

**Hard-refresh first.** Ctrl+Shift+R (Windows / Linux) or Cmd+Shift+R
(macOS) bypasses your browser cache. This is the #1 cause of "my edit
isn't there."

If you deployed to Vercel and the live URL is stale even after a hard
refresh, the CDN cache can take ~30 seconds to roll over. Wait, then
refresh again.

If after both of those the change is still missing, look at the live
file in DevTools → Sources / Network. If it's serving the *old* file,
something in your build chain dropped it (typo in a git commit message
doesn't matter, but did the file actually get pushed? `git status` +
`git log --oneline` + check the GitHub PR / commit on the web).

## "An empty `<g id='svg82-7'>` keeps appearing in my SVG"

Harmless Inkscape leftover — Inkscape sometimes wraps copied content in
an extra `<g>`. The splice script doesn't remove these (they're not
hurting anything and dropping them risks breaking real groups). You can
delete them by hand in Inkscape if they bother you.

## "`path31-2-3-0` has `data-uses='UNKNOWN'` — should I fix it?"

**No.** The PCSrc select-line is intentionally lit by the `MUX_SIGNALS`
JS post-pass, not by `data-uses`. Setting `data-uses="UNKNOWN"` ensures
the OR-only main pass never lights it — only the AND-logic post-pass
does. If you "fix" it to a real instruction list, the OR pass starts
lighting it under conditions that don't match the actual mux activation.

See [ARCHITECTURE.md](ARCHITECTURE.md) → "MUX select-signal AND-logic".

## "A `<text>` element I added stays bright no matter what I select"

Add `class="dp-block"` (or `.dp-signal` if it's a tiny signal label) so
the dimming opacity rule applies to it. The dimming CSS only matches
elements with those specific classes — a `<text>` with `data-uses` but
no class will toggle `dp-active` but never dim.

If you want the element to dim with the surrounding group, put it
*inside* a `<g class="dp-block">` group and remove the per-element
`data-uses`. The group's `data-uses` then drives the activation.

## "ALU / AND / NAND / a label is invisible against the background"

Inline `fill="..."` and `style="fill:..."` on `<text>` elements are kept
as-is by the splice (they encode the dark-theme label colours that the
diagram depends on). If you accidentally strip them — for example by
modifying `scripts/splice.py` to drop `<text>` fills — the labels will
disappear against the dark page. Don't strip them.

If you're remixing the theme to be a light theme: a sweeping CSS
override of `.dp-block` shape fills is not the right move (we tried; it
destroyed visual fidelity because the original SVG's `fill` attrs encode
information). Instead, wrap `.dp-svg-wrap` in a dark card on a light
page so the diagram retains its dark-theme styling locally.

## "A wire / block I expected to light up stays dim"

Use **Debug mode** (button above the diagram). Hover the offending
element — the debug panel shows its id and current `data-uses` value.
Typical causes:

- The instruction isn't in the comma-separated `data-uses` list. Fix in
  Inkscape, re-splice.
- Whitespace inside `data-uses` (`"jal, j"` instead of `"jal,j"`). The
  lighting logic does exact-match splits on commas. The splice script
  normalises this — re-run `python scripts/splice.py` to clean it up.
- The element has no class. Without `.dp-block` / `.dp-wire` /
  `.dp-signal` / `.dp-field-label`, the dimming rule doesn't apply and
  it looks "always lit" — but it's not actually being dimmed in the
  first place. If your real complaint is that the *opposite* is
  happening (it's not lighting when it should), the cause is in
  `data-uses`.

## "A wire / block lights for instructions it shouldn't"

Same workflow: Debug mode → hover → inspect the `data-uses`. Likely an
extra instruction crept in during a re-tag. Remove and re-splice.

Sanity check against
[cpe315-datapath-WIRE_REFERENCE.md](../cpe315-datapath-WIRE_REFERENCE.md)
at the repo root — it's a per-wire ground-truth table.

## "Control-signal table value has the wrong colour"

The cell class is `dp-cell-${value}` (so `dp-cell-1`, `dp-cell-AND`,
etc.). Either:

- The CSS rule for that class is missing in `index.html`'s `<style>`
  block. Add it (use the existing `.dp-table td.dp-cell-…` pattern
  — the `.dp-table td` prefix is needed to beat the generic td colour
  rule on specificity).
- The data file has the value as a different type than expected (string
  `'1'` vs number `1`). The CSS doesn't care about the type, but if you
  have *both* `1` and `'1'` in the data file you get two different
  classes — `dp-cell-1` either way, but the cell content displays
  whatever the value stringifies to.

## "I pushed to GitHub but Vercel didn't redeploy"

Open Vercel → project → **Deployments**. Recent pushes should show up
as queued / building / ready. If your push isn't there:

- Check Vercel → **Settings → Git** — production branch is `main`.
- Check the push went to the right remote: `git log origin/main -1`.
- Check Vercel's GitHub app has access to the repo: GitHub → **Settings
  → Applications → Vercel → Configure**.

## "`python scripts/splice.py` errors with `index.html has no inline <svg id='dp-svg'…> block`"

You probably deleted or renamed the inline SVG opener. The script needs
a `<svg id="dp-svg" …>` tag inside `index.html` to know where to splice.
Restore the opener (any viewBox / xmlns settings work — the script
reuses whatever's there).

If you're starting from a fresh `index.html` with no SVG yet, add a
placeholder:

```html
<svg id="dp-svg" viewBox="0 0 1080 600" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
</svg>
```

Then run the splice — it'll fill in the body.

## "Splice script reports duplicate ids"

The script aborts before writing if it detects duplicate ids in the
spliced output. Cause: an Inkscape copy / paste produced two elements
with the same id. Open the layout SVG, find the duplicate (the script
prints which id), rename one of them, re-splice.

## "The page loads but the diagram is blank"

Open DevTools → Console. If you see `DATAPATH_CPE315 data not loaded`,
the data file failed to load. Common causes:

- `<script src="cpe315-datapath-data.js">` script tag got removed or
  renamed in `index.html`.
- The data file is malformed JS (a syntax error breaks the whole load).
  DevTools → Console will show the parse error and the line number.

## I broke something and want to start over

```
git diff               # see what changed
git checkout -- <file> # discard changes to one file
git stash              # stash everything and inspect
```

If you're past the point of `git diff` (e.g. you committed a bad change
locally but haven't pushed):

```
git reset --hard HEAD~1   # nuke the last commit (DESTRUCTIVE)
git reset HEAD~1          # un-commit but keep the working-tree changes
```

If you already pushed and want to publicly revert:

```
git revert <commit-sha>   # adds a new "undo" commit on top, preserves history
git push
```

`git revert` is the right call for shared / deployed branches —
`git reset --hard` rewrites history and is rude to anyone else who's
pulled.

## Asking for help

If something is genuinely broken and the steps above don't help, file an
issue at
[github.com/aihobbss/mips-single-cycle-visualizer/issues](https://github.com/aihobbss/mips-single-cycle-visualizer/issues).
Include:

- What you did (the steps to reproduce).
- What you expected to see.
- What actually happened (DevTools → Console screenshot helps a lot).
- Your browser + OS.
