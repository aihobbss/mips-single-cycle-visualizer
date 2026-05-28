#!/usr/bin/env python3
"""splice.py — embed the Inkscape layout SVG into index.html

Workflow
--------
1. You edit ``cpe315-datapath-layout.svg`` in Inkscape (or any editor).
2. Run ``python scripts/splice.py`` from the repo root.
3. The script strips Inkscape cruft, normalises ``data-uses`` whitespace,
   and replaces the inline ``<svg id="dp-svg">…</svg>`` block inside
   ``index.html`` with the cleaned layout. The page CSS / JS around the SVG
   stay untouched.

Why a splice at all?
--------------------
The interactive datapath needs the SVG inline (so JS can toggle classes on
each element). But Inkscape saves a lot of editor metadata (sodipodi /
inkscape namespaces, named views, defs, a background rect, baked colours
on every wire). We strip that on the way in so the lighting logic can
drive colours via CSS classes (``.dp-block``, ``.dp-wire``, ``.dp-signal``).

Strip rules
-----------
- Remove ``<defs>``, ``<sodipodi:namedview>``, ``<style>``, and the
  background ``<rect id="rect1">``.
- Remove all ``sodipodi:*`` and ``inkscape:*`` attributes.
- On ``<path>`` and ``<polygon>`` only: drop ``fill="…"`` and
  ``stroke="…"`` attributes; reduce ``style="…"`` to just the
  ``stroke-width:…`` declaration (if any). These shapes are wires and
  block outlines whose colour comes from CSS.
- Leave ``<rect>``, ``<circle>``, ``<ellipse>``, ``<text>`` fill / stroke
  / style alone — they encode block surface colours and label colours
  that the theme depends on.
- Normalise ``data-uses="add, sub , and "`` → ``data-uses="add,sub,and"``.
  The lighting JS does exact-match splits on commas; stray whitespace
  breaks single-letter / short instruction matches.

Verification before write
-------------------------
Build ``{id: normalised_opening_tag}`` for both the freshly-stripped
block and the existing inline ``<svg id="dp-svg">`` block. Diff the two
sets and surface any added / removed / changed id so an unintended edit
gets flagged. The script never writes if ``--check`` is set; it just
prints the diff.

CLI
---
::

    python scripts/splice.py             # strip layout.svg, splice into index.html
    python scripts/splice.py --check     # print id diff only, do not write
    python scripts/splice.py --dry-run   # same as --check but also prints the stripped block
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths — resolved relative to the repo root (parent of scripts/)
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parent.parent
LAYOUT_PATH = REPO_ROOT / "cpe315-datapath-layout.svg"
INDEX_PATH = REPO_ROOT / "index.html"

# ---------------------------------------------------------------------------
# Strip rules
# ---------------------------------------------------------------------------

# Whole-element tags we drop from the SVG body before re-emitting.
DROP_ELEMENTS = ("defs", "sodipodi:namedview", "style")

# Inkscape / sodipodi attributes — strip from every element.
NAMESPACED_ATTR_RE = re.compile(r'\s(sodipodi|inkscape):[\w-]+="[^"]*"')

# Match an opening element tag; group 1 is the tag name, group 2 is the
# attribute string. Allows attribute values to contain newlines (Inkscape
# does line-break long attrs).
ELEMENT_OPEN_RE = re.compile(
    r'<(rect|circle|ellipse|path|polygon|polyline|text|g|svg|line)([^>]*?)(/?)>',
    re.DOTALL,
)

# fill="…" and stroke="…" attribute matchers (for path/polygon strip).
FILL_ATTR_RE = re.compile(r'\sfill="[^"]*"')
STROKE_ATTR_RE = re.compile(r'\sstroke="[^"]*"')

# style="…" content reducer: keep only stroke-width:value declaration.
STYLE_ATTR_RE = re.compile(r'\sstyle="([^"]*)"')
STROKE_WIDTH_DECL_RE = re.compile(r'stroke-width:\s*[^;]+;?')

# data-uses normaliser: kill all whitespace inside the comma-separated list.
DATA_USES_RE = re.compile(r'\sdata-uses="([^"]*)"')

# bg rectangle we drop (Inkscape paints a paper-coloured backdrop into the file).
BG_RECT_RE = re.compile(
    r'<rect\s+[^>]*?id="rect1"[^>]*?/>\s*',
    re.DOTALL,
)

# ---------------------------------------------------------------------------
# Strip pipeline
# ---------------------------------------------------------------------------


def normalise_data_uses(match: re.Match) -> str:
    parts = [p.strip() for p in match.group(1).split(",") if p.strip()]
    return f' data-uses="{",".join(parts)}"'


def drop_element_block(svg: str, tag: str) -> str:
    """Remove every <tag …>…</tag> (and self-closing) of the named tag."""
    pattern = re.compile(rf"<{re.escape(tag)}\b[^>]*?(?:/>|>.*?</{re.escape(tag)}>)", re.DOTALL)
    return pattern.sub("", svg)


def reduce_style_to_stroke_width(style: str) -> str:
    """Reduce a style="..." body to just its stroke-width declaration, if any."""
    match = STROKE_WIDTH_DECL_RE.search(style)
    return match.group(0).rstrip(";") if match else ""


def strip_path_or_polygon_attrs(open_tag: str) -> str:
    """Drop fill/stroke entirely, and trim style to stroke-width only."""
    open_tag = FILL_ATTR_RE.sub("", open_tag)
    open_tag = STROKE_ATTR_RE.sub("", open_tag)

    def _trim_style(m: re.Match) -> str:
        kept = reduce_style_to_stroke_width(m.group(1))
        return f' style="{kept}"' if kept else ""

    return STYLE_ATTR_RE.sub(_trim_style, open_tag)


def strip_layout(layout_src: str) -> str:
    """Return the SVG body content (no surrounding <svg> opener/closer).

    The body keeps only elements relevant to the live diagram. The caller
    will wrap it with the canonical ``<svg id="dp-svg" …>`` from index.html
    so the inline SVG keeps its viewBox and lighting hooks.
    """
    svg = layout_src

    # 1. Drop Inkscape-only element blocks.
    for tag in DROP_ELEMENTS:
        svg = drop_element_block(svg, tag)

    # 2. Drop the bg paper rect.
    svg = BG_RECT_RE.sub("", svg)

    # 3. Strip sodipodi:* / inkscape:* attributes from EVERY element.
    svg = NAMESPACED_ATTR_RE.sub("", svg)

    # 4. Normalise data-uses whitespace on every element.
    svg = DATA_USES_RE.sub(normalise_data_uses, svg)

    # 5. On <path> and <polygon> only: drop fill/stroke attrs, reduce style.
    def _rewrite_element(m: re.Match) -> str:
        tag, attrs, selfclose = m.group(1), m.group(2), m.group(3)
        if tag in ("path", "polygon"):
            attrs = strip_path_or_polygon_attrs(" " + attrs.lstrip())
            attrs = attrs.rstrip()
            if attrs and not attrs.startswith(" "):
                attrs = " " + attrs
        return f"<{tag}{attrs}{selfclose}>"

    svg = ELEMENT_OPEN_RE.sub(_rewrite_element, svg)

    # 6. Extract the body — everything between the outermost <svg …> and </svg>.
    start = svg.find("<svg")
    after_open = svg.find(">", start) + 1
    end = svg.rfind("</svg>")
    body = svg[after_open:end]

    # 7. Drop blank-line clusters and trailing whitespace.
    body = re.sub(r"\n[ \t]*\n[ \t]*\n+", "\n\n", body)
    return body.strip("\r\n") + "\n"


# ---------------------------------------------------------------------------
# Splice into index.html
# ---------------------------------------------------------------------------

DP_SVG_OPEN_RE = re.compile(r'<svg\s+id="dp-svg"[^>]*>', re.DOTALL)


def extract_dp_svg_block(html: str) -> tuple[int, int, str]:
    """Return (start, end, opener) of the inline <svg id="dp-svg">…</svg>.

    The opener (full opening tag) gets re-used so the spliced SVG keeps the
    viewBox / xmlns / preserveAspectRatio currently in index.html.
    """
    m = DP_SVG_OPEN_RE.search(html)
    if not m:
        raise SystemExit('index.html has no inline <svg id="dp-svg"…> block')
    open_start = m.start()
    close_idx = html.find("</svg>", m.end())
    if close_idx == -1:
        raise SystemExit('index.html dp-svg block missing </svg>')
    close_end = close_idx + len("</svg>")
    return open_start, close_end, m.group(0)


def build_spliced_block(opener: str, body: str, *, indent: str = "      ") -> str:
    """Compose ``<svg id="dp-svg" …>\\n{body}\\n{indent}</svg>``.

    All text is CRLF-normalised — index.html lives on Windows and a mismatch
    causes the in-place find/replace to silently fail in subtler edits later.
    """
    block = f"{opener}\n{body}{indent}</svg>"
    return block.replace("\r\n", "\n").replace("\n", "\r\n")


# ---------------------------------------------------------------------------
# Verification — id diff
# ---------------------------------------------------------------------------

ID_RE = re.compile(r'\bid="([^"]+)"')


def collect_ids(svg_block: str) -> dict[str, str]:
    """Return {id: opening_tag_snippet} for every id-bearing element."""
    out: dict[str, str] = {}
    for m in re.finditer(r'<([a-zA-Z][\w:-]*)\b([^>]*?)id="([^"]+)"([^>]*?)/?>', svg_block, re.DOTALL):
        tag, attrs_before, the_id, attrs_after = m.groups()
        opening = re.sub(r"\s+", " ", f"<{tag}{attrs_before}id=\"{the_id}\"{attrs_after}").strip()
        out[the_id] = opening
    return out


def diff_ids(old_block: str, new_block: str) -> tuple[set[str], set[str], list[str]]:
    """Return (added, removed, changed) id sets between two SVG blocks."""
    old = collect_ids(old_block)
    new = collect_ids(new_block)
    added = set(new) - set(old)
    removed = set(old) - set(new)
    changed = sorted(
        the_id for the_id in set(old) & set(new) if old[the_id] != new[the_id]
    )
    return added, removed, changed


# ---------------------------------------------------------------------------
# Sanity checks before write
# ---------------------------------------------------------------------------

DUP_NS_RE = re.compile(r'\b(?:sodipodi|inkscape):[\w-]+=')


def assert_no_cruft(spliced_block: str) -> None:
    if DUP_NS_RE.search(spliced_block):
        raise SystemExit(
            "Spliced block still contains sodipodi:/inkscape: attributes — strip rule misfired."
        )
    if spliced_block.count("<svg") != 1 or spliced_block.count("</svg>") != 1:
        raise SystemExit(
            "Spliced block has nested <svg> elements; expected exactly 1 open and 1 close."
        )
    seen: dict[str, int] = {}
    for m in ID_RE.finditer(spliced_block):
        seen[m.group(1)] = seen.get(m.group(1), 0) + 1
    dups = sorted(i for i, n in seen.items() if n > 1)
    if dups:
        raise SystemExit(f"Spliced block has duplicate id(s): {', '.join(dups)}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--check",
        action="store_true",
        help="print id diff vs current index.html; do not write",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="like --check, but also print the stripped SVG block to stdout",
    )
    args = parser.parse_args(argv)

    if not LAYOUT_PATH.exists():
        raise SystemExit(f"layout not found: {LAYOUT_PATH}")
    if not INDEX_PATH.exists():
        raise SystemExit(f"index.html not found: {INDEX_PATH}")

    layout_src = LAYOUT_PATH.read_text(encoding="utf-8")
    with INDEX_PATH.open("r", encoding="utf-8", newline="") as f:
        html_src = f.read()

    body = strip_layout(layout_src)
    open_start, close_end, opener = extract_dp_svg_block(html_src)
    new_block = build_spliced_block(opener, body)
    old_block = html_src[open_start:close_end]

    assert_no_cruft(new_block)
    added, removed, changed = diff_ids(old_block, new_block)

    print("== id diff vs current index.html ==")
    if not (added or removed or changed):
        print("  (no id changes)")
    if added:
        print(f"  +{len(added):3d} added:   {', '.join(sorted(added))}")
    if removed:
        print(f"  -{len(removed):3d} removed: {', '.join(sorted(removed))}")
    if changed:
        print(f"  ~{len(changed):3d} changed: {', '.join(changed[:10])}" + (" …" if len(changed) > 10 else ""))

    if args.dry_run:
        print("\n== stripped block ==")
        sys.stdout.write(new_block)
        print()

    if args.check or args.dry_run:
        print("\n(no write — re-run without --check/--dry-run to update index.html)")
        return 0

    new_html = html_src[:open_start] + new_block + html_src[close_end:]
    with INDEX_PATH.open("w", encoding="utf-8", newline="") as f:
        f.write(new_html)
    print(f"\nwrote {INDEX_PATH.relative_to(REPO_ROOT)} ({len(new_html)} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
