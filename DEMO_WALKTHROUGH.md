## Live demo walkthrough

### 1) Open the app
- Show the single‑screen layout and top navigation.
- Call out the process rail and the two primary panels.

### 2) Upload a sample image
- Click “Try sample image” to load the built‑in demo asset, or drag a file into the dropzone.
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
- Call out the inline timing badges for remove.bg, flip, and upload.

### 5) Cleanup
- Click “Delete”.
- Confirm the UI returns to the initial state.

### 6) Gallery and history (optional)
- Scroll to “All photos” and show recent successful transformations.
- Use the “Share” and “Download” actions inside the table.
- Delete an older row to show cleanup from the gallery.
- Highlight that the gallery is server‑backed and ready for sharing.

### 7) Quick technical note (optional)
- Mention it’s TypeScript + remove.bg + Sharp + Cloudinary.
- Point out the clean API endpoints in `backend/src/index.ts`.


