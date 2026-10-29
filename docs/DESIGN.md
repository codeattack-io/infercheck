# InferCheck — Design Guide

> Direction: "EU Compliance Desk" + editorial tone

---

## Design Philosophy

This site is a **compliance reference tool built by a human expert, not a vendor product or a marketing site.** Every design decision should reinforce that.

Three principles drive every choice:

1. **Answer the question fast.** A product manager under legal review, a CTO forwarding a link to counsel, a freelancer checking a provider before a client call — they all need the answer in seconds. Speed of comprehension is a design feature.

2. **Trust through structure, not decoration.** Trust comes from clearly sourced, consistently formatted data — not from hero sections, gradients, or stock photography. The layout's job is to get out of the way of the data.

3. **Independent editorial voice.** The site reads like a well-maintained technical publication written by someone who has been inside GDPR compliance work — not like a SaaS product or a law firm brochure. Some personality is welcome. Sterile corporate design is not.

---

## Color System

### Base Palette

| Token                    | Value     | Usage                                          |
| ------------------------ | --------- | ---------------------------------------------- |
| `--color-bg`             | `#f5f4ef` | Page background — warm off-white, not clinical |
| `--color-surface`        | `#ffffff` | Cards, panels, table rows                      |
| `--color-surface-alt`    | `#eeeee8` | Alternate row backgrounds, subtle dividers     |
| `--color-border`         | `#d6d4cc` | Borders, separators                            |
| `--color-text-primary`   | `#1a1f2e` | Body text, table values                        |
| `--color-text-secondary` | `#5a6070` | Labels, captions, timestamps                   |
| `--color-text-muted`     | `#9aa0ad` | Placeholder text, unverified indicators        |
| `--color-heading`        | `#0f1520` | Page titles, provider names                    |
| `--color-link`           | `#1d4ed8` | Interactive links                              |
| `--color-link-hover`     | `#1e40af` | Link hover state                               |

### Semantic Compliance Colors

These are the only colors with meaning. Use them consistently and only for compliance signal. Each of the four tiers has four tokens: a fill, a background, a border and a text color.

| Token                         | Value     | Usage                                                   |
| ----------------------------- | --------- | ------------------------------------------------------- |
| `--color-compliant`           | `#16a34a` | Fully EU-compliant: dot fill, row border-left, ✓ symbol |
| `--color-compliant-bg`        | `#f0fdf4` | Badge and pill background                               |
| `--color-compliant-border`    | `#bbf7d0` | Badge and pill border                                   |
| `--color-compliant-text`      | `#15803d` | Badge and pill text                                     |
| `--color-partial`             | `#d97706` | Partial / EU with SCCs: dot fill, row border-left       |
| `--color-partial-bg`          | `#fffbeb` | Badge and pill background                               |
| `--color-partial-border`      | `#fde68a` | Badge and pill border                                   |
| `--color-partial-text`        | `#92400e` | Badge and pill text                                     |
| `--color-noncompliant`        | `#dc2626` | Non-compliant: dot fill, row border-left, ✗ symbol      |
| `--color-noncompliant-bg`     | `#fef2f2` | Badge and pill background                               |
| `--color-noncompliant-border` | `#fecaca` | Badge and pill border                                   |
| `--color-noncompliant-text`   | `#b91c1c` | Badge and pill text                                     |
| `--color-unverified`          | `#9aa0ad` | Not verified or unknown: dot fill, row border-left      |
| `--color-unverified-bg`       | `#f8f8f7` | Badge and pill background                               |
| `--color-unverified-border`   | `#e2e2de` | Badge and pill border                                   |
| `--color-unverified-text`     | `#6b7280` | Badge and pill text                                     |

**Rule:** Never use red/amber/green for anything except compliance status. No success toasts in green. No warning banners in amber. These colors belong to the compliance signal system only. The one exception is the gateway pill, which uses the partial (amber) color to flag that a model is hosted for a third party.

`TIER_CLASSES` in `src/lib/compliance.ts` maps each tier to its Tailwind classes (`text`, `bg`, `border`, `dot`, `dotInk`, `accentBorder`). Components take tier colors from there instead of naming the tokens themselves.

### Accent

| Token                   | Value     | Usage                                                               |
| ----------------------- | --------- | ------------------------------------------------------------------- |
| `--color-accent`        | `#1d4ed8` | Primary interactive elements (buttons, focus rings, active filters) |
| `--color-accent-hover`  | `#1e3a8a` | Hover state on accent elements                                      |
| `--color-accent-subtle` | `#eff6ff` | Subtle accent backgrounds (active filter chip)                      |

---

## Typography

### Font Stack

```css
/* Display / headings — character and authority */
--font-display: "Instrument Serif", Georgia, serif;

/* UI / body / data — clean, readable at small sizes */
--font-body: "DM Sans", system-ui, sans-serif;

/* Code / technical values — data fields, provider IDs, timestamps */
--font-mono: "IBM Plex Mono", "Courier New", monospace;
```

**Loaded with `next/font/google` in `src/app/[locale]/layout.tsx`** (self-hosted at build time, `font-display: swap`):

- `Instrument Serif` — 400, 400 italic
- `DM Sans` — 400, 500, 600
- `IBM Plex Mono` — 400, 500

### Type Scale

| Level     | Element                         | Font             | Size             | Weight | Line-height |
| --------- | ------------------------------- | ---------------- | ---------------- | ------ | ----------- |
| `display` | Home and providers headings     | Instrument Serif | 2.5rem (40px)    | 400    | 1.15        |
| `h1`      | Detail page titles              | Instrument Serif | 2rem (32px)      | 400    | 1.2         |
| `h2`      | Section headings                | DM Sans          | 1.25rem (20px)   | 600    | 1.3         |
| `h3`      | Card headings, provider names   | DM Sans          | 1rem (16px)      | 600    | 1.4         |
| `body`    | Body copy, descriptions         | DM Sans          | 0.9375rem (15px) | 400    | 1.6         |
| `small`   | Labels, timestamps, captions    | DM Sans          | 0.8125rem (13px) | 400    | 1.5         |
| `micro`   | Badge text, table metadata      | DM Sans          | 0.75rem (12px)   | 500    | 1.4         |
| `mono`    | Provider IDs, dates, API values | IBM Plex Mono    | 0.8125rem (13px) | 400    | 1.5         |

### Typography Rules

- Serif font is used **only** for page headings (`display`, `h1`) and the headings of the long-form pages (about, imprint, privacy). The wordmark and everything else is DM Sans.
- Monospace is used for: verification labels and dates, pricing values, context sizes.
- Do not use font-weight 700+ anywhere. Maximum weight is 600 (semi-bold). The type system conveys hierarchy through size and font choice, not heaviness.
- Line lengths for intro copy under page headings: `max-w-[55ch]`.
- Italic serif is available and welcome in pull quotes or editorial callout text.

---

## Layout & Grid

### Page Width

```
Max content width:   1200px  (every page, header and footer included)
Padding (mobile):    16px
Padding (tablet):    24px  (sm, 640px and up)
Padding (desktop):   40px  (lg, 1024px and up)
```

### Breakpoints

Tailwind's defaults. What changes at each one:

| Name | Min-width | Notes                                                                                                |
| ---- | --------- | ---------------------------------------------------------------------------------------------------- |
| `sm` | 640px     | Header shows the inline nav instead of the menu button; Compliance column appears in the model table |
| `md` | 768px     | Residency column appears                                                                             |
| `lg` | 1024px    | Price column appears; provider page switches to two columns                                          |
| `xl` | 1280px    | Status column appears                                                                                |

Page layouts use flexbox and CSS grid per component; there is no global column grid.

### Spacing Scale

Follow Tailwind's default spacing scale (4px base unit). Key values:

| Token      | px   | Common use                    |
| ---------- | ---- | ----------------------------- |
| `space-1`  | 4px  | Micro gaps (icon to label)    |
| `space-2`  | 8px  | Badge padding, tight gaps     |
| `space-3`  | 12px | Inner card padding            |
| `space-4`  | 16px | Standard element spacing      |
| `space-6`  | 24px | Card padding, section gaps    |
| `space-8`  | 32px | Major section separation      |
| `space-12` | 48px | Page section breaks           |
| `space-16` | 64px | Hero section vertical padding |

---

## Component Patterns

### 1. Compliance Badge

The atomic unit of the compliance display system.

**Structure:** `[colored dot] [label text]`

```
Shape:       Pill, 4px border-radius
Padding:     md: 2px 8px   sm: 1px 6px
Font:        DM Sans 500, md: 12px   sm: 11px
Border:      1px solid, the tier's border token
```

**Variants:**

| Variant          | Tier         | Text               |
| ---------------- | ------------ | ------------------ |
| EU Only          | compliant    | "EU Only"          |
| DPA Available    | compliant    | "DPA"              |
| EU + SCCs        | partial      | "EU + SCCs"        |
| No Training      | compliant    | "No Training"      |
| Trains on Data   | noncompliant | "Trains on Data"   |
| Training Unknown | unverified   | "Training Unknown" |
| US Only          | noncompliant | "US Only"          |
| Unverified       | unverified   | "Unverified"       |

Each badge takes the dot, background, border and text color of its tier. `getBadgeVariants` in `ComplianceBadge.tsx` picks the badges for a provider: "EU Only", else "EU + SCCs" when SCCs are in place; "DPA" when a DPA is available; and always one training badge. "US Only" exists as a variant but no rule produces it. Providers without compliance data show only "Unverified".

**Rule:** Never use a badge for anything except a compliance property. Badge = compliance signal. Full stop.

---

### 2. Provider Card

Used in the grouped grid on the providers page. Compact summary of a provider's compliance posture.

**Structure:**

```
┌─[left border: compliance color]──────────────────┐
│  [Provider name]              [Tier label]        │
│                                                    │
│  [Badge row: EU Only] [DPA] [No Training]         │
│                                                    │
│  [Type · N models]       [Verification label]     │
└────────────────────────────────────────────────────┘
```

The whole card is one link to the provider profile. The providers page groups cards into one section per tier (compliant, partial, non-compliant, unverified), each with a colored dot, the tier name, a count and a one-line description.

**Left border:** 3px solid, color = overall compliance tier (green/amber/red/grey). This is the fastest scan signal — users learn to read the left rail at a glance.

**Card sizing:** `grid-cols-[repeat(auto-fill,minmax(280px,1fr))]`; cards are at least 280px wide and grow with the grid.

**Hover state:** Subtle box-shadow lift (`0 2px 8px rgba(0,0,0,0.08)`), no color change. No dramatic transforms.

---

### 3. Model Row (Table View)

Used in the model table on the homepage. Dense, scannable.

**Columns:**

| Column     | Visible from | Content                                                                       |
| ---------- | ------------ | ----------------------------------------------------------------------------- |
| Model      | always       | Model name (semibold), gateway pill when a third party's model, provider name |
| Compliance | `sm`         | Badge cluster from `getBadgeVariants`; "Unverified" without compliance data   |
| Residency  | `md`         | "EU" for EU-only providers, else the provider's regions                       |
| Price      | `lg`         | Input and output price per 1M tokens, monospace                               |
| Status     | `xl`         | Verification label: "AI draft · date" or "Verified date", monospace, muted    |
| Details    | always       | Round +/− button that expands the row                                         |

The Model, Compliance and Price headers sort the table; Residency and Status do not.

**Row left-border:** 2px solid, compliance color tier. Same signal system as cards.

**Narrow screens:** Columns drop out as listed above; the row stays a table row. Everything a hidden column showed is in the expanded panel or on the provider page.

---

### 4. Filter Bar

The compliance filter is the primary interaction. Design it to be immediately legible without any explanation.

**Preset buttons (row above the table):**

```
Filter:  [ Strict EU ] [ EU + SCCs ] [ No Training ] [ Custom ▼ ]
```

- Default state: surface background, 1px `#b8b5ac` border, `--color-text-primary` text, faint shadow
- Active state: filled `--color-accent-subtle`, border `--color-accent`, text `--color-accent`
- These are toggle buttons (`aria-pressed`) — one can be active at a time, or none (show all)
- "Custom ▼" opens an inline panel below with individual boolean toggles

| Preset      | Requires                     |
| ----------- | ---------------------------- |
| Strict EU   | EU only, DPA, no training    |
| EU + SCCs   | DPA, SCCs, no training       |
| No Training | no training on customer data |

**Custom panel (expanded):**

```
┌──────────────────────────────────────────────────────┐
│  Data stays in EU     [●──] on                       │
│  DPA available        [──○] off                      │
│  No training on data  [──○] off                      │
│  SCCs in place        [──○] off                      │
└──────────────────────────────────────────────────────┘
```

Toggle switches (`role="switch"`): 32×18px, pill shape. Active = `--color-accent`. Inactive = `--color-border`.

**URL persistence:** Every filter state is reflected in URL params (`?profile=strict-eu`, or `?profile=custom&euOnly=true&dpa=true`). Links are always shareable. This is a hard requirement — compliance teams share links with legal.

---

### 5. Provider Profile Page

Full-width layout inside the 1200px container.

**Structure:**

```
Breadcrumb: Models / Providers / [Provider name]

[Provider name — h1 serif]                [API docs] [Report a change]
[Tier pill] [Provider type] [Website ↗]

┌─────────────────────────────┬─────────────────────────────┐
│ GDPR COMPLIANCE             │ DATA HANDLING               │
│ ✓/✗/? rows + badge set      │ Residency, retention,       │
│ (left border: tier color)   │ training, sub-processors    │
├─────────────────────────────┼─────────────────────────────┤
│ CERTIFICATIONS & EU AI ACT  │ VERIFICATION                │
│                             │ Status, date, pricing tier, │
│                             │ sources, notes              │
└─────────────────────────────┴─────────────────────────────┘

MODELS (N)
[Table: Model / Modality / Context / Input / Output]
Native models first; models the provider hosts for third parties
follow under a gateway heading with a note.
```

Below `lg` the cards stack in one column. A provider without compliance data shows a notice in place of the compliance details.

**Field rows:** Label `--color-text-secondary`. Boolean values are rendered as ✓ / ✗ / ? with their semantic color (green, red, muted), and the answer is also available as screen reader text — no plain "Yes/No" text.

**Verification card:** Shows the status (AI draft, verified by a name, or none), the date, the pricing tier and the list of source URLs. For AI drafts it adds a note that the entry has not been checked manually.

---

### 6. Navigation / Header

Minimal. The nav should not compete with the data.

**Structure:**

```
[Icon] InferCheck             [Models] [Providers] [About]  [EN | DE]
```

- Wordmark: the 24px app icon followed by "Infer" in `--color-text-primary` and "Check" in `--color-accent`, DM Sans 17px / 600
- Nav links: DM Sans 14px / 500, `--color-text-secondary`; active = `--color-text-primary` + underline
- Language switcher: one button per locale, the active one marked
- No mega-menus, no dropdowns, no hamburger animation drama
- Sticky, 56px high; after scrolling past 8px it gets a `backdrop-blur` and a border-bottom
- Below `sm`: links and language switcher collapse into a drawer from the right. Escape closes it, focus moves into it and back to the menu button, and the page behind it is `inert`.

---

### 7. Disclaimer Note

Part of the footer, so it appears on every page. Not a cookie banner, not a banner at all: an editorial note.

**Style:**

- Last element of the footer, below a border-top
- Font: DM Sans 12px, `--color-text-muted`
- `role="note"`
- Text: "This directory provides sourced information about AI providers' data practices. It is not legal advice. Always verify directly with the provider and consult legal counsel for compliance decisions."

The footer above it carries the license line and links to About, Imprint, Privacy and GitHub.

---

### 8. Gateway Pill

A small amber outlined pill reading "via gateway" next to a model name when the provider hosts a third party's model (for example Claude on Amazon Bedrock). The expanded table row and the provider page add a short notice explaining it.

---

### 9. Verification Label

A `<time>` element in monospace: "AI draft · 2026-04-07" for AI-researched entries (with a tooltip explaining it), "Verified 2026-04-07" for entries a person checked. Nothing is shown for entries without compliance data. It appears on provider cards, in the model table's Status column and on the model and provider pages.

---

## Interaction Patterns

### Filter: Dim-not-remove

When a compliance filter is active, non-matching rows are **dimmed** rather than removed from the DOM: they move below the matching rows, turn grayscale, and their text takes the secondary color (still AA contrast against the row background). Screen readers hear "Does not match the active filter" in front of the model name. This communicates the full landscape while highlighting what passes the filter.

Why: It answers both "what passes?" and "what's excluded?" in a single view. Enterprise users reviewing options want to see what they're ruling out.

### Detail: Inline expand

On the homepage model table, clicking a row (or its +/− button, which is keyboard-operable) expands an inline detail panel instead of navigating away. The panel shows the provider name, links to all providers of that model and to the full provider profile, a notice for gateway models, the key compliance answers (EU data residency, DPA, training, SCCs) and the EU routing details.

Why: Maintains search/filter context. Reduces navigation friction for users comparing multiple options quickly.

### Search: Immediate, no submit

The search input filters the full model list in the browser on every keypress with Fuse.js: typo-tolerant for words, literal match for version numbers, and every word of the query must match. No search button. No enter required. The query is written to the URL 300 ms after typing stops.

### Sort

Clicking the Model, Compliance or Price header sorts ascending, then descending, then back to the default order. Models without a price always sort last. Without an explicit sort, search results stay in relevance order.

### Shareable state

Search query, filters and sort map to the URL: `?q=claude&profile=strict-eu&sort=price&dir=desc`. Users should be able to copy the URL from their browser and paste it into an email to legal/procurement. Changing this state never requests the server. Which rows are expanded is not part of the URL.

---

## What NOT to Do (Anti-patterns)

- **No hero sections with taglines.** The homepage is a search interface, not a landing page. Users who arrive via search know what this is.
- **No gradient backgrounds.** The compliance color system needs a neutral canvas. Gradients corrupt the signal.
- **No loading skeletons for above-the-fold content.** Pages are prerendered from the cached model catalog and the provider files, so the page renders fully on first paint.
- **No star ratings or "scores."** Compliance is not rated. It is factual. Scores create liability.
- **No marketing language in the UI copy.** "Powerful filtering" → just filter. "Comprehensive coverage" → just list what's covered. Every word earns its place.
- **No modals for compliance detail.** Modals break the URL. Use inline expand or navigate to a dedicated page.
- **No purple gradients, no Inter font, no Tailwind `rounded-2xl` on everything.** This site should not look like any other AI product.
- **No "Coming soon" placeholders.** If a feature isn't built, don't show the ghost of it. Ship what works.

---

## SEO Design Requirements

These are design constraints, not afterthoughts:

- Every page title follows: `{Model or Provider Name} — InferCheck` (the `titleTemplate` in the `Layout` messages)
- `<h1>` is always visible in the viewport on load, contains the primary keyword
- Provider cards and model rows include the provider name as readable text — for crawlers
- "Last verified" dates are rendered as `<time datetime="...">` elements
- JSON-LD structured data is injected per page type: Dataset on the homepage and the providers page, Organization on provider pages, SoftwareApplication with one Offer per provider on model pages

---

## Voice & Tone

The editorial copy on this site (summaries, notes, about page) should sound like:

- A senior developer who works in enterprise IT and has read a lot of DPAs
- Direct. No hedging language where it's not needed.
- Plain English for compliance jargon the first time it appears (e.g. "Standard Contractual Clauses (SCCs)")
- Willing to say "this provider's DPA is weak" or "this claim is unverified" — the site's value is honesty, not diplomacy

**Avoid:**

- "Empowering teams to..." / "Unlock compliance..." / "Seamlessly..."
- Passive voice in compliance notes
- Marketing superlatives of any kind

---

## File & Component Naming Conventions

```
src/
  app/
    [locale]/
      page.tsx                  # Homepage: model search and table
      providers/page.tsx        # Providers grouped by compliance tier
      provider/[slug]/page.tsx  # Provider profile
      model/[id]/page.tsx       # Model detail: one card per offering provider
      about/ imprint/ privacy/  # Long-form pages
    globals.css                 # Design tokens (@theme) and the few CSS-only rules
  components/
    ComplianceBadge.tsx         # Single badge, badge list, getBadgeVariants
    BooleanRow.tsx              # ✓ / ✗ / ? row with label
    FilterBar.tsx               # Filter presets + custom panel
    GatewayPill.tsx             # "via gateway" marker
    ModelBrowser.tsx            # Filter bar + table, driven by the URL query
    ModelTable.tsx              # Search, filter, sort, table
    ModelRow.tsx                # Single row + inline expand
    ProviderCard.tsx            # Summary card with left-border signal
    ProviderModelRow.tsx        # Row of the provider page's model table
    VerificationLabel.tsx       # AI draft / verified date
    Nav.tsx  Footer.tsx  LanguageSwitcher.tsx
  lib/
    compliance.ts               # Tiers, TIER_CLASSES, filter presets and matching
```

---

## Color Tokens in Tailwind

Tailwind 4 reads the tokens from the `@theme` block in `src/app/globals.css`. Every `--color-*` token becomes utilities, so `--color-surface-alt` is available as `bg-surface-alt` and `--color-compliant-border` as `border-compliant-border`. The fonts are declared there too:

```css
@theme {
  --color-bg: #f5f4ef;
  --color-surface: #ffffff;
  --color-compliant: #16a34a;
  --color-compliant-bg: #f0fdf4;
  --color-compliant-border: #bbf7d0;
  --color-compliant-text: #15803d;
  --color-accent: #1d4ed8;
  /* … all tokens listed above … */

  --font-display: "Instrument Serif", Georgia, serif;
  --font-body: "DM Sans", system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", "Courier New", monospace;
}
```

Add or change a token there and in the tables above; do not repeat hex values in components.
