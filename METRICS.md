## Metrics (initial validation)

These are preliminary results from local runs. They are meant to show expected quality, not statistically significant benchmarks.

| Metric | Method | Sample size | Result | Notes |
| --- | --- | --- | --- | --- |
| Background removal quality | Visual inspection | 1 (provided example) | High | Clean edges and transparent background on sample |
| Flip correctness | Visual comparison | 1 | 100% | Output mirrored exactly as expected |
| Upload success rate | Local runs | 3 | 100% | No failed uploads during testing |
| End‑to‑end completion | Local runs | 3 | 100% | Includes remove.bg + flip + hosting |

## Metrics harness

Use the harness to generate repeatable results across multiple samples and output a shareable table.

### Setup
1. Add 3–5 images to `samples/` (see `samples/README.md`).
2. Ensure `REMOVE_BG_API_KEY` is set in `backend/.env`.

### Run
```bash
cd backend
npm run metrics
```

### Output
- `backend/metrics/results.json` — raw data
- `backend/metrics/results.md` — markdown table
- `backend/metrics/output/` — processed PNGs for inspection

The harness records remove.bg latency, flip latency, output size, and transparent pixel ratio. AVIF inputs are converted to PNG before remove.bg.

## Measured results (local run)
Generated at: 2026-02-04T23:18:40.493Z

| File | Input (KB) | Output (KB) | remove.bg (ms) | Flip (ms) | Transparent % |
| --- | --- | --- | --- | --- | --- |
| sample-indoor.png | 25.2 | 9.3 | 1303 | 4 | 57.6% |
| sample-portrait.png | 20.5 | 12.5 | 943 | 2 | 81.0% |
| sample-product.png | 23.1 | 15.4 | 718 | 2 | 60.3% |
