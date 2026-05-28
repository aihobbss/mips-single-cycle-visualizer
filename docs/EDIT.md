# EDIT.md — change values, fix typos, add instructions

The tool has three "knobs" you can turn without writing JavaScript:

1. **Control values + per-instruction block usage** live in
   `cpe315-datapath-data.js`. Edit this when a control signal is wrong, an
   instruction is missing a block, or you want to add a new instruction.
2. **The SVG diagram** lives in `cpe315-datapath-layout.svg`. Edit this
   in Inkscape when geometry / labels / wire routing change, then run
   `python scripts/splice.py` to push the edit into `index.html`.
3. **Theme / typography / chip styling** lives in the `<style>` block at
   the top of `index.html`. Pure CSS — edit directly.

Everything else (lighting JS, table rendering, debug mode) is in the
`<script>` block at the bottom of `index.html`. You shouldn't need to
touch it for day-to-day edits; see [ARCHITECTURE.md](ARCHITECTURE.md) if
you do.

---

## Case 1 — Fix a typo / wrong label in the diagram

The diagram is an Inkscape SVG. Edit it there:

```
inkscape cpe315-datapath-layout.svg
```

Find the text element you want to change, edit it, save (Ctrl+S — keep the
file as plain SVG, **not** Inkscape SVG, to keep the file small). Then run
the splice:

```
python scripts/splice.py
```

The script strips Inkscape cruft from `cpe315-datapath-layout.svg`,
normalises `data-uses` whitespace, and replaces the inline
`<svg id="dp-svg">…</svg>` block inside `index.html`. Reload the browser to
verify.

**Use `--check` first** if you're nervous — it reports added / removed /
changed element ids vs the inline SVG without writing anything:

```
python scripts/splice.py --check
```

If `--check` lists ids you didn't expect to touch, something else in the
layout changed (Inkscape sometimes regenerates ids when you copy / paste).
Open the SVG and verify before committing.

## Case 2 — A control signal value is wrong

Open `cpe315-datapath-data.js`. Each instruction has a `controls` object:

```js
add: {
  ...
  controls: { RegDst: 1, ALUSrc: 0, MemtoReg: 0, RegWrite: 1,
              MemRead: 0, MemWrite: 0, PCSrc: 0, ALUOp: 'R',
              Branch: 'X' },
  ...
}
```

Change the value, save, reload the browser. The "Control Signals" table
re-renders from this file every time a chip is clicked, so the new value
shows up immediately.

Allowed values per signal:

| Signal | Values |
|---|---|
| RegDst | 0 (rt), 1 (rd), 2 (`$ra` for jal), X (don't care) |
| ALUSrc | 0 (register), 1 (immediate), X |
| MemtoReg | 0 (ALU), 1 (memory), 2 (PC+4 for jal), X |
| RegWrite, MemRead, MemWrite, PCSrc | 0, 1, X |
| ALUOp | `'R'`, `'+'`, `'-'`, `'AND'`, `'OR'`, `'<'`, ... (string; goes through `dp-cell-op`) |
| Branch | `'AND'` (beq), `'NAND'` (bne), X (others) |

Multi-state values (2, 3, AND, NAND) each get their own CSS class
(`dp-cell-2`, `dp-cell-AND`, etc.) so the table colours stay distinct.

## Case 3 — Add a new instruction

1. **Add a chip entry**. In `cpe315-datapath-data.js`, add an entry to
   `DATAPATH_CPE315.instructions` and to `instructionOrder`:

   ```js
   instructions: {
     ...
     myinstr: {
       fmt: 'I',                         // R / I / J
       syntax: 'myinstr $t, $s, imm',
       semantics: 'Description …',
       controls: { /* same shape as above */ },
       blocks: ['ifetch', 'reg_read', 'sign_extend', 'alu', 'rf_write'],
       // (block ids — see DATAPATH_CPE315.blocks for the full list)
     },
   },
   instructionOrder: [
     'add', 'sub', 'and', 'or', 'addi', 'slt', 'lw', 'sw',
     'beq', 'bne', 'j', 'jal', 'jr',
     'myinstr',                          // new
   ],
   ```

2. **Mark which wires it activates**. Open
   `cpe315-datapath-layout.svg` in Inkscape. For every wire / block / signal
   the new instruction touches, edit its `data-uses` attribute to include
   `myinstr` (comma-separated, no whitespace). The
   [WIRE_REFERENCE.md](../cpe315-datapath-WIRE_REFERENCE.md) at the repo
   root is a useful per-wire sanity check.

3. **Re-splice and reload**:

   ```
   python scripts/splice.py
   ```

4. **Verify**: click the new chip — only the elements you tagged should
   light up. Toggle **Debug mode** if anything is off; see Case 4.

## Case 4 — A wire is dim when it should be bright (or vice versa)

Turn on **Debug mode** (button above the diagram). Hover any SVG element;
the debug panel shows its id, its current `data-uses` tag, and whether it
should be lit for your current selection. If the `data-uses` doesn't
include the instruction you expected, you've found the bug:

- Edit the layout in Inkscape: select the element, open the XML editor
  (Ctrl+Shift+X), add/remove the instruction in `data-uses`.
- Re-splice: `python scripts/splice.py`.
- Reload + retest.

**Gotcha**: mux *select-signal labels* (PCSrc, RegDst, ALUSrc, MemtoReg)
and their select lines aren't driven by `data-uses` — they use AND-logic
in JS that lights them only when ≥2 of the mux's data-paths are active.
See [ARCHITECTURE.md](ARCHITECTURE.md) → "MUX_SIGNALS post-pass". Don't
try to "fix" their `data-uses` tag, you'll just confuse future-you.

## What you should NOT edit

- The inline `<svg id="dp-svg">…</svg>` block inside `index.html` directly.
  It's the splice output, not the source. Edit the layout `.svg` and
  re-splice. Direct edits will be overwritten next time someone splices.
- The `MUX_SIGNALS` array or the lighting JS, unless you're sure (the
  AND-logic for mux labels was debugged at length; see ARCHITECTURE.md).
- The `--accent` / `--accent2` CSS variables — they drive the active wire
  colour and the chip "selected" state in lockstep.

## Splice rules in detail

What `scripts/splice.py` does to the layout SVG before injecting it:

| Rule | Why |
|---|---|
| Drop `<defs>`, `<sodipodi:namedview>`, `<style>` | Inkscape metadata, not used by the live page. |
| Drop the `<rect id="rect1">` paper background | Inkscape paints a canvas-coloured rect we don't want. |
| Strip every `sodipodi:*` and `inkscape:*` attribute | Editor metadata. |
| On `<path>` / `<polygon>` only: drop `fill="…"` and `stroke="…"`, reduce `style="…"` to just `stroke-width:…` | Wire / outline colours come from CSS (`.dp-wire`, `.dp-block`), not from baked-in Inkscape colours. |
| Leave `<rect>`, `<circle>`, `<ellipse>`, `<text>` fill / stroke / style alone | These encode block surface colours and label colours that the theme depends on. |
| Normalise `data-uses` whitespace | Lighting JS does exact-match splits on commas; stray whitespace breaks short instruction matches. |

If you ever extend the layout with a new shape type, decide which bucket
it falls into and update `scripts/splice.py` accordingly.
