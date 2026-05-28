# ARCHITECTURE.md

A plain-English tour of the moving parts. Read this if you want to extend
the tool (add a pipeline view, a cache visualiser, etc.) or if something
deep in the lighting logic isn't behaving and you need to know why.

## File map

| File | Owns |
|---|---|
| `index.html` | The page chrome (topbar, header, controls panel, tables, cards), the **inline** `<svg id="dp-svg">…</svg>` diagram, all CSS, and all interactive JS. |
| `cpe315-datapath-data.js` | The single `DATAPATH_CPE315` global — per-instruction control values, semantics, and which functional blocks each instruction uses. Drives both tables. |
| `cpe315-datapath-layout.svg` | The **source of truth** for the diagram. Edited in Inkscape, then `scripts/splice.py` strips it and replaces the inline block in `index.html`. |
| `cpe315-datapath-WIRE_REFERENCE.md` | Per-wire reference table — what each wire should light up for. Handy sanity check when retagging. |
| `scripts/splice.py` | The strip + splice pipeline (see [EDIT.md](EDIT.md) → "Splice rules in detail"). |

The whole thing is one HTML page. No build step, no bundler, no
framework. Vercel just serves the files. You can open `index.html` from a
`file://` URL and it works the same as the deployed version.

## Data model

`cpe315-datapath-data.js` exports one global, `DATAPATH_CPE315`:

```js
DATAPATH_CPE315 = {
  instructionOrder: ['add', 'sub', ..., 'jr'],
  signalOrder:      ['RegDst', 'ALUSrc', 'MemtoReg', 'RegWrite',
                     'MemRead', 'MemWrite', 'PCSrc', 'ALUOp', 'Branch'],
  blockOrder:       ['ifetch', 'reg_read', 'sign_extend', 'alu', ...],

  controlSignals: {
    RegDst: { description: 'Selects rd vs rt for the write register',
              values: { 0: 'rt', 1: 'rd', 2: '$ra' } },
    ...
  },

  blocks: {
    ifetch:    { label: 'IF / PC+4',  alwaysOn: true,  ... },
    reg_read:  { label: 'Reg File read', alwaysOn: false, ... },
    ...
  },

  instructions: {
    add: {
      fmt: 'R',
      syntax: 'add $d, $s, $t',
      semantics: '$d = $s + $t',
      controls: { RegDst: 1, ALUSrc: 0, ..., Branch: 'X' },
      blocks:   ['ifetch', 'reg_read', 'alu', 'rf_write'],
    },
    ...
  },
};
```

The lighting logic, the two tables, and the per-instruction cards all
read from this object.

## Lighting model — how the diagram knows what to light

Three CSS classes carry the state:

- `.dp-block` — a functional block (PC, register file, ALU, ...).
- `.dp-wire` — a wire segment.
- `.dp-signal` — a control-signal label or its short signal-line stub.
- `.dp-field-label` — a tiny field-position label (`rs[25-21]`, etc.).

Each of those elements carries a **`data-uses` attribute** listing which
instructions activate it:

```xml
<path class="dp-wire" data-uses="lw,sw,beq,bne" .../>
```

Every time the chip selection changes, `updateDatapathDiagram()` walks
every `[data-uses]` element and toggles a `.dp-active` class:

```js
const selected = dpState.selected;          // Set<string>
document.querySelectorAll('#dp-svg [data-uses]').forEach(el => {
  const uses = el.dataset.uses.split(',');
  const active = el.dataset.always === 'true'
              || uses.some(i => selected.has(i));
  el.classList.toggle('dp-active', active);
});
```

CSS then drives the visuals — dim opacity flips to full opacity, wire
strokes shift to the accent colour, etc. The class toggling is exact
matching (so `data-uses="jal"` does not light when you pick `j`); that's
why `scripts/splice.py` normalises whitespace inside `data-uses`.

`data-always="true"` lights an element for any non-empty selection
(useful for the PC + Instruction Memory + reg-read path that fires for
every instruction).

### The dimming gotcha

The dimming CSS *only* applies to elements with class `.dp-block`,
`.dp-wire`, `.dp-signal`, or `.dp-field-label`. Three failure modes:

| Setup | Behaviour |
|---|---|
| Standalone element with `data-uses` and **no class** | `dp-active` gets toggled on it but no opacity rule applies — it stays at full brightness regardless of selection. (Looks "always lit".) |
| Standalone element with no class and no `data-uses` | Visible at full brightness, never participates in lighting. |
| Element **inside** a `<g class="dp-block">` group, no class on the child | The child dims with the group — the group's `data-uses` decides activation, not the child's. |

Symptom: "this label I just added stays bright no matter what I pick" →
add `class="dp-block"` (or `.dp-signal`) to the element so the dimming
opacity rule applies.

### MUX select-signal AND-logic (the JS post-pass)

`data-uses` is OR-only: any matching instruction lights the element. But
mux *select-signal labels* and their short select-lines need to light
only when the mux's data-paths are *both* lit — that's AND, not OR.

So there's a small post-pass after the main `data-uses` walk:

```js
const MUX_SIGNALS = [
  { signalId: 'text42',  inputs: ['path-pcsrc-in0', 'path-pcsrc-in1'] },
  { signalId: 'text56',  inputs: ['path-regdst-in0', 'path-regdst-in1'] },
  ...
];
MUX_SIGNALS.forEach(m => {
  const activeInputs = m.inputs.filter(id =>
    document.getElementById(id)?.classList.contains('dp-active'));
  const el = document.getElementById(m.signalId);
  el?.classList.toggle('dp-active', activeInputs.length >= 2);
});
```

If you re-tag a mux input path, double-check that the corresponding
`text…` and its select-line are still listed in `MUX_SIGNALS`.

### `data-uses="UNKNOWN"` is *intentional* on the PCSrc select-line

`path31-2-3-0` (the PCSrc select-line) carries `data-uses="UNKNOWN"`,
which never matches any instruction. That's correct — its lighting is
fully delegated to the `MUX_SIGNALS` post-pass. If you "fix" the UNKNOWN
the post-pass still works but you may introduce a phantom over-OR. Leave
it.

## How the two tables render

`renderDatapathControlTable()` iterates `signalOrder × instructionOrder`
to build a table. Each cell's CSS class is derived directly from the
value:

```js
let cls = `dp-cell-${v}`;   // dp-cell-1, dp-cell-0, dp-cell-X,
                            // dp-cell-2, dp-cell-3, dp-cell-AND,
                            // dp-cell-NAND, dp-cell-R, dp-cell-+, ...
```

Per-value styling lives in the `<style>` block, prefixed with
`.dp-table td.dp-cell-…` so it beats the generic `.dp-table td` colour
rule on specificity. Unknown values fall through to the generic
`.dp-cell-op` style (info-blue text).

`renderDatapathComponentTable()` iterates `blockOrder × selectedInstructions`
plus a "Combined" column showing OR of all picks. Each cell is `✓` /
`·` with `.dp-cell-yes` / `.dp-cell-no` styling.

The per-instruction expandable cards (`renderDatapathCards`) format each
selected instruction's `syntax`, `semantics`, controls, and blocks for a
copy-pasteable spec view.

## Splice workflow

You edit `cpe315-datapath-layout.svg` directly. To push the edit to the
live page, run:

```
python scripts/splice.py
```

The script:

1. Loads `cpe315-datapath-layout.svg`.
2. Applies the strip rules (see [EDIT.md](EDIT.md) → "Splice rules").
3. Re-emits the body, wrapped in the canonical
   `<svg id="dp-svg" viewBox="…" …>` opener from `index.html` (preserves
   the viewBox so JS coordinates don't shift).
4. CRLF-normalises and replaces the inline SVG block in `index.html`.
5. Asserts no leftover Inkscape namespaces, no duplicate ids, no
   nested `<svg>`. Also prints an id diff vs the previous inline SVG so
   you can sanity-check that only your intended edits made it through.

Re-running with `--check` does steps 1–5 minus the write, just to preview
the diff.

## Extension point: adding a new tool (pipeline / hazards / cache)

The current page is single-purpose (single-cycle datapath). To add a
second tool, the cleanest pattern is to bring back a tab system:

1. Wrap the existing `<div class="dp-app">…</div>` in a tab pane:

   ```html
   <div id="tab-single-cycle" class="tab-pane active">
     <div class="dp-app">…</div>
   </div>
   ```

2. Add a tab bar at the top of `.main`:

   ```html
   <div class="tabs">
     <button class="tab-btn active" data-tab="single-cycle">Single Cycle</button>
     <button class="tab-btn" data-tab="pipeline">Pipeline</button>
   </div>
   ```

3. Add the new tool's pane next to it: `<div id="tab-pipeline" class="tab-pane">…</div>`.

4. Restore the tab-switching JS (it was stripped during extraction from
   the source vault):

   ```js
   function activateTab(target) {
     document.querySelectorAll('.tab-btn').forEach(b =>
       b.classList.toggle('active', b.dataset.tab === target));
     document.querySelectorAll('.tab-pane').forEach(p =>
       p.classList.toggle('active', p.id === 'tab-' + target));
     if (target === 'pipeline' && !window.pipelineInitialised) initPipeline();
   }
   document.querySelectorAll('.tab-btn').forEach(btn =>
     btn.addEventListener('click', () => activateTab(btn.dataset.tab)));
   ```

5. Initialise the new tool **lazily** (`if (target === 'pipeline' && !window.pipelineInitialised) initPipeline()`) so the page-load cost stays proportional to what's visible.

Each tool can have its own data file (one extra `<script src="pipeline-data.js"></script>`) and its own SVG / table panels following the same `.dp-*` styling.

For the file-naming convention: `cpe315-<tool>-data.js`,
`cpe315-<tool>-layout.svg`, and the splice script can grow a `--tool`
argument or you spin up a sibling `splice-pipeline.py`. Pick whichever
feels right when you get there.

## What lives outside the page

- `vercel.json` — Vercel project config (clean URLs, no trailing slash).
- `.gitignore` — keeps `.vercel/`, editor scratch, etc. out of the repo.
- `LICENSE` — MIT.
- `README.md` — front door / live demo / quick start.
- `docs/` — this folder (deploy, edit, architecture, troubleshoot).
- `scripts/splice.py` — the Inkscape → inline-SVG pipeline.

There's no `node_modules`, no `package.json`, no `dist/` — by design.
