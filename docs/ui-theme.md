# Discipline Dungeon UI Theme

## Theme Tokens

Tokens live in `app/globals.css` and are mapped into Tailwind via `@theme inline`.

- `--dd-bg`, `--dd-surface`, `--dd-surface-2`, `--dd-surface-3`
- `--dd-border`, `--dd-border-gold`
- `--dd-text`, `--dd-muted`
- `--dd-glow-blue`, `--dd-glow-red`

Tailwind utilities generated from these tokens:

- `bg-dd-bg`, `bg-dd-surface`, `bg-dd-surface-2`, `bg-dd-surface-3`
- `border-dd-border`, `border-dd-border-gold`
- `text-dd-text`, `text-dd-muted`
- `ring-dd-glow-blue`, `ring-dd-glow-red`

## Reusable Utilities

Defined in `app/globals.css`:

- `glass-panel`: Fantasy UI surface with ornate border, subtle glow.
- `scroll-card`: Parchment-like card surface with ornate border.
- `fantasy-frame`: Gold frame + depth shadows.
- `glow-blue`, `glow-red`: Consistent glow accents.
- `dd-input`: Standard input styling (background, border, focus).

## Textures and Glows

- Background texture and noise are defined on `body` in `app/globals.css`.
- Adjust the gradient layers and `body::before` noise to tune the stone/parchment feel.
- Glow intensity lives in `glow-blue` / `glow-red` and can be dialed up/down there.

## Reference Asset

`public/theme/reference/high-fantasy-ui.png`
