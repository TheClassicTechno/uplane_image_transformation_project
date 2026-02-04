## Errors and fixes log

I hit several integration and tooling issues during development. Below I descripe errors I ran thru and how I resolved them.

### Frontend build and test issues
- **Vite config error**: `test` not recognized in Vite config.  
  **Fix**: import `defineConfig` from `vitest/config` and include `test` settings there.
- **Missing App import types**: `Cannot find module './App'`.  
  **Fix**: use explicit `./App.tsx` import in `frontend/src/main.tsx`.
- **Jest DOM matchers missing**: `toBeInTheDocument` not found.  
  **Fix**: add `@testing-library/jest-dom` to `tsconfig.json` types and setup tests.
- **IntersectionObserver not defined** in jsdom tests.  
  **Fix**: add a lightweight `IntersectionObserver` mock in `frontend/src/setupTests.ts`.
- **React act warnings / timeouts** in tests.  
  **Fix**: wrap renders with `act`, improve fetch mocks, and simplify polling tests.

### Backend build and test issues
- **Invalid `tsconfig.json`**: “root value must be an object.”  
  **Fix**: remove duplicated JSON object in `backend/tsconfig.json`.
- **remove.bg Buffer type error**: `Buffer` not assignable to `BlobPart`.  
  **Fix**: wrap the buffer with `new Uint8Array()` when creating `Blob`.
- **Vitest running compiled tests in `dist/`** leading to CJS import errors.  
  **Fix**: add `backend/vitest.config.ts` with `include` for `src/**/*.test.ts` and `exclude` for `dist/**`.
- **Supertest EPERM (listen) errors in sandbox**.  
  **Fix**: re-run backend tests outside sandbox; in CI/local, keep `NODE_ENV=test` and avoid binding to restricted interfaces.
- **Sync job failures returned 201** in tests.  
  **Fix**: after sync processing, check `status === "failed"` and return 500.
- **remove.bg invalid file type (mp4) for AVIF/WebP**.  
  **Fix**: pass correct MIME type + filename extension; convert AVIF to PNG before sending.

### Runtime and integration issues
- **Missing Cloudinary env vars** produced unclear errors.  
  **Fix**: validate required env vars and throw a clear, consolidated message.
- **remove.bg env var missing** produced unclear errors.  
  **Fix**: same consolidated validation for API key.
- **CORS failures on Vercel**.  
  **Fix**: set `CLIENT_ORIGIN` to the exact Vercel domain and redeploy backend.
- **Vercel “Failed to fetch”**.  
  **Fix**: set `VITE_API_BASE_URL` to Render backend URL and redeploy frontend.
- **Backend root path returned 404**.  
  **Fix**: use `/api/health` for checks; the service only exposes API routes.

### Deployment issues
- **Render start failure**: `dist/index.js` missing.  
  **Fix**: set `Root Directory=backend`, `Build Command=npm install && npm run build`, `Start Command=npm run start`.
- **Render used Yarn by default** with npm lockfile present.  
  **Fix**: explicitly set npm commands to match `package-lock.json`.
- **GitHub workflow push rejected** (missing workflow scope).  
  **Fix**: remove workflow files from commits or use a PAT with `workflow` scope.

### Git workflow issues
- **Accidental extra files in commits**.  
  **Fix**: unstage unwanted files and commit only explicitly staged paths.
- **Unwanted commit trailers** (`Co-authored-by: Cursor`).  
  **Fix**: avoid `--trailer`; soft reset and re-commit without trailers.


