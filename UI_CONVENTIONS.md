# UI Conventions - Discipline Dungeon

## Design Philosophy
The UI is **calm, authoritative, austere, and consistent**. This is a tool for discipline, not entertainment.

## Hard Rules

### 1. Semantic Colors Only (No Decorative Palette)
- **Green (`positive`)**: Earned success, completed actions, payouts
- **Red (`negative`)**: Violations, penalties, destructive actions
- **Amber (`warning`)**: At-risk status, threshold warnings
- **Everything else**: Neutral (bg, surface, text, muted, border)

**Never** use colors for decoration. Every color carries meaning.

### 2. No Emoji or Decorative Icons
- Exception: Welcome screen retains existing branding emoji
- All other screens use text labels only
- Numbers dominate labels in stat displays

### 3. Layout Pattern: State → Action → Consequence
Every screen follows this hierarchy:
1. **State**: Immutable current status (XP, Level, HP, Streak)
2. **Action**: Today's obligations (what must be done)
3. **Consequence**: Ledger and outcomes (violations heavier than rewards)

### 4. Component Usage
Use only these 4 core UI components:

#### `<Button>`
- Variants: `primary`, `secondary`, `ghost`, `destructive`
- Sizes: `sm`, `md`, `lg`
- Destructive must be visually heavy and unmistakable

#### `<Surface>`
- Consistent card/section container
- Elevations: `1` (default) or `2` (elevated)
- Use `title`, `subtitle`, `rightSlot` props for headers

#### `<ProgressBar>`
- Variants: `xp`, `hp`, `boss`
- Auto-applies severity based on variant + percentage
- Always use `tabular-nums` for stat numbers

#### `<ViolationBanner>`
- Severities: `warning`, `negative`
- For explicit failures + penalties
- Never use for positive outcomes

### 5. Typography
- All stat numbers: `tabular-nums` utility class
- Text hierarchy: `text-text` (primary), `text-muted` (secondary)
- No italic except for specific branded copy (affirmations)

### 6. No "Softening" Failures
- Violations and penalties must remain **prominent**
- ViolationBanner is **always** heavier visually than success states
- Red/negative tokens are **bolder** than green/positive

## File Structure
```
components/ui/
  ├── Button.tsx
  ├── Surface.tsx
  ├── ProgressBar.tsx
  ├── ViolationBanner.tsx
  ├── cn.ts (class name utility)
  └── index.ts (exports)

app/globals.css
  ├── Semantic CSS variables (--bg, --surface-1, --positive, etc.)
  └── Tailwind @theme mapping
```

## Key Screens

### Dashboard (`/mobile`)
- State: 4-grid stat blocks (XP, Level, HP, Streak)
- Obligations: Primary action (Start Phone-Free Block) + sleep check + stakes
- Ledger: Today's XP breakdown + violations (if any)

### Phone-Free Block (`/phone/block`)
- Setup: Clean duration picker + Pomodoro config
- Running: Timer + progress bar
- Complete: XP earned (or boss damage if applicable)

### Boss Detail (`/boss/[id]`)
- Present as **work contract**, not game enemy
- Boss HP as obligation metric
- Damage sources = ledger of completed blocks
- Contract terms listed plainly

### Stakes (`/stakes/current`)
- Present as **commitment contract**
- Failure state uses ViolationBanner (negative severity)
- Compliance status with progress bars
- Failure cost shown prominently

## Linting
- No unescaped entities in JSX (use `&apos;`, `&quot;`)
- All React Hooks must follow exhaustive-deps rules
- Use `useCallback` for functions in dependency arrays
- No `Date.now()` in `useState` initial values (use `0` or `useEffect`)

## What NOT to Do
- ❌ Add new XP/streak/HP authorities (XPEvent is single source of truth)
- ❌ Schema changes (Prisma) without explicit plan approval
- ❌ Decorative gradients (only bg/surface tokens)
- ❌ Celebration animations (defeats are plain, payouts are calm)
- ❌ "Nice job!" or "Great work!" copy (outcomes are factual)
- ❌ Emoji outside welcome screen
- ❌ Ad hoc `className` strings (use UI components)
