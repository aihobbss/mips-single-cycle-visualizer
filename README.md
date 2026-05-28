# MIPS Single-Cycle Visualizer

Interactive single-cycle MIPS datapath teaching tool. Pick any subset of
the 13 supported instructions and the diagram highlights the hardware
blocks, wires, and control signals that subset activates — with the
control-signal truth table and per-component activation table rendered
alongside.

Built for **Cal Poly CPE 315 — Computer Architecture** (Patterson &
Hennessy, *Computer Organization and Design*, ch. 4) and shareable as a
classroom-ready teaching tool for any single-cycle MIPS coverage.

## What it does

- **13 MIPS instructions**: `add`, `sub`, `and`, `or`, `addi`, `slt`,
  `lw`, `sw`, `beq`, `bne`, `j`, `jal`, `jr`.
- Click instruction chips to build any selection — the diagram updates
  in real time, dimming hardware not needed for that selection.
- Per-instruction **expandable cards** show syntax, semantics, controls,
  and required blocks.
- **Debug mode** overlays each SVG element's id and `data-uses` tag for
  easy retagging when the layout changes.
- URL deep-linking: `?i=lw,add` preselects those instructions for
  sharing or embedding.

## Live demo

**[mips-single-cycle-visualizer.vercel.app](https://mips-single-cycle-visualizer.vercel.app)**

Try a deep link: [/?i=lw,add](https://mips-single-cycle-visualizer.vercel.app/?i=lw,add)
preselects `lw` and `add` — the diagram lights up immediately.

## Quick start

This is a static single-page app — no build step. Open `index.html` in
any modern browser:

```
git clone https://github.com/aihobbss/mips-single-cycle-visualizer.git
cd mips-single-cycle-visualizer
# open index.html directly, or:
python -m http.server 8000     # then visit http://localhost:8000
```

## Deploy your own copy on Vercel

```
npx vercel --prod
```

Or use the Vercel web UI — see [docs/DEPLOY.md](docs/DEPLOY.md) for the
full step-by-step (fork → import → custom domain → CLI alternative).

## Editing the tool

Three knobs you can turn without touching JavaScript:

1. **Control values + per-instruction blocks** → edit
   [`cpe315-datapath-data.js`](cpe315-datapath-data.js).
2. **Diagram layout / labels / wires** → edit
   [`cpe315-datapath-layout.svg`](cpe315-datapath-layout.svg) in Inkscape,
   then run `python scripts/splice.py`.
3. **Theme / typography** → edit the `<style>` block at the top of
   [`index.html`](index.html).

See [docs/EDIT.md](docs/EDIT.md) for the full workflow per case
(typos, control value fixes, adding new instructions, debugging
mis-lit elements).

## Documentation

| Doc | Read it when |
|---|---|
| [docs/DEPLOY.md](docs/DEPLOY.md) | You're setting up your own Vercel deploy from a fork. |
| [docs/EDIT.md](docs/EDIT.md) | You want to fix a typo, change a value, add an instruction. |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | You want to extend the tool (pipeline view, hazards, cache). Explains the lighting model, the MUX_SIGNALS post-pass, and the splice workflow. |
| [docs/TROUBLESHOOT.md](docs/TROUBLESHOOT.md) | Something is off and you need to figure out which knob to turn. |
| [cpe315-datapath-WIRE_REFERENCE.md](cpe315-datapath-WIRE_REFERENCE.md) | Per-wire ground truth — "which instructions should light this wire". Use as a sanity check when retagging the SVG. |

## Roadmap (planned extensions)

The current build covers the single-cycle datapath only. The page is
structured (and `docs/ARCHITECTURE.md` documents the extension point)
so future tools can drop in alongside as new tabs:

- 5-stage pipelined datapath (IF / ID / EX / MEM / WB)
- Pipeline hazards visualisation (data hazards, control hazards)
- Forwarding paths
- Cache hierarchy visualiser

Open an issue if you'd like to contribute one of these.

## Stack

Plain HTML / CSS / JS. No build step, no framework, no dependencies at
runtime. The only Python dependency is the standard library, used by
`scripts/splice.py` to strip Inkscape metadata before injecting the
layout SVG into the page.

## License

[MIT](LICENSE).

## Credits

Built by [Aidan Hobbs](https://github.com/aihobbss) (Cal Poly CPE
'27) as a study aid for Prof. John Seng's CPE 315 — Spring 2026. The
control values and component-activation tables follow the Patterson &
Hennessy 4e reference and Seng's classroom truth tables.
