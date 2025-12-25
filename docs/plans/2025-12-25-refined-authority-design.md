# Refined Authority Design System

**Date**: 2025-12-25
**Status**: Design Approved, Ready for Implementation
**Design Direction**: Refined Authority - Professional legal aesthetic with modern execution

## Overview

This design system establishes a distinctive visual identity for MatterFlow that differentiates it from generic SaaS applications while maintaining the professionalism and trustworthiness expected in legal practice management software.

**Key Goals:**
- Replace generic Geist fonts with warm, authoritative typography
- Create custom card components with personality and visual hierarchy
- Establish a refined color palette rooted in legal tradition (navy + gold)
- Add visual interest through decorative elements and enhanced shadows

## Typography System

### Font Stack

**Display/Headings: Lora (Google Fonts)**
- Serif font that conveys warmth and authority
- Used for: Page titles, section headers, card titles
- Weights: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)

**Body/UI: Inter (Google Fonts)**
- Clean, highly readable sans-serif
- Used for: Body text, form fields, buttons, navigation
- Weights: 400 (Regular), 500 (Medium), 600 (Semibold)

**Monospace: JetBrains Mono (Google Fonts)**
- Technical precision for code and IDs
- Replaces Geist Mono
- Weight: 400 (Regular)

### Typography Scale

| Use Case | Size | Font | Weight | Example |
|----------|------|------|--------|---------|
| Hero/Page Title | `text-4xl` (36px) | Lora | Bold (700) | "Control Center" |
| Section Headers | `text-2xl` (24px) | Lora | Semibold (600) | "Next actions by responsible party" |
| Card Titles | `text-lg` (18px) | Lora | Medium (500) | Matter title |
| Body Large | `text-base` (16px) | Inter | Regular (400) | Descriptions |
| Body Default | `text-sm` (14px) | Inter | Regular (400) | UI text |
| Labels/Small | `text-xs` (12px) | Inter | Medium (500) | Uppercase labels |

### Implementation Notes

- Load fonts via Next.js Google Fonts API for automatic optimization
- Define as CSS variables: `--font-lora`, `--font-inter`, `--font-mono`
- Apply Lora to all `<h1>`, `<h2>`, `<h3>` elements by default
- Maintain uppercase labels with `tracking-wide` (0.05em) for legal aesthetic

## Color Palette

### Core Brand Colors

**Primary (Deep Navy)**
```css
--primary: #1e3a5f;
--primary-foreground: #ffffff;
```
- Replaces current slate-900 (#0f172a)
- Used for: Headers, primary buttons, active navigation states
- Conveys: Trust, stability, legal authority

**Accent (Legal Gold)**
```css
--accent: #d4af37;
--accent-foreground: #1e3a5f;
```
- Replaces current slate-200 (#e2e8f0)
- Used for: Priority indicators, border accents, hover highlights, premium badges
- Conveys: Quality, achievement, importance

### Surface Colors

**Backgrounds**
```css
--background: #fafaf9;  /* Warm white */
--surface: #ffffff;     /* Card backgrounds */
--border: #e7e5e4;      /* Warm gray borders */
```

**Muted**
```css
--muted: #f5f5f4;       /* Subtle backgrounds */
--muted-foreground: #78716c;  /* Secondary text */
```

### Semantic Colors

**Success (Keep Current)**
```css
--success: #0ea5e9;  /* Sky blue */
```

**Warning (Keep Current)**
```css
--warning: #f59e0b;  /* Amber */
```

**Danger (Refined)**
```css
--danger: #dc2626;  /* Slightly darker red for better contrast */
```

### Responsible Party Badge Colors

**Lawyer**
```css
Background: #eff6ff (blue-50)
Foreground: #3b82f6 (blue-500)
```

**Staff**
```css
Background: #f5f3ff (violet-50)
Foreground: #8b5cf6 (violet-500)
```

**Client**
```css
Background: #ecfdf5 (emerald-50)
Foreground: #10b981 (emerald-500)
```

### Shadow System

Custom shadows with warm tint using primary navy:

```css
--shadow-sm: 0 1px 2px 0 rgba(30, 58, 95, 0.05);
--shadow-md: 0 4px 6px -1px rgba(30, 58, 95, 0.08);
--shadow-lg: 0 10px 15px -3px rgba(30, 58, 95, 0.12);
```

## Card Component Design

### Component Architecture

Create four specialized card variants in `src/components/cards/`:

1. **MatterCard** - Matter display with next actions
2. **StatCard** - Dashboard metrics
3. **PriorityCard** - High-importance items
4. **ContentCard** - General purpose content

### Visual Personality Elements

#### Decorative Corner Accent (All Cards)

Every card includes a subtle decorative element in the top-right corner:

```tsx
// Pseudo-element approach
<div className="relative overflow-hidden ...">
  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full" />
  {/* Card content */}
</div>
```

**Purpose**: Adds visual interest without overwhelming content, creates brand consistency

#### Shadow & Elevation Strategy

- **Standard cards**: `shadow-sm` + subtle border
- **Interactive cards**: `shadow-md` on hover + lift animation (`-translate-y-1`)
- **Priority cards**: `shadow-lg` + enhanced corner accent

### MatterCard Specifications

**Visual States:**

**1. Standard State**
- Corner accent at 5% opacity
- `shadow-sm` elevation
- Border: `border-border` (warm gray)
- Hover: Lift + enhanced shadow

**2. Overdue State**
- Red diagonal stripe in top-right corner (replaces background tint)
- `shadow-md` elevation by default
- Red ring: `ring-2 ring-red-400`
- Warning icon integrated into due date badge

**3. Hover Interaction**
```tsx
className="group transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
```

**Layout Structure:**
```
┌─────────────────────────────────────┐
│ [Decorative Corner]  [Due Date]    │
│                                     │
│ Matter Title (Lora text-lg)        │
│ Matter Type • Stage • Billing      │
│                                     │
│ ┌─ Next Action Section ─────────┐ │
│ │ NEXT ACTION    │  RESPONSIBLE  │ │
│ │ Action text    │  [Badge]      │ │
│ └────────────────────────────────┘ │
│                                     │
│ Updated Dec 25                      │
└─────────────────────────────────────┘
```

**Next Action Section:**
- Background: Subtle warm gray (`bg-stone-50`)
- Displays action text + responsible party badge
- Responsible party badge positioned in top-right of section
- Uses accent color coordination (gold for urgent, party color for standard)

### StatCard Specifications

**Purpose**: Dashboard metrics with visual emphasis on numbers

**Features:**
- Minimalist corner accent (3% opacity)
- Icon integrated into corner decoration area
- Number display uses Lora font for distinctiveness
- Subtle gradient background from top-left (`from-primary/2`)

**Layout Structure:**
```
┌─────────────────────────────────┐
│                    [Icon Corner]│
│ ACTIVE MATTERS                  │
│ 24 (Lora text-3xl)             │
│                                 │
│ 8 waiting on client            │
└─────────────────────────────────┘
```

### PriorityCard Specifications

**Purpose**: High-importance items requiring immediate attention

**Visual Distinctions:**
- Left border accent (4px thick) in gold (`border-l-4 border-accent`)
- Enhanced corner accent (10% opacity vs 5%)
- `shadow-md` by default
- Hover: Scale inner content slightly (`group-hover:scale-[1.02]`)

**Use Cases:**
- Overdue invoices
- Urgent tasks
- Conflict check items
- Critical notifications

### ContentCard Specifications

**Purpose**: General purpose replacement for current shadcn Card

**Features:**
- Standard corner accent (5% opacity)
- Clean, minimal approach
- `shadow-sm` elevation
- Rounded corners: `rounded-xl` (12px)

**No major changes from current Card** - just enhanced with corner accent and refined shadows for consistency.

## Animation & Motion

### Card Animations

**Page Load (Staggered Fade-in):**
```tsx
{items.map((item, index) => (
  <Card
    key={item.id}
    className="animate-fade-in"
    style={{ animationDelay: `${index * 50}ms` }}
  />
))}
```

**Hover States:**
- Lift: `hover:-translate-y-1`
- Shadow enhancement: `hover:shadow-xl`
- Transition: `transition-all duration-300`

**Interactive States:**
- Active scale: `active:scale-[0.98]`
- Focus ring: `focus-visible:ring-2 focus-visible:ring-accent`

### Timing & Easing

```css
/* Tailwind config additions */
transitionTimingFunction: {
  'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
}
```

## Implementation Checklist

### Phase 1: Typography System
- [ ] Install Lora, Inter, JetBrains Mono via Next.js Google Fonts
- [ ] Update `src/app/layout.tsx` to define font variables
- [ ] Update `tailwind.config.ts` to extend font families
- [ ] Apply Lora to heading elements globally in `globals.css`
- [ ] Update existing components to use new font variables

### Phase 2: Color Palette
- [ ] Update `tailwind.config.ts` with new color definitions
- [ ] Update CSS variables in `globals.css`
- [ ] Define custom shadow utilities
- [ ] Test color contrast ratios for accessibility (WCAG AA minimum)

### Phase 3: Card Components
- [ ] Create `/src/components/cards/` directory
- [ ] Build `MatterCard.tsx` with decorative corner accent
- [ ] Build `StatCard.tsx` with icon integration
- [ ] Build `PriorityCard.tsx` with left border accent
- [ ] Build `ContentCard.tsx` as enhanced base card
- [ ] Add TypeScript types for card props

### Phase 4: Integration
- [ ] Replace cards in `src/app/page.tsx` (dashboard)
- [ ] Replace cards in `src/app/matters/page.tsx`
- [ ] Replace cards in `src/app/tasks/page.tsx`
- [ ] Test responsive behavior on mobile/tablet
- [ ] Validate hover states and animations

### Phase 5: Refinement
- [ ] Visual QA pass - does it feel "Refined Authority"?
- [ ] Adjust opacity, spacing, shadows based on user feedback
- [ ] Performance check (font loading, animation smoothness)
- [ ] Accessibility audit (focus states, color contrast)

## Success Criteria

**Visual Identity:**
- ✅ Application no longer looks like generic SaaS
- ✅ Typography conveys warmth and professionalism
- ✅ Navy + gold palette feels distinctively legal

**User Experience:**
- ✅ Card hierarchy is immediately clear
- ✅ Overdue states are visually urgent but not alarming
- ✅ Animations feel purposeful, not gratuitous
- ✅ Text remains highly readable at all sizes

**Technical:**
- ✅ Fonts load efficiently (subsetting, self-hosting via Next.js)
- ✅ Animations perform smoothly (60fps)
- ✅ Components are reusable and properly typed
- ✅ Color contrast meets WCAG AA standards

## Design Decisions & Trade-offs

**Why Lora instead of Crimson Pro?**
- Warmer, more approachable while still authoritative
- Slightly better readability at smaller sizes
- User preference for warmth over formality

**Why decorative corner accents?**
- Adds personality without overwhelming legal content
- Creates visual consistency across card types
- Subtle enough to not distract from information hierarchy

**Why navy + gold instead of black + blue?**
- Navy conveys trust better than pure black (less harsh)
- Gold accent is distinctive in legal context
- Warm palette aligns with Lora's warmth

**Why four card variants instead of one?**
- Content hierarchy requires visual differentiation
- Different use cases have different information density
- Allows targeted enhancement without bloating base component

## Future Enhancements (Post-MVP)

- Dark mode refinement with gold accent treatment
- Card transition animations between states (e.g., matter stage changes)
- Micro-interactions on badge hover (tooltip expansion)
- Data visualization components using same design language
- Illustration system for empty states

---

**Next Steps**: Ready to implement? Use `superpowers:writing-plans` to create detailed implementation plan, or proceed directly to code if design is validated.
