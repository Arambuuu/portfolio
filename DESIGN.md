---
name: Arambuuu Portfolio & CMS
description: Minimal light-mode-first studio portfolio and Supabase/ImageKit content manager for Ra Ashni Aram D. Piloto.
colors:
  cobalt-archival: "#1E40AF"
  cobalt-hover: "#17328C"
  cobalt-tint: "#E8EEF9"
  archival-paper: "#F7F6F2"
  stone-surface: "#EFECE6"
  pure-sheet: "#FFFFFF"
  graphite-ink: "#141413"
  graphite-secondary: "#4A4843"
  graphite-muted: "#66635C"
  hairline-rule: "#DDD9D0"
  hairline-strong: "#C4BFB4"
  signal-published: "#15803D"
  signal-error: "#B91C1C"
typography:
  display:
    fontFamily: "Bricolage Grotesque, system-ui, -apple-system, sans-serif"
    fontSize: "4.25rem"
    fontWeight: 700
    lineHeight: 1.03
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Bricolage Grotesque, system-ui, -apple-system, sans-serif"
    fontSize: "3.1rem"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Bricolage Grotesque, system-ui, -apple-system, sans-serif"
    fontSize: "1.85rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Work Sans, system-ui, -apple-system, sans-serif"
    fontSize: "0.96875rem"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "0em"
  label:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0em"
rounded:
  sm: "4px"
  md: "8px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "24px"
  lg: "48px"
  xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.graphite-ink}"
    textColor: "{colors.archival-paper}"
    rounded: "{rounded.sm}"
    padding: "10px 18px"
  button-primary-hover:
    backgroundColor: "{colors.cobalt-archival}"
    textColor: "{colors.pure-sheet}"
  button-secondary:
    backgroundColor: "{colors.pure-sheet}"
    textColor: "{colors.graphite-ink}"
    rounded: "{rounded.sm}"
    padding: "10px 18px"
  chip-accent:
    backgroundColor: "{colors.cobalt-tint}"
    textColor: "{colors.cobalt-archival}"
    rounded: "{rounded.sm}"
    padding: "3px 9px"
---

# Design System: Arambuuu Portfolio & CMS

## Overview

**Creative North Star: "Daylight Studio Monograph"**

This design system treats a multidisciplinary developer-designer portfolio and its built-in CMS like a clean architectural monograph printed on warm uncoated paper. Light mode is the primary surface, relying on generous whitespace, crisp 1px rules, and unembellished ImageKit imagery so real projects and gallery works command attention from the first viewport.

Rather than decorative gradients, blurred atmospheric orbs, or identical icon-card grids, structure comes from typographic hierarchy, asymmetric editorial spreads, and tabular specification ledgers. Interactive controls use a single restrained cobalt ink accent while administrative CMS views share the exact same quiet precision.

**Key Characteristics:**
- Light-mode-first warm paper ground (`#F7F6F2`) with optional dark mode (`#121210`)
- Self-hosted display, UI, and monospace typography with zero third-party font stylesheets
- Single-pixel hairline boundaries (`#DDD9D0`) separating ledgers, tables, and specimens
- Native `<dialog>` case-study sheets and gallery lightbox with keyboard navigation

## Colors

The palette pairs warm paper neutrals with deep graphite ink and a single cobalt archival accent for active navigation, focus states, and category highlights.

### Primary
- **Cobalt Archival** (#1E40AF): Active navigation indicator, focus outlines, text links, primary button hover, and selected specimen accents.
- **Cobalt Tint** (#E8EEF9): Background fill for active navigation pills, selection highlights, and featured category chips.

### Neutral
- **Archival Paper** (#F7F6F2): Default light-mode page canvas.
- **Stone Surface** (#EFECE6): Secondary container fill, table header bands, and hover row surfaces.
- **Pure Sheet** (#FFFFFF): Elevated interactive panels, gallery cards, CMS forms, and `<dialog>` surfaces.
- **Graphite Ink** (#141413): Primary headings, primary button fill, and high-contrast body text.
- **Graphite Secondary** (#4A4843): Body paragraphs, project summaries, and timeline bullets.
- **Graphite Muted** (#66635C): Monospace metadata, years, tool pairings, and table captions.
- **Hairline Rule** (#DDD9D0): 1px structural dividers, borders, and ledger separators.

### Named Rules
**The Light-First Ink Rule.** Default to warm archival paper (`#F7F6F2`) and dark graphite ink (`#141413`); reserve cobalt (`#1E40AF`) strictly for interactive affordances, active page states, and featured tags.

## Typography

**Display Font:** Bricolage Grotesque (self-hosted WOFF2, weights 600–700)
**Body Font:** Work Sans (self-hosted WOFF2, weights 400–600)
**Label/Mono Font:** JetBrains Mono (self-hosted WOFF2, weights 400–500)

**Character:** Bricolage Grotesque brings crisp studio personality to titles without decorative excess, balanced by Work Sans for calm 65ch reading and JetBrains Mono for technical specs, dates, and URLs.

### Hierarchy
- **Display** (700, `clamp(2.35rem, 4.8vw, 4.25rem)`, `1.03`): Home thesis headline only.
- **Headline** (700, `clamp(2rem, 3.8vw, 3.1rem)`, `1.08`): Sub-page titles (`About`, `Projects`, `My Tools`, `Contact`, `CMS`).
- **Title** (700, `clamp(1.35rem, 2.2vw, 1.85rem)`, `1.15`): Section headings with generous top margin (`56px`).
- **Body** (400, `0.96875rem`, `1.7`): Narrative paragraphs and case-study copy capped at `65ch`.
- **Label** (500, `0.75rem`, `1.4`): Years, clients, table headers, and connection status indicators.

### Named Rules
**The Self-Contained Heading Rule.** Headings speak on their own without eyebrow kickers or section numbers above them, keeping more vertical space above each heading than below it.

## Layout

Content sits inside a centered `1200px` container with fluid inline padding (`clamp(18px, 4vw, 48px)`). Home opens with an asymmetric two-column spread (`1.05fr / 0.95fr`) pairing the thesis copy with an interactive Featured Specimen Stage, followed by full-width horizontal project ledgers and responsive auto-fill gallery grids (`minmax(260px, 1fr)`). Below `960px`, two-column spreads collapse to a single vertical column; below `780px`, the primary navigation converts into an accessible toggle menu.

## Elevation & Depth

Surfaces are flat by default and rely on 1px hairline borders (`#DDD9D0`) and subtle tonal shifts (`#F7F6F2` -> `#FFFFFF` -> `#EFECE6`) rather than drop shadows.

### Shadow Vocabulary
- **Lifted Surface** (`box-shadow: 0 10px 28px rgba(20, 20, 19, 0.08)`): Applied only on gallery card hover and modal `<dialog>` sheets.

### Named Rules
**The Hairline-First Rule.** Separate regions with 1px rules and tonal contrast before reaching for shadows; never use hard zero-blur offset block shadows.

## Shapes

Every interactive control, chip, input, and thumbnail uses crisp `4px` corners (`--radius-sm`), while larger cards, panels, and dialogs use `8px` (`--radius-md`) and the live availability indicator uses a `999px` pill.

## Components

### Buttons
- **Shape:** `4px` radius (`--radius-sm`), `1px` border, `0.875rem` weight `600`.
- **Primary:** Graphite Ink (`#141413`) background with Archival Paper (`#F7F6F2`) text, `10px 18px` padding; transitions to Cobalt Archival (`#1E40AF`) with white text on hover.
- **Secondary / Ghost:** Pure Sheet (`#FFFFFF`) or transparent background with `1px` hairline border.

### Chips
- **Style:** `3px 9px` padding, `0.72rem` JetBrains Mono, `4px` radius, `1px` border.
- **State:** Default neutral chip vs. `.chip-accent` (`#E8EEF9` fill, `#1E40AF` text).

### Cards / Containers
- **Corner Style:** `8px` (`--radius-md`) for panels, gallery cards, and specimen stage.
- **Background:** Pure Sheet (`#FFFFFF`) over Archival Paper (`#F7F6F2`).
- **Border:** `1px solid #DDD9D0`.
- **Internal Padding:** `24px` on `.panel`, `14px 16px` on `.gallery-info`.

### Inputs / Fields
- **Style:** `9px 12px` padding, `1px solid #C4BFB4` border, `4px` radius, `#F7F6F2` resting ground.
- **Focus:** Shifts border to Cobalt Archival (`#1E40AF`) and background to Pure Sheet (`#FFFFFF`).

### Navigation
- Sticky `68px` header with translucent paper backdrop, brand mark, 5 primary route pills (`Home`, `About`, `Projects`, `My Tools`, `Contact`), availability pill, `CMS` button, and light/dark theme switch.

## Do's and Don'ts

### Do:
- **Do** deliver all ImageKit images with `?tr=w-...,q-80,f-auto` transforms to protect free-tier bandwidth.
- **Do** keep `::selection`, `caret-color`, `:focus-visible`, and scrollbars themed to the paper/cobalt palette.
- **Do** build dynamic DOM nodes with `document.createElement` and `textContent` rather than `innerHTML`.

### Don't:
- **Don't** add eyebrow kickers or numeric prefixes (`01`, `02`) above headings.
- **Don't** use gradient text, blurred ambient orbs, or identical icon-card grids.
- **Don't** ship external Google Fonts stylesheets or place private API keys in client-side code.
