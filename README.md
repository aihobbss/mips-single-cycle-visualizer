# MIPS Single-Cycle Visualizer

Interactive single-cycle MIPS datapath for teaching CPE 315 (Patterson &
Hennessy, *Computer Organization and Design*, ch. 4). Pick any subset of
instructions and the diagram highlights exactly the hardware blocks and
control signals that subset activates, with a control-signal truth table
and per-component activation table rendered alongside.

**Status:** under active development. Full README, screenshots, and deploy
instructions land at the end of the first hand-off iteration. See [docs/](docs/)
for editing / architecture / troubleshooting (also in progress).

## Quick start (local)

This is a static single-page app — no build step.

```
git clone https://github.com/aihobbss/mips-single-cycle-visualizer.git
cd mips-single-cycle-visualizer
# open index.html in any browser
```

## Deploy to Vercel

```
npx vercel --prod
```

See [docs/DEPLOY.md](docs/DEPLOY.md) for the full Vercel-from-GitHub workflow.

## License

[MIT](LICENSE).
