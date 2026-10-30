# InferCheck — Design Guide

> Direction: **search first**. The home page is a search field with compliance presets directly under it and the model
> table right below. Every other page uses the same language.

This file is the reference for every visual and interaction decision. If the code and this file disagree, fix one of
them in the same change.

---

## Design Philosophy

This site is a **compliance reference tool built by a human expert, not a vendor product or a marketing site.** Every
design decision should reinforce that.

1. **Answer the question fast.** Visitors arrive with a model or provider in mind. The search field is the first and
   largest control. The first table rows are visible without scrolling at 1440×900 and after one short scroll on a
   phone.
2. **Less text, tidier page.** No explanatory paragraphs, legends, info boxes or "what does this mean" blocks on list
   pages. Explanations live in tooltips, in the expanded row or on the About page. A list page shows no more words in
   its first viewport than the visitor needs to find a model.
3. **Trust through structure, not decoration.** Sourced facts, consistent formatting and an honest review status. No
   scores, rankings, gradients, stock imagery or marketing language.

---

## Color System

Light theme only. Warm off-white page, white surfaces, near-black ink, one blue accent taken from the logo, and four
compliance colors that mean nothing else.

### Base Palette

| Token                    | Value     | Usage                                                                  |
| ------------------------ | --------- | ---------------------------------------------------------------------- |
| `--color-bg`             | `#f7f6f1` | Page background                                                        |
| `--color-surface`        | `#ffffff` | Finder, tables, cards, buttons                                         |
| `--color-surface-alt`    | `#f3f1ec` | Table header row, active language tab, certification pills             |
| `--color-surface-sunken` | `#faf9f5` | Expanded row panel                                                     |
| `--color-row-hover`      | `#fbfaf7` | Row hover and open row                                                 |
| `--color-border`         | `#e4e1d9` | Container borders, row and field separators                            |
| `--color-border-strong`  | `#cfcbc1` | Borders of chips and buttons, the dot between input and output price   |
| `--color-text-primary`   | `#161a1f` | Body text, model names, panel headings                                 |
| `--color-heading`        | `#161a1f` | Page titles                                                            |
| `--color-text-secondary` | `#3a414a` | Nav links, residency, prose in panels and cards, secondary button text |
| `--color-text-muted`     | `#5b6470` | Provider line, table header, counts, labels, field values, dimmed rows |
| `--color-placeholder`    | `#6b7280` | Search placeholder                                                     |
| `--color-link`           | `#1d4ed8` | Links                                                                  |
| `--color-link-hover`     | `#1e40af` | Link hover                                                             |

### Accent

| Token                   | Value     | Usage                                                                                 |
| ----------------------- | --------- | ------------------------------------------------------------------------------------- |
| `--color-accent`        | `#1d4ed8` | Active preset chip (fill), focus ring, primary button border, "Check" in the wordmark |
| `--color-accent-ink`    | `#1e40af` | Link text inside panels and cards, primary button text                                |
| `--color-accent-subtle` | `#e8eefb` | Focus halo around the finder, search match highlight                                  |

### Semantic Compliance Colors

Each tier has three tokens: `-text` for pill text and marks, `-bg` for the pill background, `-line` for the 3px bar on
the left edge of a row and its expanded panel.

| Tier           | `-text`   | `-bg`     | `-line`   | Short label (de / en)          |
| -------------- | --------- | --------- | --------- | ------------------------------ |
| `compliant`    | `#15803d` | `#e9f8ee` | `#22c55e` | EU-konform / EU compliant      |
| `partial`      | `#855900` | `#fdf5d9` | `#e0b80d` | Teilweise / Partial            |
| `noncompliant` | `#b42318` | `#fdecea` | `#ef5350` | Nicht konform / Non-compliant  |
| `unverified`   | `#4b5563` | `#eef0f3` | `#9aa3ad` | Nicht verifiziert / Unverified |

Token names follow the pattern `--color-compliant-text`, `--color-compliant-bg`, `--color-compliant-line`. The long
labels ("Teilweise (EU + SCC)", "Partial (EU + SCCs)") stay in use for titles and the providers page.

`TIER_CLASSES` in `src/lib/compliance.ts` maps each tier to its Tailwind classes (`text`, `bg`, `line`). Components take
tier colors from there instead of naming the tokens themselves.

**Rules:**

- Red, amber, green and the tier grey are used for compliance status only: tier pills, the row bar, and the ✓ / ✗ / ?
  marks in compliance field lists. No success toasts, warning banners, decoration or non-compliance labels in those
  colors. The gateway label is neutral grey.
- A tier is never shown by color alone. The pill always carries an icon and a label; the row bar is a redundant cue.
- No dark theme. `prefers-color-scheme: dark` changes nothing.

### Measured Contrast (WCAG 2.x)

| Foreground            | Background                                      | Ratio                 |
| --------------------- | ----------------------------------------------- | --------------------- |
| `#161a1f` primary     | `#ffffff` / `#f7f6f1`                           | 17.5 / 16.2           |
| `#3a414a` secondary   | `#ffffff`                                       | 10.3                  |
| `#5b6470` muted       | `#ffffff`                                       | 6.0                   |
| `#5b6470` muted       | `#f7f6f1` / `#f3f1ec` / `#faf9f5`               | 5.5 / 5.3 / 5.7       |
| `#6b7280` placeholder | `#ffffff`                                       | 4.8                   |
| `#1d4ed8` accent      | `#ffffff`                                       | 6.7                   |
| `#ffffff`             | `#1d4ed8` accent                                | 6.7                   |
| `#1e40af` accent-ink  | `#faf9f5`                                       | 8.3                   |
| Pill text on pill bg  | compliant / partial / noncompliant / unverified | 4.6 / 5.6 / 5.8 / 6.6 |

`--color-border-strong` (1.6:1 on white) only outlines controls that also carry a text label.

---

## Typography

### Fonts

Loaded with `next/font/google` in `src/app/[locale]/layout.tsx` (self-hosted at build time, `display: "swap"`, exposed
as CSS variables):

- **Instrument Serif** — 400, normal style → `--font-display`. Page titles (`h1`) only.
- **DM Sans** — variable font with the optical-size axis: no `weight` option, `axes: ["opsz"]` → `--font-body`. Weights
  in use: 400, 500, 600. Everything that is not an `h1` is DM Sans, including prices, dates, context sizes and IDs.

IBM Plex Mono is not part of the design: remove it from the layout and from `@theme`. No weight above 600.

Base: `body` 16px (`1rem`), line-height 1.5, antialiased. Prices, counts and dates use
`font-variant-numeric: tabular-nums`; DM Sans draws an open zero.

### Type Scale

| Role                  | Where                              | Size (≥768 / <768) | Weight         | Line-height | Notes                                                   |
| --------------------- | ---------------------------------- | ------------------ | -------------- | ----------- | ------------------------------------------------------- |
| Page title            | `h1` on every page                 | 36px / 28px        | 400            | 1.15        | Instrument Serif, letter-spacing −0.01em, balanced wrap |
| Wordmark              | Header                             | 18px               | 600            | —           | "Infer" primary, "Check" accent, no space               |
| Search input          | Finder                             | 18px / 16px        | 400            | —           | Never below 16px on mobile                              |
| Section heading       | `h2` on detail and long-form pages | 20px               | 600            | 1.3         | Sentence case                                           |
| Panel / card heading  | Expanded row `h3`, card `h2`       | 17px               | 600            | 1.3         | Sentence case                                           |
| Model name            | Row button                         | 16px               | 500            | 1.35        | `text-wrap: pretty`                                     |
| Body, table cell      | Cells, prose in panels             | 15px               | 400            | 1.5         | Long-form pages: 16px / 1.6                             |
| Nav link, chip, count |                                    | 15px               | 400 (chip 500) | 1.4         |                                                         |
| Provider line         | Under the model name               | 14px / 15px        | 400            | —           | Muted                                                   |
| Field value, source   | Panels and cards                   | 14px               | 400            | 1.5         | Muted, or accent-ink when a link                        |
| Button                | Panel links, "Load more"           | 14px / 15px        | 500            | —           |                                                         |
| Table header          | `th`                               | 13px               | 600            | —           | Uppercase, letter-spacing 0.04em, muted                 |
| Header sub-line       | Second line of the price `th`      | 13px               | 500            | —           | Sentence case                                           |
| Label                 | `h4` inside panels and cards       | 13px               | 600            | —           | Sentence case, muted                                    |
| Tier pill             |                                    | 13px               | 600            | —           |                                                         |
| Language tab          | EN / DE                            | 13px               | 400            | —           |                                                         |

**Rules:**

- Nothing on the site is smaller than 13px.
- Uppercase appears only in table header rows.
- Line length for prose in panels: `max-width: 62ch`; for the footer disclaimer: `72ch`; long-form pages: 720px column.

---

## Layout & Grid

### Page Width

```
Max content width:   1120px  (every page, header and footer included)
Padding (≥768px):    32px
Padding (<768px):    16px
Long-form text:      720px column inside the content width
```

### Breakpoint

One layout breakpoint: **768px** (Tailwind `md`). From 768px the header shows the inline nav and the model table shows
all columns; below it the header shows the menu button and table rows become two-line mobile rows. Nothing overflows
horizontally at 390px.

### Vertical Rhythm (home page)

```
Header            60px  (56px below 768px)
Hero              28px top, 20px bottom  (20 / 14px below 768px)
Finder
Gap               20px  (16px below 768px)
Table
Footer            48px above, 40px below  (36px above below 768px)
```

Spacing steps in use: 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48px (Tailwind's 4px scale plus the half
steps 6, 10, 14, 18).

### Radii, Borders, Shadows

| Element                                 | Radius | Border                                                                                 | Shadow                                      |
| --------------------------------------- | ------ | -------------------------------------------------------------------------------------- | ------------------------------------------- |
| Finder, table container, cards          | 10px   | 1px `--color-border`                                                                   | Finder only: `0 1px 2px rgba(22,26,31,.04)` |
| Preset chips, tier pills, neutral pills | 999px  | Chips 1px `--color-border-strong`; tier pills none; neutral pills 1px `--color-border` | none                                        |
| Buttons                                 | 8px    | 1px `--color-border-strong`                                                            | none                                        |
| Active language tab                     | 6px    | 1px `--color-border`                                                                   | none                                        |
| Row and panel tier bar                  | —      | 3px left, `--color-<tier>-line`                                                        | —                                           |
| Custom filter panel                     | —      | 1px dashed `--color-border` on top                                                     | —                                           |

No other shadows. No gradients.

---

## Component Patterns

### 1. Header

```
[Icon] InferCheck                      Models  Providers  About   EN DE
```

- 60px high (56px below 768px), sticky. On the page background with no border at the top of the page; after scrolling
  past 8px it gets a `--color-bg` background at 85% with `backdrop-blur` and a 1px `--color-border` bottom border.
- Brand: link to the home page with `aria-label="InferCheck"`. The app icon (the rounded blue square of
  `public/logos/infercheck/icon-color.svg`) at 26×26px, 10px gap, then the wordmark as text: DM Sans 18px / 600,
  "Infer" in `--color-text-primary`, "Check" in `--color-accent`, visible text `aria-hidden`.
- Nav (≥768px): Models · Providers · About, 15px `--color-text-secondary`, 28px apart. Current page:
  `--color-text-primary`, underline at 0.35em offset, `aria-current="page"`.
- Language switcher, 12px after the nav: two 13px tabs "EN" "DE", padding 4×8px, radius 6px. Inactive muted; active
  with `--color-surface-alt` background, 1px border, primary text, `aria-current="true"`.
- Below 768px: a 24px menu icon button (8px padding, label "Open menu" / "Close menu") opens a drawer from the right with
  the nav links and the language switcher. Behaviour under Accessibility.

### 2. Hero Line

- One `h1`, nothing else: "AI inference providers, filtered by GDPR compliance." / "KI-Inferenzanbieter, gefiltert nach
  DSGVO-Konformität." The two message parts join into one sentence on one line where it fits.
- No sub-heading paragraph. The model and provider counts live in the finder.

### 3. Finder (search, presets, count)

One white block (radius 10px, 1px border, faint shadow), labelled "Search and filters", with two parts.

**Search row**

- `input type="search"`, full width, 60px high (54px below 768px), no own border or outline, 18px text (16px below
  768px), padding-left 54px (48px).
- Magnifier icon 22px (20px), 18px (16px) from the left, muted, `aria-hidden`. Visually hidden `<label>`.
- Placeholder "Search models or providers…" / "Modelle oder Anbieter suchen…".
- Clear button when the field has text: 24px × icon, muted, 14px from the right, `aria-label` "Clear search".

**Refine row**

- 1px top border, padding 10px 12px 12px (10px below 768px), gap 8px (6px), wraps.
- Preset chips, in this order: **Strict EU** · **EU + SCCs** · **No Training** · **Custom** (de: Streng EU · EU + SCC ·
  Kein Training · Benutzerdefiniert). Chip: white, 1px `--color-border-strong`, radius 999px, padding 6px 14px (6 ×
  12px below 768px), 15px / 500, no wrap.
- Pressed chip: `--color-accent` fill and border, white text. Chips are toggle buttons with `aria-pressed`; at most one
  is active; pressing the active one clears it.

| Preset      | Requires                     |
| ----------- | ---------------------------- |
| Strict EU   | EU only, DPA, no training    |
| EU + SCCs   | DPA, SCCs, no training       |
| No Training | no training on customer data |

- "Custom" has a 10px chevron after its label and `aria-expanded` / `aria-controls`. It opens the custom panel under the
  refine row: 1px dashed top border, padding 4px 14px 14px, four checkboxes (18px, `accent-color` accent) with 15px
  labels, 8px between box and label, 8 × 20px between items: "Data stays in EU", "DPA available", "No training on data",
  "SCCs in place".
- Count, right-aligned, 15px muted, tabular, an `<output aria-live="polite">`:
  - nothing active: "425 models · 77 providers" / "425 Modelle · 77 Anbieter"
  - filter or search active: "190 of 425 models" / "190 von 425 Modellen"
  - below 768px the count takes its own full-width line under the chips (padding 4px 4px 0).
- Focus: `:focus-within` on the finder gives it an `--color-accent` border and a 3px `--color-accent-subtle` halo.

### 4. Model Table (≥768px)

- White container, radius 10px, 1px border, 20px below the finder. Full-width `table`, `border-collapse: separate`,
  `aria-label` "AI models with GDPR compliance data".
- Columns (`colgroup`):

| Column            | Width | Content                                                          |
| ----------------- | ----- | ---------------------------------------------------------------- |
| Model             | 42%   | Model name (the expand button), provider below, gateway label    |
| Compliance        | 16%   | One tier pill                                                    |
| Residency         | 18%   | "EU" for EU-only providers, else the region list; "—" if unknown |
| Price / 1M tokens | 20%   | Input · output, right-aligned                                    |
| (toggle)          | 44px  | Chevron; header cell holds visually hidden "Details"             |

- There is **no status column**. The review status appears only in the expanded panel and on detail pages.
- Header row: `--color-surface-alt`, 1px bottom border, cells padding 12px 16px (20px left on the first), 13px / 600,
  uppercase, 0.04em tracking, muted. The price header has a second line "Input · Output" / "Eingabe · Ausgabe" (13px /
  500, sentence case).
- Sorting: Model, Compliance and Price are sortable. The header label is a `<button>` with `aria-label`
  "Sort by {label}"; the `th` carries `aria-sort`. The active column shows a 10px ↑ or ↓ after its label; inactive
  sortable columns show the arrow at 35% opacity on hover and focus only.
- Row: cells padding 12px 16px, 1px bottom border, 15px, vertically centred. The first cell carries the 3px tier bar on
  its left edge (padding-left 17px). Hover and open: `--color-row-hover`, 150ms ease-out.
  - **Model:** the model name is a `<button>` styled as text (16px / 500, primary) with `aria-expanded` and
    `aria-controls`. The provider name sits under it (14px muted, 2px gap). Search matches are highlighted in both with
    an `--color-accent-subtle` background; the text color does not change. Models a provider hosts for a third party
    carry a neutral label after the name: "via gateway" / "über Gateway", 13px / 500 muted, 1px `--color-border`,
    radius 999px, padding 1px 8px, with a `title` that explains it.
  - **Compliance:** exactly one tier pill. Its `title` lists the long tier label and the individual properties, for
    example "EU compliant · EU Only · DPA · No Training".
  - **Residency:** 15px `--color-text-secondary`.
  - **Price:** right-aligned, tabular, no wrap. Input and output are inline blocks with `min-width: 4.6em`, right-aligned,
    separated by a "·" in `--color-border-strong` with 4px padding each side (`aria-hidden`). Format follows the locale:
    en `$3.00`, de `3,00 $`; two decimals, three when the price needs them (`$0.045`). No published price: "Price not
    published" / "Preis nicht angegeben" (14px muted) in place of both values, never `0`.
  - **Toggle:** 18px chevron, muted, `aria-hidden`, rotates 180° when open (150ms ease-out). A click anywhere on the row
    except links and the pill toggles it; the accessible control is the model-name button.
- After the loaded rows, a "more" row: padding 14px 20px, 15px muted text "403 more models" / "403 weitere Modelle",
  then, 12px after it, the button "Load more" / "Mehr laden" (white, 1px `--color-border-strong`, radius 8px, padding
  6px 12px, 14px / 500, secondary text; hover border `--color-text-secondary`). The table renders 50 rows first; each
  click adds 50.
- No results: one full-width row, 48px vertical padding, centred 15px muted: 'No models found for "{query}"', followed by
  a "Reset filters" button in the "Load more" style.

### 5. Tier Pill

- Inline flex, gap 6px, padding 3px 10px 3px 8px, radius 999px, 13px / 600, no wrap, text and background from the tier
  tokens, no border, `cursor: help` (it has a `title`).
- 12px icon before the label, drawn in `currentColor`: compliant ✓, partial a circle with the right half filled,
  noncompliant ×, unverified ?.
- Short labels in rows (see the tier table); long labels on the provider page and the providers page.
- Not interactive beyond its tooltip.

### 6. Expanded Row Panel

A second `tr` directly under its row (the `id` the row button points to), one cell across all columns,
`--color-surface-sunken` background, the same 3px tier bar on the left. Only open rows render their panel. It opens and
closes without animation.

```
┌─ Amazon Bedrock  Cloud platform · HQ US        [All providers for this model →] [Full provider profile →] ─┐
│ Compliance                                     EU routing                                                  │
│ ✓ EU-only data residency                       Text from the provider file…                                │
│   yes                                          Retention                                                   │
│ ? Inference stays in EU                        Text…                                                       │
│   unknown (not stated)                                                                                     │
│ ✓ Data processing agreement (DPA)                                                                          │
│   yes, online acceptance  ← link to source                                                                 │
│ …                                                                                                          │
├────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Sources                                        Status                                                      │
│ aws.amazon.com/bedrock/security-compliance/    AI draft · 2026-04-07                                       │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- Padding 20px 20px 24px; two-column grid `1.1fr 1fr`, gaps 20px × 40px.
- **Head** (full width, space-between, wraps): provider name as `h3` (17px / 600), then the meta "Cloud platform · HQ
  US" (15px / 400 muted, 8px gap). Right: two link buttons, 8px apart, radius 8px, padding 7px 12px, 14px / 500:
  "All providers for this model →" (white, 1px `--color-border-strong`, secondary text) and "Full provider profile →"
  (white, 1px `--color-accent` border, `--color-accent-ink` text).
- **Left column**, label "Compliance" (`h4`, 13px / 600 muted, 8px below): the compliance field list (component 7) with
  all fields of the provider: EU-only data residency · Inference stays in EU · DPA · No training on customer data ·
  SCCs · Adequacy decision (HQ) · Sub-processors · Certifications · EU AI Act status.
- **Right column:** "EU routing" and "Retention" labels, each followed by the provider's text (15px secondary,
  `max-width: 62ch`, 12px between paragraphs). A section without text is left out. Gateway models add the gateway note
  here as a third short section.
- **Foot** (full width, 1px top border, 16px padding-top, same two columns):
  - "Sources": source URLs without the protocol, one per line, 14px links in `--color-accent-ink`,
    `overflow-wrap: anywhere`.
  - "Status": the verification label (component 9) at 15px secondary.
- No explanatory text beyond these sections.

### 7. Compliance Field List (`BooleanRow`)

Used in the expanded panel and on the provider page.

- Each item: grid of an 18px mark column and the text, 10px gap, padding 5px 0, 1px `--color-border` between items.
- Label 15px primary; value as a second line, 14px muted ("yes", "no (USA)", "unknown (not stated)",
  "SOC2, ISO27001, …"). A value with a source is a link in `--color-accent-ink`.
- Marks, 16px, `aria-hidden`: ✓ in `--color-compliant-text` for yes, × in `--color-noncompliant-text` for no, ? in
  `--color-unverified-text` for unknown, a muted dot for lists such as certifications.
- Each item carries visually hidden text with its answer (": yes", ": no", ": unknown"), so meaning never depends on the
  mark or its color.

### 8. Mobile Rows (<768px)

- The table header is hidden; `table` and `tbody` become blocks; each row is a grid with the areas
  `"model comp" "num num"`, columns `minmax(0, 1fr) auto`, gaps 6px × 12px, padding 12px 14px 12px 13px, 1px bottom
  border, 3px tier bar on the left.
- Line 1: model name (16px / 500) and provider below it (15px muted) on the left; the tier pill top right. The gateway
  label sits at the right end of line 2 instead of after the model name.
- Line 2: the prices, left-aligned, 16px, tabular: "$3.00 · $15.00" (input first), or "Price not published".
- Residency, the chevron and the status are not shown in the row; residency and status are in the panel. The whole row
  is the tap target (the model button's `::after` covers the row, `position: relative` on the row).
- The panel is one column, padding 16px 14px 20px 13px, 18px gap; the two link buttons stack, padding 9px 12px, 15px.

### 9. Verification Label

A `<time datetime>` with the review status, never in table rows:

- AI-researched: "AI draft · 2026-04-07" / "KI-Entwurf · 2026-04-07". "AI draft" is an `<abbr>` with a dotted underline
  (offset 0.2em, `cursor: help`) and the title "Researched with AI assistance; not yet manually verified."
- Checked by a person: "Verified 2026-04-07" / "Verifiziert 2026-04-07", no abbreviation.
- Nothing for providers without compliance data.
- Shown in the expanded panel, on the provider page and on the model page. Dates are always ISO `YYYY-MM-DD`.

### 10. Buttons and Neutral Pills

- **Secondary button / link button:** white, 1px `--color-border-strong`, radius 8px, padding 7px 12px, 14px / 500,
  `--color-text-secondary`; hover border `--color-text-secondary`.
- **Primary button:** same shape, 1px `--color-accent` border, `--color-accent-ink` text; hover background
  `--color-accent-subtle`.
- **Neutral pill** (certifications, gateway label, provider type): radius 999px, 1px `--color-border`, padding 1–2px
  8–10px, 13px / 500, muted text on `--color-surface-alt` or white. Never tier colors.

### 11. Footer and Disclaimer

- 48px above (36px below 768px), 40px below; 14px muted (15px below 768px).
- The disclaimer is a paragraph with `role="note"`, `max-width: 72ch`, 12px below it: "This directory provides sourced
  information about AI providers' data practices. It is not legal advice. Always verify directly with the provider and
  consult legal counsel for compliance decisions."
- One wrapping line, items separated by "·", gaps 6px × 10px: "Data licensed under CC BY-NC-SA 4.0 · Code under MIT ·
  About · Imprint · Privacy · GitHub". Links muted with underline. Below 768px the data licence, the code licence and the
  links each take their own line, without a "·" between them.

---

## Other Pages

All pages share the header, footer, content width, colors, type and components above. The page title is the only serif
text. No page has an intro paragraph longer than one sentence.

### Model Page (`/[locale]/model/[id]`)

- Breadcrumb (14px muted, "/" separators `aria-hidden`): Models / {model}. 20px below, the `h1` with the model name.
- One line under the title, 15px muted: "Available from 4 providers".
- The finder without its search row: the refine row alone (preset chips, custom panel, count "3 of 4 providers").
- The model table with one row per offering provider. The first column shows the provider name as the primary line
  (the expand button) and the provider type below it; the other columns, the panel and dim-not-remove work as on the
  home page. No "more" row.

### Provider Page (`/[locale]/provider/[slug]`)

```
Models / Providers / Mistral

Mistral                                         [API docs ↗] [Report a change]
(EU compliant) API provider · mistral.ai ↗

┌ GDPR compliance ────────────┐ ┌ Data handling ──────────────┐
│ compliance field list       │ │ Regions, EU routing,         │
│                             │ │ retention, details,          │
│                             │ │ sub-processors               │
└─────────────────────────────┘ └──────────────────────────────┘
┌ Certifications & EU AI Act ─┐ ┌ Status & sources ───────────┐
│ neutral pills, AI Act text  │ │ verification label,          │
│                             │ │ pricing tier, sources, notes │
└─────────────────────────────┘ └──────────────────────────────┘

Models (26)
[table: Model · Modality · Context · Price / 1M tokens]
```

- Title row: `h1` left; right the secondary button "API docs ↗" and the primary button "Report a change".
- Under the title, one line with 10px gaps: tier pill with the long label, provider type (15px muted), website link.
- Cards: white, radius 10px, 1px border, padding 20px 24px, a two-column grid with 24px gaps (one column below 768px).
  Card headings `h2` 17px / 600 sentence case; inner labels 13px / 600 muted; text 15px secondary.
- Below the cards, `h2` "Models (26)" (20px / 600) and a table in the home table style: Model · Modality · Context ·
  Price / 1M tokens. Gateway providers split it into "Own models" and "Also available through this provider", each with
  its own table; the gateway explanation is one sentence under the second heading.
- A provider without compliance data shows one muted sentence in place of the compliance card.

### Providers List (`/[locale]/providers`)

- `h1` "AI inference providers, by GDPR compliance tier." / "KI-Inferenzanbieter, nach DSGVO-Konformitätsstufe."
- The finder with "Search providers…" / "Anbieter suchen…", the same preset chips, and the count "77 providers" /
  "21 of 77 providers".
- A table in the home style, one row per provider: **Provider** (name as primary line, linked to the profile; provider
  type below) · **Compliance** (tier pill) · **Residency** · **Models** (count, right-aligned, tabular) · a 44px cell
  with a → chevron. Rows link to the provider page; they do not expand. Default order: compliant, partial,
  noncompliant, unverified, then by name. Dim-not-remove applies to presets.
- Below 768px the rows use the mobile row grid: name and pill on line 1, residency and model count on line 2.

### Long-form Pages (About, Imprint, Privacy)

- `h1` as everywhere; 720px text column; body 16px / 1.6 `--color-text-secondary`; `h2` 20px / 600 primary with 32px
  above; links `--color-link`; call-to-action buttons in the primary button style.

---

## Interaction Patterns

### Filter: Dim-not-remove

A compliance filter (preset or custom) never removes rows. Matching rows come first in the current order; non-matching
rows follow, dimmed:

- `data-dimmed` on the row: primary and secondary text switch to `--color-text-muted` (at least 5.3:1 on every row
  background), the pill and the tier bar get `filter: grayscale(1)`. No opacity.
- Screen readers hear "Does not match the active filter." before the model name (visually hidden).
- Dimmed rows stay fully operable.

Why: it answers both "what passes?" and "what's excluded?" in one view.

### Detail: Inline expand

Clicking a row or activating its model-name button expands the inline panel (component 6) instead of navigating away.
The search, filter and scroll position stay as they are. No modals.

### Search: Immediate, no submit

The search input filters the full model list in the browser on every keypress with Fuse.js: typo-tolerant for words,
literal match for version numbers, every word of the query must match. Unlike the compliance filter, search narrows the
list: rows that do not match are not rendered. No search button. The query is written to the URL 300ms after typing
stops.

### Sort

Clicking a sortable header sorts ascending, then descending, then back to the default order. Models without a price
always sort last. Without an explicit sort, search results stay in relevance order.

### Shareable State

Search query, filters and sort map to the URL: `q`, `profile` (`strict-eu`, `eu-sccs`, `no-training`, `custom`),
`euOnly`, `dpa`, `noTraining`, `sccs` (with `profile=custom`), `sort`, `dir`, for example
`?q=claude&profile=strict-eu&sort=price&dir=desc`. The URL is updated with `history.replaceState`; changing state never
requests the server. Until the client has applied the URL state, the table carries `data-url-pending` and stays hidden
for at most 3s. Expanded rows and the number of loaded rows are not part of the URL.

### Motion

- Only state changes move: row background and chevron rotation, 150ms ease-out; button hover 100ms.
- Nothing animates on load. No skeletons for content rendered on the server.
- Panels open and close without height animation.
- Under `prefers-reduced-motion: reduce` all transitions are off.

---

## Internationalization

- Locales `en` and `de` with `next-intl`, routed as `/en/…` and `/de/…`; `x-default` is `en`.
- Every visible string, `aria-label` and `title` comes from `messages/en.json` and `messages/de.json`. No copy in
  components.
- Prices and counts follow the locale's number format (see the table); dates stay ISO.
- German copy uses "Sie". Layouts must not depend on word length in either language: chips wrap, the count moves to its
  own line on mobile, header labels may break.

---

## Accessibility

- Target WCAG 2.2 AA. All text pairs meet at least 4.5:1, dimmed rows included.
- Focus: `:focus-visible` 2px solid `--color-accent`, offset 2px (model-name buttons offset 3px with a 3px radius). The
  search input has no outline of its own; the finder's `:focus-within` state shows focus.
- Keyboard: chips, the custom panel and its checkboxes, search, clear button, sort buttons, model-name buttons, panel
  links, "Load more" and the drawer are reachable and operable with Tab, Enter and Space. Expand controls are real
  buttons with `aria-expanded` and `aria-controls`.
- The table keeps table semantics on desktop with an `aria-label`; sortable columns use `aria-sort` and labelled sort
  buttons; the toggle column header contains visually hidden "Details".
- Compliance marks are `aria-hidden` and every field has visually hidden yes / no / unknown text.
- Presets: a `role="group"` with a label, `aria-pressed` per chip. The count is a polite live region.
- Mobile drawer: opening moves focus to its first link and makes the rest of the page `inert`; Escape and link
  activation close it; closing returns focus to the menu button. The menu button has `aria-expanded`, `aria-controls`
  and a label that switches between "Open menu" and "Close menu".
- Tooltips (`title`) only repeat information that is available without them: the pill's properties are in the panel,
  the meaning of "AI draft" is on the About page.
- Touch targets: chips and buttons at least 32px high; mobile rows are tappable over their full area.
- The search input is at least 16px on mobile.

---

## What NOT to Do (Anti-patterns)

- **No review status in table rows.** Status lives in the expanded panel and on detail pages.
- **No badge clusters in rows.** One tier pill per row; the individual properties are in its tooltip and the panel.
- **No explanatory blocks on list pages.** No intro paragraphs under the title, no "Filter:" labels, no legends, no
  info boxes, no stats sidebars.
- **No hero sections with taglines.** The home page is a search interface, not a landing page.
- **No gradient backgrounds, glows or decorative shadows.** The compliance colors need a neutral canvas.
- **No loading skeletons for above-the-fold content.** Pages are prerendered from the cached model catalog and the
  provider files.
- **No star ratings or "scores."** Compliance is factual, not rated. Scores create liability.
- **No marketing language.** Every word earns its place.
- **No modals for compliance detail.** Modals break the URL. Expand inline or navigate to a dedicated page.
- **No monospace, no text below 13px, no uppercase outside table headers, no weight above 600.**
- **No purple gradients, no Inter font, no Tailwind `rounded-2xl` on everything.** This site should not look like any
  other AI product.
- **No "Coming soon" placeholders.** Ship what works.

---

## SEO Design Requirements

- Every page title follows `{Model or Provider Name} — InferCheck` (the `titleTemplate` in the `Layout` messages).
- The `<h1>` is visible in the first viewport and contains the primary keyword.
- Model rows and provider rows include the provider name as readable text.
- Review dates are `<time datetime="…">` elements.
- JSON-LD per page type: Dataset on the home page and the providers page, Organization on provider pages,
  SoftwareApplication with one Offer per provider on model pages.

---

## Voice & Tone

The editorial copy (summaries, notes, About page) should sound like:

- A senior developer who works in enterprise IT and has read a lot of DPAs
- Direct. No hedging where it isn't needed.
- Plain words for compliance jargon the first time it appears (e.g. "Standard Contractual Clauses (SCCs)")
- Willing to say "this provider's DPA is weak" or "this claim is unverified" — the site's value is honesty

**Avoid:** "Empowering teams to…", "Unlock compliance…", "Seamlessly…", passive voice in compliance notes, superlatives.

---

## File & Component Naming Conventions

```
src/
  app/
    [locale]/
      page.tsx                  # Home: finder + model table
      providers/page.tsx        # Providers table, ordered by tier
      provider/[slug]/page.tsx  # Provider profile
      model/[id]/page.tsx       # Model detail: table of offering providers
      about/ imprint/ privacy/  # Long-form pages
    globals.css                 # Design tokens (@theme) and the few CSS-only rules
  components/
    ComplianceBadge.tsx         # Tier pill
    BooleanRow.tsx              # Compliance field list item
    FilterBar.tsx               # Preset chips, custom panel, count (refine row)
    GatewayPill.tsx             # Neutral "via gateway" label
    ModelBrowser.tsx            # Finder + table, driven by the URL query
    ModelTable.tsx              # Search, filter, sort, table, load more
    ModelRow.tsx                # Row, mobile row and expanded panel
    ProviderRow.tsx             # Row of the providers table
    ProviderModelRow.tsx        # Row of the provider page's model table
    VerificationLabel.tsx       # AI draft / verified date
    Nav.tsx  Footer.tsx  LanguageSwitcher.tsx
  lib/
    compliance.ts               # Tiers, TIER_CLASSES, filter presets and matching
```

---

## Color Tokens in Tailwind

Tailwind 4 reads the tokens from the `@theme` block in `src/app/globals.css`. Every `--color-*` token becomes utilities
(`bg-surface-sunken`, `text-compliant-text`, `border-partial-line`). The fonts are declared there too:

```css
@theme {
  --color-bg: #f7f6f1;
  --color-surface: #ffffff;
  --color-surface-alt: #f3f1ec;
  --color-surface-sunken: #faf9f5;
  --color-row-hover: #fbfaf7;
  --color-border: #e4e1d9;
  --color-border-strong: #cfcbc1;
  --color-text-primary: #161a1f;
  --color-heading: #161a1f;
  --color-text-secondary: #3a414a;
  --color-text-muted: #5b6470;
  --color-placeholder: #6b7280;
  --color-link: #1d4ed8;
  --color-link-hover: #1e40af;

  --color-accent: #1d4ed8;
  --color-accent-ink: #1e40af;
  --color-accent-subtle: #e8eefb;

  --color-compliant-text: #15803d;
  --color-compliant-bg: #e9f8ee;
  --color-compliant-line: #22c55e;
  --color-partial-text: #855900;
  --color-partial-bg: #fdf5d9;
  --color-partial-line: #e0b80d;
  --color-noncompliant-text: #b42318;
  --color-noncompliant-bg: #fdecea;
  --color-noncompliant-line: #ef5350;
  --color-unverified-text: #4b5563;
  --color-unverified-bg: #eef0f3;
  --color-unverified-line: #9aa3ad;

  --font-display: "Instrument Serif", Georgia, serif;
  --font-body: "DM Sans", system-ui, sans-serif;
}
```

Add or change a token there and in the tables above; do not repeat hex values in components.
