# /run-tests — Run Test Suite

Runs the Jest test suite with the correct flags for this project.

## Usage

`/run-tests` — all tests
`/run-tests unit` — unit tests only
`/run-tests integration` — integration tests only
`/run-tests <pattern>` — filter by test file path

## Commands

```bash
# All tests — ALWAYS use --runInBand (parallel mode OOMs on low-memory machines)
npm test -- --runInBand

# Unit tests only
npm run test:unit -- --runInBand

# Integration tests only
npm run test:integration -- --runInBand

# System integration test (full pipeline with fixture data)
npm test -- --runInBand tests/integration/systemTest.test.ts

# Single phase
npm test -- --runInBand tests/unit/prioritization/

# With coverage report
npm run test:coverage -- --runInBand
```

## Expected Output

```
Test Suites: 17 passed, 17 total
Tests:       196 passed, 196 total
```

## Platform Notes

**macOS / Linux:** Works out of the box if Node.js ≥ 18 is installed.

**Windows:** If npm is not in PATH, prefix commands with:
```powershell
$env:PATH = "C:\Program Files\nodejs;$env:PATH"
```

## Why --runInBand?

Jest's default parallel execution forks multiple worker processes. On machines with limited heap (< 8 GB available), this triggers `FATAL ERROR: Committing semi space failed`. `--runInBand` runs all suites in a single process sequentially.
