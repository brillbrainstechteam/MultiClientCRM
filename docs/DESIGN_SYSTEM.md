# TalkTrack UI System v1.0 — reference

The canonical design language for **every** TalkTrack module (from the design-system board).
Use these tokens/patterns for all new UI and when re-aligning existing screens.

## Colour palette
| Token | Hex | Use |
|---|---|---|
| Primary | `#10B981` | primary buttons, active states, brand green |
| Primary Light | `#ECFDF5` | tints, active-chip backgrounds, hovers |
| Secondary | `#3B82F6` | secondary/info accents, "Pending" chips |
| Accent | `#F59E0B` | warnings, "In Progress", highlights |
| Neutral 900 | `#0F172A` | headings / primary text |
| Neutral 500 | `#64748B` | secondary text / muted |
| Neutral 200 | `#E2E8F0` | borders / dividers |
| Neutral 50 | `#F8FAFC` | page / card backgrounds |

> Note: this replaces the earlier dashboard palette's **navy + gold** with **emerald + slate + blue/amber accents**. Reconcile when retheming.

## Typography — Inter ("Clean. Friendly. Professional.")
| Style | Size / weight |
|---|---|
| H1 | 32 / Bold |
| H2 | 24 / Semibold |
| H3 | 20 / Semibold |
| H4 | 16 / Semibold |
| Body | 14 / Regular |
| Small | 12 / Regular |
| Caption | 12 / Medium |

## Buttons
- **Primary** — solid `#10B981`, white text. Hover = darker green. Disabled = muted.
- **Secondary** — `#ECFDF5` fill, green text.
- **Tertiary** — white, neutral-200 border, neutral-900 text.
- **Destructive** — white/outline, red text.

## Status chips (pill, tinted bg + coloured text)
Active (green) · Pending (blue) · In Progress (amber) · Failed (red) · Draft (neutral) · Completed (green).

## Forms
Text input, Textarea, Dropdown (chevron), Date picker (calendar icon), Search input (leading magnifier), Toggle switch (green when on). Inputs: neutral-200 border, radius ~8px, focus = primary border.

## Components on the board
Top bar (search + workspace/role + help/bell/avatar) · Search bar (⌘K) · Stepper (done=green check, current=green ring, upcoming=neutral number) · Tables (checkbox rows, avatar+name, status chip, row actions ⋮) · Stat cards (icon, big number, ↑% vs last month) · Empty state (illustration + title + copy + primary CTA + text link) · Settings form · Modal/Dialog (icon, title, body, Cancel + primary) · Module cards (Campaign, Inbox list, Contacts table, Billing).

## How to apply
- Prefer CSS variables mapping to these tokens; keep light + dark parity.
- New components: build to this spec directly.
- Existing screens: re-align opportunistically or in a dedicated retheme pass (whole-app palette shift is a large, tracked task — confirm scope before a global swap).
