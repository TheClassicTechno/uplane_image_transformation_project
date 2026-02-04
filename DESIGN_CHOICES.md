## Design choices

### UX flow
- Single focused screen keeps the flow obvious and low friction.
- A persistent process rail shows users where they are and what happens next.
- Clear status text prevents guessing during processing and deletion.
- The gallery section is separated from the upload flow to avoid clutter.

### Visual system
- Blue‑purple gradients create a modern, calm tone with high contrast.
- Glassy cards and subtle depth create a premium, lightweight feel.
- Bold typography and pill accents improve scanning on first glance.

### Interaction choices
- Drag‑and‑drop plus click upload covers common behavior patterns.
- Copy URL and Download actions are always visible after success.
- Delete removes both hosted versions with explicit confirmation state.
- A mode toggle lets users choose optimized speed or full‑quality output.

### Accessibility and clarity
- Buttons and inputs remain visible and labeled at all times.
- Status text uses `aria-live` so screen readers get updates.
- Neutral error blocks prevent user confusion without visual noise.

### Engineering alignment
- The UI mirrors the backend pipeline order so the mental model matches.
- The result card reflects the actual hosted asset URL, not a mock.
- Async processing and caching keep the UI responsive during heavy work.
