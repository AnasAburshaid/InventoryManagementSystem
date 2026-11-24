# Dark Mode Design Skill — Enterprise SaaS

## Objective
Design polished, modern dark-mode interfaces for the Inventory & Warehouse Management System.

The interface should feel like a premium SaaS product inspired by Linear and Vercel — not a generic admin template.

## 1. Color System

Use these design tokens consistently:

### Backgrounds
- App background: `#0B1120`
- Sidebar: `#111827`
- Main content surfaces: `#111827`
- Cards and elevated panels: `#1E293B`
- Hover and selected surfaces: `#273449`

### Borders
- Default border: `#334155`
- Subtle divider: `#273449`

### Typography
- Primary text: `#F1F5F9`
- Secondary text: `#CBD5E1`
- Muted text: `#94A3B8`
- Disabled text: `#64748B`

### Accent
- Primary: `#3B82F6`
- Primary hover: `#2563EB`
- AI accent: `#A78BFA`

### Status Colors
- Success: `#22C55E`
- Warning: `#F59E0B`
- Error: `#EF4444`
- Information: `#38BDF8`

Do not introduce additional accent colors without a design reason.

## 2. Visual Design Principles

- Never use pure black as the main application background.
- Avoid excessive gradients, glowing effects, neon colors, and glassmorphism.
- Use subtle borders instead of heavy shadows.
- Maintain clear visual hierarchy.
- Keep spacing consistent across pages.
- Use restrained rounded corners (8–12px).
- Avoid unnecessary decoration and oversized cards.
- Use consistent icon sizes and stroke weights.
- Do not make every element visually prominent.

## 3. Layout

- Maintain a consistent sidebar and top navigation.
- Keep page titles, descriptions, and primary actions aligned.
- Use consistent content widths and spacing.
- Dashboard cards should have equal heights where appropriate.
- Tables should be compact, readable, and professionally spaced.
- Forms should have consistent field heights, labels, and focus states.
- Modals and dropdowns must have clear separation from their backgrounds.

## 4. Inventory-Specific UI

The application is an inventory management system, so prioritize information clarity.

- Quantities and financial values must be easy to scan.
- Tables must support readable headers, row spacing, and hover states.
- Status badges should use semantic colors consistently.
- Low-stock and out-of-stock states must be immediately recognizable.
- Destructive actions must be visually distinct.
- Filters and search controls must not dominate the page.
- Charts must remain readable against dark surfaces.

## 5. Interaction States

Every interactive component must have:
- Default state
- Hover state
- Focus state
- Active or selected state
- Disabled state
- Loading state where relevant

Ensure keyboard focus is clearly visible.

## 6. Accessibility

- Maintain WCAG AA contrast wherever practical.
- Never communicate status through color alone; include labels or icons.
- Avoid tiny text, especially in tables and secondary information.
- Ensure inputs, buttons, and icons remain understandable.
- Test readability at different screen sizes.

## 7. Implementation Rules

- Inspect the existing frontend architecture and styling system before making changes.
- Reuse existing components and design tokens where possible.
- Establish centralized theme variables instead of scattering hex values throughout components.
- Ensure the dark theme is consistent across every page, modal, dropdown, table, chart, and AI assistant component.
- Preserve existing functionality and responsive behavior.
- Do not redesign unrelated functionality unnecessarily.

## 8. Quality Review

Before considering the work complete:

1. Review every major page in dark mode.
2. Check consistency between sidebar, header, cards, tables, forms, and modals.
3. Look for low-contrast text and visually noisy sections.
4. Check empty, loading, error, and success states.
5. Test desktop and mobile layouts.
6. Compare the result against the intended Linear/Vercel-inspired visual direction.

The final result must feel like one coherent, professionally designed product — not a collection of independently styled pages.