## Production deployment checklist

### Pre‑flight
- [ ] Backend and frontend tests pass locally (`npm run test` in both).
- [ ] `.env` files are created locally, but never committed.
- [ ] `REMOVE_BG_API_KEY` and Cloudinary keys are valid.
- [ ] Confirm `CLIENT_ORIGIN` and `VITE_API_BASE_URL` match the final domains.

### Backend (Render / Railway / Fly.io)
- [ ] Build command works: `npm install && npm run build`.
- [ ] Start command works: `npm start`.
- [ ] `DATABASE_PATH` is set to a persistent volume location.
- [ ] Health check responds at `/api/health`.
- [ ] CORS is locked to the frontend domain.
- [ ] Request logging is enabled (morgan).

### Frontend (Vercel / Netlify)
- [ ] Build command works: `npm install && npm run build`.
- [ ] `VITE_API_BASE_URL` points to the backend domain.
- [ ] `npm run preview` renders correctly.

### Post‑deploy verification
- [ ] Upload an image and confirm successful processing.
- [ ] Copy URL opens the hosted processed image.
- [ ] Delete removes both hosted images.
- [ ] Gallery actions (share, download, delete) work end-to-end.
- [ ] Error state appears for invalid file types.
- [ ] Latency is acceptable on a real network.

### Rollback plan
- [ ] Keep the last stable deployment active.
- [ ] If a deploy fails, revert to the last known working build immediately.
