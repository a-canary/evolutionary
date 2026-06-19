# NEXT.md — evolutionary

## F-0008: Vitest test suite
Generated: 2026-05-11 | Category: feature | Score: 75 | Est: 4h
Scope: In scope
Source: inbox:handoff-20260511-090127-developer.md | discovery
Evidence: F-0006 complete; test coverage is next highest-value gap for project quality
Action: Build Vitest unit tests for cache, backoff, semaphore, utils, EA lifecycle with mock evaluate. Suggested order: cache → semaphore → backoff → utils → EA integration
Status: ✅ Done (2026-05-11 — 49/49 tests passing, commit 49e30b9)

## F-0007 + F-0009: Heuristics + examples 05-06
Generated: 2026-05-11 | Category: feature | Score: 60 | Est: 3h
Scope: In scope
Source: inbox:handoff-20260511-090127-developer.md | discovery
Evidence: F-0007 (heuristics module) and F-0009 (examples 04-06 parity) are next aligned features
Action: F-0007: implement src/heuristics.ts with cyclomatic complexity, type-hint coverage, docstring coverage as composable validate/evaluate callbacks. F-0009: build examples 04-06 (memory-config-evolution, research-arm-evolution, code-quality-evolution)
Status: Pending

## F-0010: npm publish readiness
Generated: 2026-05-11 | Category: feature | Score: 45 | Est: 2h
Scope: In scope
Source: discovery
Evidence: Library has solid feature base; readiness for npm publish unblocks downstream adoption
Action: Create dist/ build, exports map with types, README badges, CHANGELOG
Status: Pending

## Deferred

### Port anti-sycophancy-benchmark to TS EA library
Generated: 2026-05-08
Source: director
Reason: Medium effort (3-5 sprints); Python EA still works; migration value is alignment not capability
Unblock: Complete Phase 1-2 first; then evaluate whether migration reduces duplication meaningfully

### Consolidate memory-bench Python EAs (optimize-no-ledge + evo)
Generated: 2026-05-08
Source: director
Reason: High effort (5+ sprints); Python EAs are functional; gene system types already in TS; consolidation is a nice-to-have
Unblock: Phase 2 test suite complete; gene system examples 04 validated in practice