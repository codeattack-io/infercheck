# InferCheck — Design Guide

> Phase 2 MVP Frontend  
> Direction: Concept B "EU Compliance Desk" + editorial tone  
> Decided: 2026-04-09

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

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#f5f4ef` | Page background — warm off-white, not clinical |
| `--color-surface` | `#ffffff` | Cards, panels, table rows |
| `--color-surface-alt` | `#eeeee8` | Alternate row backgrounds, subtle dividers |
| `--color-border` | `#d6d4cc` | Borders, separators |
| `--color-text-primary` | `#1a1f2e` | Body text, table values |
| `--color-text-secondary` | `#5a6070` | Labels, captions, timestamps |
| `--color-text-muted` | `#9aa0ad` | Placeholder text, unverified indicators |
| `--color-heading` | `#0f1520` | Page titles, provider names |
| `--color-link` | `#1d4ed8` | Interactive links |
| `--color-link-hover` | `#1e40af` | Link hover state |

### Semantic Compliance Colors

These are the only colors with meaning. Use them consistently and only for compliance signal.

| Token | Value | Meaning | Usage |
|---|---|---|---|
| `--color-compliant` | `#16a34a` | Fully EU-compliant | Badge fill, row border-left, icon |
| `--color-compliant-bg` | `#f0fdf4` | — | Badge background |
| `--color-partial` | `#d97706` | Partial / EU with SCCs | Badge fill, row border-left, icon |
| `--color-partial-bg` | `#fffbeb` | — | Badge background |
| `--color-noncompliant` | `#dc2626` | Non-compliant / US-only | Badge fill, row border-left, icon |
| `--color-noncompliant-bg` | `#fef2f2` | — | Badge background |
| `--color-unverified` | `#9aa0ad` | Not yet verified | Badge fill, row border-left, icon |
| `--color-unverified-bg` | `#f8f8f7` | — | Badge background |

**Rule:** Never use red/amber/green for anything except compliance status. No success toasts in green. No warning banners in amber. These colors belong to the compliance signal system only.

### Accent

| Token | Value | Usage |
|---|---|---|
| `--color-accent` | `#1d4ed8` | Primary interactive elements (buttons, focus rings, active filters) |
| `--color-accent-hover` | `#1e3a8a` | Hover state on accent elements |
| `--color-accent-subtle` | `#eff6ff` | Subtle accent backgrounds (active filter chip) |

---

## Typography

### Font Stack

```css
/* Display / headings — character and authority */
--font-display: 'Instrument Serif', Georgia, serif;

/* UI / body / data — clean, readable at small sizes */
--font-body: 'DM Sans', system-ui, sans-serif;

/* Code / technical values — data fields, provider IDs, timestamps */
--font-mono: 'IBM Plex Mono', 'Courier New', monospace;
```

**Load via Google Fonts:**
- `Instrument Serif` — 400, 400 italic
- `DM Sans` — 400, 500, 600
- `IBM Plex Mono` — 400, 500

### Type Scale

| Level | Element | Font | Size | Weight | Line-height |
|---|---|---|---|---|---|
| `display` | Page hero headings | Instrument Serif | 2.5rem (40px) | 400 | 1.15 |
| `h1` | Page titles | Instrument Serif | 1.875rem (30px) | 400 | 1.2 |
| `h2` | Section headings | DM Sans | 1.25rem (20px) | 600 | 1.3 |
| `h3` | Card headings, provider names | DM Sans | 1rem (16px) | 600 | 1.4 |
| `body` | Body copy, descriptions | DM Sans | 0.9375rem (15px) | 400 | 1.6 |
| `small` | Labels, timestamps, captions | DM Sans | 0.8125rem (13px) | 400 | 1.5 |
| `micro` | Badge text, table metadata | DM Sans | 0.75rem (12px) | 500 | 1.4 |
| `mono` | Provider IDs, dates, API values | IBM Plex Mono | 0.8125rem (13px) | 400 | 1.5 |

### Typography Rules

- Serif font is used **only** for display/hero headings and the site name. Everything else is DM Sans.
- Monospace is used for: last-verified dates, provider slugs, pricing values, API endpoint references.
- Do not use font-weight 700+ anywhere. Maximum weight is 600 (semi-bold). The type system conveys hierarchy through size and font choice, not heaviness.
- Line lengths for body copy: 65–75 characters max (`max-width: 65ch`).
- Italic serif is available and welcome in pull quotes or editorial callout text.

---

## Layout & Grid

### Page Width

```
Max content width:   1200px
Narrow prose width:  720px  (provider detail, about pages)
Padding (mobile):    16px
Padding (tablet):    24px
Padding (desktop):   40px
```

### Grid System

Use a 12-column CSS grid for page layout. Key breakpoints:

| Name | Min-width | Notes |
|---|---|---|
| `sm` | 640px | Single-column collapses end here |
| `md` | 768px | Filter sidebar becomes inline |
| `lg` | 1024px | Full multi-column table view |
| `xl` | 1280px | Max content width reached |

### Spacing Scale

Follow Tailwind's default spacing scale (4px base unit). Key values:

| Token | px | Common use |
|---|---|---|
| `space-1` | 4px | Micro gaps (icon to label) |
| `space-2` | 8px | Badge padding, tight gaps |
| `space-3` | 12px | Inner card padding |
| `space-4` | 16px | Standard element spacing |
| `space-6` | 24px | Card padding, section gaps |
| `space-8` | 32px | Major section separation |
| `space-12` | 48px | Page section breaks |
| `space-16` | 64px | Hero section vertical padding |

---

## Component Patterns

### 1. Compliance Badge

The atomic unit of the compliance display system.

**Structure:** `[colored dot] [label text]`

```
Shape:       Pill, 4px border-radius
Padding:     2px 8px
Font:        DM Sans 12px / 500
Border:      1px solid (slightly darker than bg)
```

**Variants:**

| Variant | Dot color | Text | Background | Border |
|---|---|---|---|---|
| EU Only | `--color-compliant` | "EU Only" | `--color-compliant-bg` | `#bbf7d0` |
| DPA Available | `--color-compliant` | "DPA" | `--color-compliant-bg` | `#bbf7d0` |
| EU + SCCs | `--color-partial` | "EU + SCCs" | `--color-partial-bg` | `#fde68a` |
| No Training | `--color-compliant` | "No Training" | `--color-compliant-bg` | `#bbf7d0` |
| Trains on Data | `--color-noncompliant` | "Trains on Data" | `--color-noncompliant-bg` | `#fecaca` |
| US Only | `--color-noncompliant` | "US Only" | `--color-noncompliant-bg` | `#fecaca` |
| Unverified | `--color-unverified` | "Unverified" | `--color-unverified-bg` | `#e2e2de` |

**Rule:** Never use a badge for anything except a compliance property. Badge = compliance signal. Full stop.

---

### 2. Provider Card

Used in grid views and search results. Compact summary of a provider's compliance posture.

**Structure:**
```
┌─[left border: compliance color]──────────────────┐
│  [Provider logo 24px]  [Provider name h3]         │
│  [Provider type tag: "API" / "Cloud Platform"]    │
│                                                    │
│  [Badge row: EU Only] [DPA] [No Training]         │
│                                                    │
│  [Data residency label]  [Last verified mono]     │
│                                                    │
│  [→ View profile link]                            │
└────────────────────────────────────────────────────┘
```

**Left border:** 3px solid, color = overall compliance tier (green/amber/red/grey). This is the fastest scan signal — users learn to read the left rail at a glance.

**Card sizing:** `min-width: 280px`, grows with grid. In list view, cards span full width.

**Hover state:** Subtle box-shadow lift (`0 2px 8px rgba(0,0,0,0.08)`), no color change. No dramatic transforms.

---

### 3. Model Row (Table View)

Used on the homepage and model detail pages. Dense, scannable.

**Columns (desktop):**

| Column | Width | Content |
|---|---|---|
| Model | 25% | Model name (bold) + provider logo (16px) + provider name |
| Compliance | 30% | Badge cluster: top 3 most relevant signals |
| Data Residency | 15% | Text label + optional EU flag icon |
| Pricing | 15% | Input/output price per 1M tokens, monospace |
| Last Verified | 10% | Date, monospace, `--color-text-muted` |
| — | 5% | "→" link to detail |

**Row left-border:** 2px solid, compliance color tier. Same signal system as cards.

**Collapsed (mobile):** Stack into card format with the same left-border signal.

---

### 4. Filter Bar

The compliance filter is the primary interaction. Design it to be immediately legible without any explanation.

**Preset buttons (row above the table):**

```
[ Strict EU ] [ EU + SCCs ] [ No Training ] [ Custom ▼ ]
```

- Default state: outlined, `--color-border`, `--color-text-secondary`
- Active state: filled `--color-accent-subtle`, border `--color-accent`, text `--color-accent`
- These are toggle buttons — one can be active at a time, or none (show all)
- "Custom ▼" opens an inline panel below with individual boolean toggles

**Custom panel (expanded):**

```
┌──────────────────────────────────────────────────────┐
│  Data stays in EU     [●──] on                       │
│  Inference in EU      [●──] on                       │
│  DPA available        [──○] off                      │
│  No training          [──○] off                      │
│  SCCs in place        [──○] off                      │
└──────────────────────────────────────────────────────┘
```

Toggle switches: 32×18px, pill shape. Active = `--color-accent`. Inactive = `--color-border`.

**URL persistence:** Every filter state is reflected in URL params (`?profile=strict-eu` or `?euOnly=true&dpa=true`). Links are always shareable. This is a hard requirement — compliance teams share links with legal.

---

### 5. Provider Profile Page

Full-width layout within `max-w-[720px]` prose container for the detail section.

**Structure:**
```
[Provider logo 40px]  [Provider name — h1 serif]
[Provider type]       [Compliance tier badge]

─────────────────────────────────────────────────

COMPLIANCE OVERVIEW
[Full badge set]
[Plain-language summary — 2–4 sentences, editorial voice]

─────────────────────────────────────────────────

COMPLIANCE DETAILS
┌─────────────────────────┬──────────────────────┐
│ Field                   │ Value                │
├─────────────────────────┼──────────────────────┤
│ Data residency          │ EU (Frankfurt, Paris) │
│ Inference in EU         │ Yes                  │
│ DPA available           │ Yes → [Link]         │
│ Trains on customer data │ No                   │
│ Training opt-out        │ N/A                  │
│ SCCs in place           │ Yes                  │
│ EU AI Act status        │ Provider (GPAI)      │
│ Certifications          │ SOC 2 Type II, ISO   │
└─────────────────────────┴──────────────────────┘

─────────────────────────────────────────────────

MODELS AVAILABLE
[Filtered model table — same component as homepage]

─────────────────────────────────────────────────

SOURCES
[Bulleted list of source URLs with domain + date]

Last verified: 2026-03-15 · [Report a change →]
```

**Field table:** Left column `--color-text-secondary`, right column `--color-text-primary`. Boolean values rendered as ✓ / ✗ with their semantic color — no plain "Yes/No" text.

---

### 6. Navigation / Header

Minimal. The nav should not compete with the data.

**Structure:**
```
[InferCheck wordmark]              [Models] [Providers] [About]
```

- Wordmark: "InferCheck" in Instrument Serif, 18px, `--color-heading`
- Nav links: DM Sans 14px / 500, `--color-text-secondary`; active = `--color-text-primary` + underline
- No mega-menus, no dropdowns, no hamburger animation drama
- Sticky on scroll with a `backdrop-blur` + subtle border-bottom that appears on scroll
- Mobile: links collapse into a simple slide-in drawer from the right

---

### 7. Disclaimer Banner

Required on every page (per PLAN.md). Not a cookie banner. An editorial disclaimer.

**Placement:** Below the header, above the main content — or in the footer on interior pages.

**Style:** 
- Background: `--color-surface-alt`
- Border-left: 3px solid `--color-border`
- Font: DM Sans 13px, `--color-text-secondary`
- One line on desktop. Collapsible on mobile.
- Text: "This directory provides sourced information about AI providers' data practices. It is not legal advice. Always verify directly with the provider."

---

## Interaction Patterns

### Filter: Dim-not-remove

When a compliance filter is active, non-matching rows are **dimmed** (opacity: 0.35) rather than removed from the DOM. This communicates the full landscape while highlighting what passes the filter.

Why: It answers both "what passes?" and "what's excluded?" in a single view. Enterprise users reviewing options want to see what they're ruling out.

### Detail: Inline expand

On the homepage model table, clicking a row expands an inline detail panel (accordion-style) rather than navigating away. The expanded panel shows the compliance detail snapshot and a "→ Full profile" link.

Why: Maintains search/filter context. Reduces navigation friction for users comparing multiple options quickly.

### Search: Immediate, no submit

The model/provider search input filters results in real-time on keypress (client-side for cached data, debounced API call for DB queries). No search button. No enter required.

### Shareable state

Every filter combination, every search query, every expanded view maps to a URL state. `?q=claude&profile=strict-eu`. Users should be able to copy the URL from their browser and paste it into an email to legal/procurement.

---

## What NOT to Do (Anti-patterns)

- **No hero sections with taglines.** The homepage is a search interface, not a landing page. Users who arrive via search know what this is.
- **No gradient backgrounds.** The compliance color system needs a neutral canvas. Gradients corrupt the signal.
- **No loading skeletons for above-the-fold content.** Provider data loads at build time (SSG/ISR). The page should render fully on first paint.
- **No star ratings or "scores."** Compliance is not rated. It is factual. Scores create liability.
- **No marketing language in the UI copy.** "Powerful filtering" → just filter. "Comprehensive coverage" → just list what's covered. Every word earns its place.
- **No modals for compliance detail.** Modals break the URL. Use inline expand or navigate to a dedicated page.
- **No purple gradients, no Inter font, no Tailwind `rounded-2xl` on everything.** This site should not look like any other AI product.
- **No "Coming soon" placeholders in the MVP.** If a feature isn't built, don't show the ghost of it. Ship what works.

---

## SEO Design Requirements

These are design constraints, not afterthoughts:

- Every page title follows: `{Model or Provider Name} — InferCheck`
- `<h1>` is always visible in the viewport on load, contains the primary keyword
- Provider cards and model rows include the provider name as readable text (not just a logo) — for crawlers
- "Last verified" dates are rendered as `<time datetime="...">` elements
- JSON-LD structured data is injected per page type (Dataset on homepage, Organization on provider pages)
- Images (provider logos) have descriptive `alt` text: `"{Provider name} logo"`

---

## Voice & Tone

The editorial copy on this site (summaries, notes, about page) should sound like:

- A senior developer who works in enterprise IT and has read a lot of DPAs
- Direct. No hedging language where it's not needed.
- Plain English for compliance jargon the first time it appears (e.g. "Standard Contractual Clauses (SCCs)")
- Willing to say "this provider's DPA is weak" or "this claim is unverified" — the site's value is honesty, not diplomacy
- Never sounds like ChatGPT wrote it

**Avoid:**
- "Empowering teams to..." / "Unlock compliance..." / "Seamlessly..."
- Passive voice in compliance notes
- Marketing superlatives of any kind

---

## File & Component Naming Conventions

Align with the structure already defined in PLAN.md:

```
src/
  app/
    page.tsx                    # Homepage: model search
    model/[id]/page.tsx         # Model detail
    provider/[slug]/page.tsx    # Provider profile
  components/
    ComplianceBadge.tsx         # Single badge (props: type, size)
    ComplianceBadges.tsx        # Badge cluster for a provider
    FilterBar.tsx               # Filter presets + custom panel
    ModelTable.tsx              # Searchable/filterable model table
    ModelRow.tsx                # Single row + inline expand
    ProviderCard.tsx            # Summary card with left-border signal
    ProviderDetailTable.tsx     # Full compliance detail table
    DisclaimerBanner.tsx        # Sitewide disclaimer
    Nav.tsx                     # Header navigation
```

---

## Color Tokens in Tailwind

Add to `tailwind.config.ts`:

```ts
theme: {
  extend: {
    colors: {
      bg: '#f5f4ef',
      surface: '#ffffff',
      'surface-alt': '#eeeee8',
      border: '#d6d4cc',
      heading: '#0f1520',
      body: '#1a1f2e',
      secondary: '#5a6070',
      muted: '#9aa0ad',
      link: '#1d4ed8',
      accent: '#1d4ed8',
      'accent-subtle': '#eff6ff',
      compliant: '#16a34a',
      'compliant-bg': '#f0fdf4',
      partial: '#d97706',
      'partial-bg': '#fffbeb',
      noncompliant: '#dc2626',
      'noncompliant-bg': '#fef2f2',
      unverified: '#9aa0ad',
      'unverified-bg': '#f8f8f7',
    },
    fontFamily: {
      display: ['Instrument Serif', 'Georgia', 'serif'],
      body: ['DM Sans', 'system-ui', 'sans-serif'],
      mono: ['IBM Plex Mono', 'Courier New', 'monospace'],
    },
  },
}
```

---

## Starting Point for a New Session

When opening a new AI session to build Phase 2, provide:
1. This file (`docs/DESIGN.md`)
2. `docs/PLAN.md` (architecture and Phase 2 task list)
3. `data/schema.ts` (provider JSON shape)
4. `src/db/schema.ts` (Drizzle model table schema)
5. One example provider JSON from `data/providers/` (e.g. `openai.json`)

Say: *"Build the Phase 2 MVP frontend. Follow DESIGN.md for all visual decisions. Follow PLAN.md for the feature scope. Start with the homepage."*
