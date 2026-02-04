## Live demo walkthrough

### 1) Open the app
- Show the single‑screen layout and top navigation.
- Call out the process rail and the two primary panels.

### 2) Upload a sample image (png avif jpg etc)
- Drag a sample into the dropzone.
- Point out the immediate preview and enabled “Process image” button.
- Toggle “Optimized” vs “Original” to show quality tradeoffs.

### 3) Processing feedback
- Click “Process image”.
- Call out the step messages and progress bar.
- Note that this mirrors the backend pipeline.

### 4) Result + sharing
- Show the processed image with a transparent background.
- Click “Copy URL” and paste into a new tab.
- Download the image for a quick check.

### 5) Cleanup
- Click “Delete”.
- Confirm the UI returns to the initial state.

### 6) Gallery and history (optional)
- Scroll to “All photos” and show recent successful transformations.
- Highlight that the gallery is server‑backed and ready for sharing.

### 7) Quick technical note (optional)
- Mention it’s TypeScript + remove.bg + Sharp + Cloudinary.
- Point out the clean API endpoints in `backend/src/index.ts`.


