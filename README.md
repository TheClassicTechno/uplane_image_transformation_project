# Uplane Image Transformation
by Juli Huang

# demo site:
[uplane-image-transformation-project.vercel.app ](https://uplane-image-transformation.vercel.app/) 

# demo video:
https://drive.google.com/file/d/12uz57rt6mMJdHZnIpwd7OOsikDahpQqQ/view?usp=drivesdk 

## Overview
A full stack image transformation web app that removes backgrounds, flips horizontally, and returns shareable URLs. The experience is designed to feel calm and obvious: upload once, watch clear progress, and get a ready to use result.

## Motivation

I started this site because I used remove.bg constantly in high school as an avid photographer and editor. My parents never had the chance to travel outside their hometowns in small towns in China, so they wanted to give me and my brother a more worldly experience. We took road trips often, from the islands of Hawaii to the beaches of Florida to the mountains of Virginia. I was always taking photos, editing them, and sharing them online. I wanted to build a product for other passionate photographers and editors that streamlines their work: fast, tidy, and dependable.

The goal is to make background removal feel as satisfying as hitting send on a great email: one clean action that gives you a shareable, ready to use result.

## Product Experience
- Single screen flow with drag and drop upload.
- Clear status text, progress bar, and timing badges while work is in flight.
- Instant shareable URLs once processing completes.
- Built-in sample image for a one-click demo.
- One page navigation that jumps to About, Motivation, How we made it, and Benefits.
- Responsive layout for phones and laptops.

## Features
- Background removal via remove.bg.
- Horizontal flip and output normalization with Sharp.
- Cloud hosting for originals and processed images.
- SQLite storage for records, caching, and history.
- Mode toggle for optimized or original processing.
- Gallery actions for share, download, and delete.
- Supported formats: JPG, PNG, AVIF, WebP.
- Responsive, modern UI with subtle motion.

## Tech Stack
- Frontend: React + Vite + TypeScript
- Backend: Node + Express + TypeScript
- Storage: SQLite (better-sqlite3)
- Hosting: Cloudinary
- Tests: Vitest + Supertest + React Testing Library

## Project Structure
- `backend/` Express API and image pipeline
- `frontend/` React app and UI
- `samples/` curated sample images for metrics runs
- `docs` via root markdown files (design choices, tradeoffs, demo)

## API Summary
- `GET /api/health` health check
- `GET /api/images` list recent ready images
- `GET /api/images/:id` fetch a single record
- `POST /api/images` upload and process an image
- `DELETE /api/images/:id` delete hosted images and record

## Local Setup
1. Create env files exactly as listed in the project docs.
2. Install dependencies:
   - `cd backend && npm install`
   - `cd frontend && npm install`
3. Run locally:
   - `cd backend && npm run dev`
   - `cd frontend && npm run dev`

## Tests (Verified)
Run:
- `cd backend && npm test`
- `cd frontend && npm test`

Last verified locally on 2026-02-04:
- Backend: 2 files, 17/17 tests passed
- Frontend: 1 file, 16/16 tests passed

## Metrics
See `METRICS.md` for the harness, how to run it, and the results table.

## Deployment
See:
- `render.yaml` for backend and frontend services
- `frontend/vercel.json` for Vercel
- `DEPLOYMENT_CHECKLIST.md` for a production checklist
- `DEMO_WALKTHROUGH.md` for a live demo script

## Design and Documentation
- `DESIGN_CHOICES.md` for UX and engineering decisions
- `TRADEOFFS.md` for future work and tradeoffs
- `SHOWCASE.md` for a product ready summary
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `LICENSE` for open source support
