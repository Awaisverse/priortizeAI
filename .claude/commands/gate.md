# /gate — Full Gate Review

Run this after any significant change to validate the entire project is healthy.

## Steps

```bash
# 1. Type check (0 errors required)
npm run type-check

# 2. Full test suite (196 tests)
npm test -- --runInBand

# 3. Coverage report
npm run test:coverage -- --runInBand
```

> **Windows note:** If `npm` is not found, prepend Node to PATH first:
> `$env:PATH = "C:\Program Files\nodejs;$env:PATH"`

## Pass Criteria

| Check | Target |
|-------|--------|
| TypeScript errors | 0 |
| Tests passing | 196/196 |
| Phase 1 coverage | 80%+ |
| Phase 2 coverage | 90%+ |
| Phase 3 coverage | 80%+ |

## Phase Boundary Contracts

| Phase | Input | Output | Validator |
|-------|-------|--------|-----------|
| 1 | HubSpot + Calendar APIs | `UnifiedDataPackage` | `validateUnifiedDataPackage()` |
| 2 | `UnifiedDataPackage` | `PrioritizedActivities` | `validatePrioritizedActivities()` |
| 3 | `PrioritizedActivities` | `IntelligenceBlocks` | `validateIntelligenceBlocks()` |
| 4 | All above | `ExecutionContext` | `validateExecutionContext()` |
| 5 | `ExecutionContext` | Slack DM + `Report` | Delivery confirmed |

If any check fails, fix before committing.
