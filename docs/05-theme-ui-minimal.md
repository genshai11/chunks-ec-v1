# 05 - Theme + UI/UX Simplification

## Theme strategy
- Add `ThemeProvider` globally
- Define real light tokens in `:root`
- Move current dark palette under `.dark`
- Add user toggle (light/dark/system)

## Minimal UI principles
- reduce decorative gradients and glow usage
- simplify card variants to 1-2 surface levels
- keep one primary CTA per section
- reduce animation intensity and duration

## Rollout
1. token cleanup in `index.css`
2. theme provider wiring in app root
3. sidebar/header theme switch
4. per-page visual simplification pass
