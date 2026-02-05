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
1. Use the curated samples in `samples/` or add 3–5 of your own (see `samples/README.md`).
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
Generated at: 2026-02-04T23:53:08.863Z

| File | Input (KB) | Output (KB) | remove.bg (ms) | Flip (ms) | Transparent % |
| --- | --- | --- | --- | --- | --- |
| sample-indoor.png | 25.2 | 9.3 | 2079 | 5 | 57.6% |
| sample-mug.png | 4540.2 | 115.5 | 1887 | 7 | 80.7% |
| sample-portrait.png | 20.5 | 12.5 | 1131 | 2 | 81.0% |
| sample-product.png | 23.1 | 15.4 | 905 | 3 | 60.3% |
| sample-sneakers.png | 4962.9 | 52.3 | 2103 | 3 | 90.7% |
| sample-succulent.png | 4369 | 45.7 | 1057 | 12 | 93.9% |
