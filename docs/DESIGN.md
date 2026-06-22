# HashEnv Design System

Derived from the workspace reference UI. Adapted for HashEnv's real features: organizations, projects, environment files, members, API tokens, and audit — no placeholder Kanban or discussion features.

## Scene

Developers manage encrypted environment files in dim offices; the interface is the brightest surface on the desk. Dark mode is default and intentional — not decorative.

**Color strategy:** Restrained — cool-tinted neutrals with a single blue accent for primary actions and active navigation.

---

## Color

| Token | Hex | Usage |
|-------|-----|-------|
| `--background` | `#121212` | App canvas |
| `--surface` | `#1A1A1A` | Sidebars, panels |
| `--surface-elevated` | `#1E1E1E` | Cards, dropdowns, inputs |
| `--surface-hover` | `#252525` | Hover states, task cards |
| `--border` | `#2E2E32` | Dividers, card borders |
| `--border-subtle` | `rgba(255,255,255,0.06)` | Hairline separators |
| `--foreground` | `#FFFFFF` | Primary text |
| `--text-secondary` | `#C8C8CC` | Body, nav labels |
| `--text-muted` | `#8A8A8E` | Metadata, placeholders |
| `--accent` | `#4C6FFF` | Primary buttons, active nav, links |
| `--accent-hover` | `#6380FF` | Button hover |
| `--accent-muted` | `rgba(76,111,255,0.12)` | Active nav background |
| `--success` | `#34C759` | Success states |
| `--warning` | `#FF9F0A` | Warnings |
| `--error` | `#FF453A` | Errors, destructive |
| `--notification` | `#FF3B30` | Badge dots |

### Tag palette (environment / category pills)

| Role | Background | Text |
|------|------------|------|
| dev | `rgba(76,111,255,0.15)` | `#6B8AFF` |
| staging | `rgba(255,159,10,0.15)` | `#FFB340` |
| prod | `rgba(52,199,89,0.15)` | `#4CD964` |
| neutral | `rgba(138,138,142,0.15)` | `#A0A0A5` |

---

## Typography

**Family:** Geist Sans (UI), Geist Mono (code/values).

| Role | Size | Weight | Line height |
|------|------|--------|-------------|
| Page title | 1.5rem (24px) | 600 | 1.25 |
| Section title | 1.125rem (18px) | 600 | 1.3 |
| Column / tab label | 0.875rem (14px) | 500 | 1.4 |
| Body | 0.875rem (14px) | 400 | 1.5 |
| Caption / meta | 0.75rem (12px) | 400 | 1.4 |
| Sidebar section | 0.6875rem (11px) | 600 | 1.2, uppercase, tracking 0.04em |

- One sans family for all UI (product register).
- Fixed rem scale; no fluid heading clamps in app surfaces.
- `text-wrap: balance` on h1–h2; `text-wrap: pretty` on descriptions.

---

## Layout

### Shell structure

```
┌────┬──────────────┬─────────────────────────────────────┐
│Icon│  Nav pane    │  Top bar (workspace + user menu)    │
│rail│  (projects,  ├─────────────────────────────────────┤
│    │   org nav)   │  Page header / project tabs         │
│    │              ├─────────────────────────────────────┤
│    │              │  Main content                       │
└────┴──────────────┴─────────────────────────────────────┘
```

| Region | Width |
|--------|-------|
| Icon rail | 56px fixed |
| Nav pane | 240px (hidden when collapsed) |
| Content | fluid, max-width 1200px centered |

### Spacing scale

4, 8, 12, 16, 20, 24, 32, 48px. Card padding: 16–20px. Section gaps: 24–32px.

### Z-index

| Layer | Value |
|-------|-------|
| dropdown | 40 |
| sticky header | 30 |
| sidebar | 50 |
| modal backdrop | 60 |
| modal | 70 |
| toast | 80 |

---

## Components

### Icon rail

- 56×56px hit targets, 1.75px stroke icons.
- Active: `--accent` icon + `--accent-muted` background.
- Tooltips on hover when nav pane collapsed.

### Nav pane

- Search input at top (filters project list).
- Sections: **WORKSPACE**, **PROJECTS**, **ORGANIZATION**, **ACCOUNT**.
- Active project: left accent bar (2px) + subtle background — not side-stripe on cards.

### Top bar

- Height 56px, sticky, `--surface` background, bottom border.
- Left: "Workspace" label + current org name.
- Right: panic control (when applicable), user avatar + name, chevron dropdown.

### User menu dropdown

- 280px wide, `--surface-elevated`, 12px radius, border only (no wide shadow).
- Header: avatar, name, email.
- Items: Account settings, Activity (project context), Help — mapped to real routes.
- Footer: Logout separated by divider.

### Buttons

| Variant | Style |
|---------|-------|
| Primary | `--accent` fill, white text, 10px radius (not full pill) |
| Secondary | `--surface-hover` fill, border |
| Ghost | transparent, hover surface |
| Danger | `--error` fill |

Sizes: sm 32px, md 36px, lg 40px height.

### Cards

- `--surface-elevated` background, `--border` 1px border, 12px radius.
- No paired border + wide box-shadow.
- Hover: border lightens toward accent at 30% opacity.

### Tabs (project navigation)

- Horizontal row under project header.
- Active tab: white text + 2px bottom underline (white).
- Inactive: `--text-muted`, hover `--text-secondary`.
- Optional count badge on tabs when data exists.

### Tags / pills

- 6px vertical, 10px horizontal padding, 6px radius.
- Tinted background + saturated text from tag palette.

### Avatars

- 28px default, 32px in header, circular.
- Initials on `--accent-muted` background when no image.
- Stacked overlap −8px for member groups.

### Forms

- Inputs: `--surface-hover` bg, `--border` border, 10px radius, 40px height.
- Focus: `--accent` ring 2px, no offset glow.

### Empty states

- Centered in card shell, icon + title + one-line description + primary CTA.

---

## Motion

- 180ms ease-out for hovers, tab indicators, dropdown open.
- Sidebar collapse: 250ms width transition.
- `@media (prefers-reduced-motion: reduce)`: instant or opacity-only.

---

## HashEnv feature mapping

| Reference | HashEnv |
|-----------|---------|
| Workspace | Organization / dashboard |
| Favourite / All projects | Project list in nav pane |
| Project tabs (Overview, Task, …) | Env files, Environments, Members, API tokens, Activity, Settings |
| Add Member | Invite / manage members (team orgs) |
| User dropdown | Account settings, logout |
| Kanban columns | Not used — project cards on dashboard |
| Discussion / comments | Not used |
| Dark mode toggle | Dark-only for now (reference aesthetic) |

---

## Bans

- No gradient text, glassmorphism, or hero-metric stat grids as decoration.
- No card border + 16px+ blur shadow pairing.
- Card radius max 12–16px.
- No numbered section eyebrows on every block.
