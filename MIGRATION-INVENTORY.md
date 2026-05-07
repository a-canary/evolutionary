# Migration Inventory & Gap Analysis

**Reference Framework:** `evolutionary/src/types.ts` (canonical TypeScript EA types)
**Target Skill:** `scaffold-project` + `sprint` workflow
**Source Repos:** `anti-sycophancy-benchmark`, `hermes-agent-self-evolution`, `benchmark/memory-bench`, `benchmark/memory-bench/optimize-no-ledge`, `benchmark/memory-bench/evo`, `m27-research-opt`, `webui/EA-HEURISTICS.md`

---

## 1. anti-sycophancy-benchmark

### What It Is
Anti-sycophancy preamble evolution project. Evolves agent preambles to reduce 4 sycophancy failure modes (C1-C4). Pure Python, long-running EA with CLI runners.

### Artifacts
| Path | Description |
|------|-------------|
| `preamble_evolution.py` | Main EA loop — genetic algorithm over preambles |
| `scripts/run_benchmark_v{1,2,3,4}.py` | Per-course runners |
| `scripts/elo_ranker.py` | C2 ELO ranking |
| `preambles/` | Seed + evolved preamble variants |
| `prompts/{C1,C2,C3,C4}/` | Prompt challenge sets |
| `SOUL.md` | Anti-sycophancy agent preamble (applied to `~/.hermes/SOUL.md`) |
| `BENCHMARK.md` | Full benchmark spec |
| `EA-learnings.md` | Lessons from running the EA |

### Gap vs `evolutionary/src/types.ts`

**Type compatibility:** NONE — this project predates the `evolutionary/` TypeScript library and has its own incompatible Python EA types.

**Key mismatches:**
- `Individual` has Python `dict` attributes vs TypeScript `Individual` interface with `_text?`, `_yaml?`, `_code?` discriminated union genome
- `EAConfig` in Python uses closures for `validate`/`evaluate`/`mutate`/`crossover`; TS uses typed callback signatures
- Python uses manual JSONL logging; TS has `LineageLogger` + `LogEvent` schema
- No `FitnessResult` wrapper in Python — returns `(score, details)` tuple directly
- Python uses `best_score` float; TS uses `bestFitness` + `fitness: number | null` on `Individual`

**Migration needed:** Rewrite `preamble_evolution.py` to use `evolutionary/src/` as a library, or port the logic and wrap at the boundary.

### Migration Steps
1. Create `src/preamble_evolution_port.ts` — wraps `preamble_evolution.py` output as `Individual[]` + `EARunResult`
2. Map Python Individual dict → TS `Individual` interface (especially `genome._text = preamble_text`)
3. Run `preamble_evolution.py` as subprocess, parse JSONL output → feed to `EA` class for lineage logging
4. Or: rewrite `evaluate()` callback to call the Python benchmark scripts, parse results, return `FitnessResult`

**Effort:** Medium — 3-5 sprints

---

## 2. hermes-agent-self-evolution

### What It Is
DSPy + GEPA evolutionary self-improvement for Hermes Agent skills/prompts/tools. Phase 1 (skills) implemented. Python + DSPy.

### Artifacts
| Path | Description |
|------|-------------|
| `evolution/` | Core DSPy+GEPA optimization package |
| `evolution/core/dataset_builder.py` | Eval dataset generation |
| `evolution/core/fitness.py` | Fitness functions |
| `evolution/core/constraints.py` | Constraint validators |
| `evolution/skills/evolve_skill.py` | Main entry for skill evolution |
| `PLAN.md` | Full 5-phase architecture (781 lines) |
| `generate_report.py` | Report generation |

### Gap vs `evolutionary/src/types.ts`

**Architecture alignment:** PARTIAL — uses DSPy (not the TS EA class) for its optimization loop. The `evolutionary/` TS library is NOT the execution engine here; DSPy GEPA is. However, both share the same conceptual EA lifecycle (seed → evaluate → select → breed).

**Key mismatches:**
- DSPy `Signature` and `Module` have no equivalent in TS `evolutionary/`
- `evolution/core/fitness.py` — LLM-as-judge scoring; TS `FitnessResult` is compatible but `fitness.py` has richer rubric scoring
- `constraints.py` — char limits, caching compat, test suite; TS has no equivalent validation layer
- No `LogEvent` schema — DSPy has its own telemetry
- `EARunState` fields (cacheHitRate, cacheSize) don't map to DSPy internals

**Critical overlap with `m27-research-opt`:**
- Both use `ARM` concept (variant = a named hypothesis to test)
- Both have 6-dimension rubric scoring
- `evolutionary/src/types.ts` has NO `RubricDim` — it only has `FitnessResult { fitness, metrics, judgeOutput }`

### Migration Steps
1. **Do NOT rewrite DSPy** — this is the primary engine and is actively maintained
2. **Export fitness schema:** Create `evolutionary/src/fitness.ts` with `RubricDim` interface compatible with both projects
3. Add `EAConfig.validate` callback that checks char limits (≤15KB for skills per PLAN.md)
4. Add `benchmarkGate` to `EAConfig` — run TBLite/YC-Bench before accepting evolved variant
5. Create `HERMES.md` doc in `evolutionary/docs/` showing how to wire DSPy as `evaluate` callback

**Effort:** Low — additive types + docs, no rewrite

---

## 3. benchmark/memory-bench

### What It Is
Memory system benchmark suite comparing hermes, holographic, mem0, obsidian, ke memory backends. Complex research tasks, 6 configurations, Elo ranking.

### Artifacts
| Path | Description |
|------|-------------|
| `harness.py` | Main benchmark runner |
| `judge.py` | LLM judge evaluation |
| `generate_report.py` | HTML report generation |
| `TASKS.md` | 6 task definitions (memory-dependent work only) |
| `SPEC.md` | Full spec |
| `TASKS.md` (new) | Redesigned 6-task suite focused on memory |
| `memory-bench/optimize-no-ledge/` | Separate sub-project for optimizing no-ledge variants |
| `memory-bench/evo/` | EA orchestration for memory strategies |
| `memory-bench/plur/` | Plur memory plugin |
| `memory-bench/OpenViking/` | OpenViking examples |

### Gap vs `evolutionary/src/types.ts`

**Framework usage:** NOT using `evolutionary/`. Uses custom Python EA in `optimize-no-ledge/` and `evo/` subdirs.

**Key mismatches:**
- `optimize-no-ledge/ea_loop.py` — custom EA with own `Genome` class and `Gene` registry
- `optimize-no-ledge/genes/gene_registry.py` — 10 memory-related genes (e.g., `use_vector`, `use_sqlite`, TTL strategies)
- `evo/ea_genome.py` + `ea_orchestrate.py` — separate EA for memory config evolution
- `Individual`-equivalent classes in Python are NOT compatible with TS `Individual` interface

**Missing type in `evolutionary/`:**
- No concept of `Gene` or `GeneRegistry` — the TS library treats genome as opaque JSON
- No `benchmarkGate` concept — validate evolved config doesn't regress on benchmark

### Migration Steps
1. Add `Gene`-like extension to `Genome` type: allow `_tuple?: unknown[]` to represent categorical config vectors
2. Create `benchmarkGate` optional field on `EAConfig`
3. Port `optimize-no-ledge/genes/gene_registry.py` → TypeScript `GeneRegistry` class
4. Create example: `examples/04-memory-config-evolution.ts` using `optimize-no-ledge` gene schema
5. Add `benchmark/memory-bench` as a consumer of `evolutionary/` in `docs/HERMES.md`

**Effort:** Medium — 4-6 sprints

---

## 4. benchmark/memory-bench/optimize-no-ledge

### What It Is
EA optimizing no-ledge memory system configuration. Uses gene-based genome (10 memory strategy dimensions). Python, production-quality.

### Artifacts
| Path | Description |
|------|-------------|
| `ea_loop.py` | Main EA loop (59KB) |
| `breeder.py` | Breeding logic for memory config |
| `evaluator.py` | Evaluates memory configs via benchmark tasks |
| `evolution.py` | Evolution state machine |
| `genes/gene_registry.py` | 10 memory genes |
| `genes/genome.py` | Genome representation |
| `kb/` | Knowledge base — iteration logs |
| `runs/` | Artifact runs |

### Gap vs `evolutionary/src/types.ts`

**Direct conflict:** `genes/genome.py` defines its own `Genome` class incompatible with TS `Genome` interface.

**Gene system missing from TS:**
```python
# Python genes/gene_registry.py
GENES = {
    'use_vector': GeneBool,
    'use_sqlite': GeneBool,
    'ttl_strategy': GeneCategorical(['permanent', '5m', '1h', ...]),
    'vector_weight': GeneFloat(0.0, 1.0),
    ...
}
```

TS `Genome` union type has no gene/categorical concept — `_tuple?: unknown[]` is the closest but has no schema.

### Migration Steps
1. Create `src/gene.ts` — `GeneBool`, `GeneCategorical`, `GeneFloat` classes
2. Create `src/gene-registry.ts` — `GeneRegistry` with `apply(genes, config)` → `Genome`
3. Create `src/breeder.ts` — crossover/mutation operators for gene-based genomes
4. Add to `EAConfig`: `genomeType: 'gene-tuple' | 'free-text' | 'code'` discriminated genome mode
5. Run `benchmark/memory-bench/optimize-no-ledge` as a validation consumer of the gene system

**Effort:** Medium — 4 sprints

---

## 5. benchmark/memory-bench/evo

### What It Is
EA orchestration for memory-evolution benchmark. Separate Python EA for evolving memory strategies with LLM judge.

### Artifacts
| Path | Description |
|------|-------------|
| `ea_orchestrate.py` | Main orchestrator (40KB) |
| `ea_genome.py` | Genome definition for memory evolution |
| `ea_runner.py` | Per-generation runner |
| `run_evo_benchmark.py` | Entry point |

### Gap vs `evolutionary/src/types.ts`

**Overlaps with `optimize-no-ledge`:** Both are Python EAs for memory config. `evo/` is newer/more mature.

**No TypeScript equivalent exists.**

### Migration Steps
1. Merge gene system from `optimize-no-ledge` and `evo/` genome definitions into one TS `GeneRegistry`
2. Create `examples/04-memory-config-evolution.ts` as canonical TS implementation
3. Deprecate Python `evo/` and `optimize-no-ledge` once TS version is validated

**Effort:** Medium — 5 sprints

---

## 6. m27-research-opt

### What It Is
MiniMax-M2.7 research optimization via evolutionary arms. 13 rounds completed, winner is `v8-combined-critics` (28/30). TypeScript + bun. **Archive mode.**

### Artifacts
| Path | Description |
|------|-------------|
| `lib/types.ts` | `Task`, `ArmRun`, `Arm`, `RubricDim`, `Judgment`, `TrialResult` |
| `lib/ke.ts` | KE invocation wrapper |
| `arms/` | Arm implementations (v1-v8 variants) |
| `bench/` | Runner, judge, analyzer |
| `rounds/<N>/` | Per-round state |
| `CHOICES.md` | Full project spec |
| `NEXT.md` | Status (Archive mode) |

### Gap vs `evolutionary/src/types.ts`

**`RubricDim` mismatch:**
```typescript
// m27-research-opt/lib/types.ts
interface RubricDim {
  technical_accuracy: number;
  technical_depth: number;
  task_relevance: number;
  evidence_grounding: number;
  source_rigor: number;
  actionability: number;
}

// evolutionary/src/types.ts — NO RubricDim at all
// Only: FitnessResult { fitness: number; metrics: Record<string, unknown>; judgeOutput: string }
```

**`Arm` concept not in TS EA:**
```typescript
// m27: Arm = named hypothesis with run(task) method
// TS EA: Individual has no run() method — evaluation is external
```

**Missing from TS EA library:**
- `RubricDim` type for multi-dimensional fitness
- `TrialResult` + `Judgment` result types
- Thompson sampling integration (mentioned in CHOICES.md F-0003)
- Cost tracking per trial

### Migration Steps
1. Add `RubricDim` to `evolutionary/src/types.ts` — required for multi-dimensional scoring
2. Add `TrialResult` and `Judgment` interfaces
3. Add `Arm` as an alias for `Individual` in the context of research optimization
4. Create `examples/05-research-arm-evolution.ts` — demonstrates Thompson-sampled arm selection
5. Add note in `HERMES.md`: m27-research-opt uses `Arm` model, not raw `Individual` — both work with `EA` class

**Effort:** Low — additive types, 1-2 sprints

---

## 7. webui/EA-HEURISTICS.md

### What It Is
EA-Heuristic framework — measurable quality signals per artifact type for code, design, architecture, documentation. Part of webui project.

### Artifacts
| Path | Description |
|------|-------------|
| `EA-HEURISTICS.md` | Full spec (129 lines) — metrics, targets, Python implementations |
| `EA-LLM-TASTE.md` | ELO ranking for LLM taste |
| `CHOICES.md` | Project spec with M-0001 (Director as sole human interface), etc. |

### Gap vs `evolutionary/src/types.ts`

**No code to migrate** — this is a design document, not implementation.

**Conceptual alignment:**
- EA-Heuristics define per-artifact-type metrics (cyclomatic complexity, test coverage, contrast ratio, etc.)
- TS `FitnessResult.metrics: Record<string, unknown>` CAN carry these metrics but has no schema
- The `/api/ea-heuristic/scores` endpoint in the doc has no implementation in the TS EA library

### Migration Steps
1. **No code migration** — document lives in `webui/`
2. **Add to `evolutionary/docs/HERMES.md`**: document that EA-Heuristics can be used as `validate` or `evaluate` callbacks
3. Create `evolutionary/src/heuristics.ts` — implement cyclomatic complexity, type hint coverage, docstring coverage checkers
4. Create `examples/06-code-quality-evolution.ts` — evolves code artifact using heuristic validation

**Effort:** Low — 2 sprints

---

## Summary: Cross-Project Type Compatibility Matrix

| Project | Uses `evolutionary/` TS lib? | Key Type Gaps | Migration Effort |
|---------|------------------------------|---------------|-----------------|
| anti-sycophancy-benchmark | ❌ No | Complete rewrite needed | Medium (3-5 sprints) |
| hermes-agent-self-evolution | ❌ No (DSPy) | `RubricDim`, `Constraint`, `benchmarkGate` | Low (additive) |
| benchmark/memory-bench | ❌ No | Gene system, `benchmarkGate` | Medium (4-6 sprints) |
| optimize-no-ledge | ❌ No | `GeneRegistry`, gene-based genome | Medium (4 sprints) |
| benchmark/memory-bench/evo | ❌ No | Same as optimize-no-ledge | Medium (5 sprints) |
| m27-research-opt | ❌ No | `RubricDim`, `Arm`, Thompson sampling | Low (additive) |
| webui/EA-HEURISTICS.md | N/A | Documentation only | Low (docs + heuristics.ts) |

---

## Priority Migration Order

1. **Phase 1 (Immediate):** Add missing types to `evolutionary/src/types.ts`
   - `RubricDim` (from m27-research-opt)
   - `TrialResult`, `Judgment` (from m27-research-opt)
   - `Gene`, `GeneRegistry` interfaces (from optimize-no-ledge)
   - `benchmarkGate` field on `EAConfig`

2. **Phase 2 (Short-term):** Create `src/heuristics.ts` + examples
   - Implement EA-Heuristics as `validate` callbacks
   - `examples/04-memory-config-evolution.ts`
   - `examples/05-research-arm-evolution.ts`
   - `examples/06-code-quality-evolution.ts`

3. **Phase 3 (Medium-term):** Port anti-sycophancy-benchmark
   - Wrap Python EA as subprocess, map output to TS types
   - Or rewrite `evaluate` callback to call Python scripts

4. **Phase 4 (Long-term):** Consolidate memory EAs
   - Deprecate Python `evo/` + `optimize-no-ledge` in favor of TS implementation
   - Single canonical gene-based evolution example

---

## Files to Create/Modify

### New files in `evolutionary/`
```
src/types.ts          — ADD: RubricDim, Judgment, TrialResult, Gene*, benchmarkGate
src/gene.ts           — NEW: GeneBool, GeneCategorical, GeneFloat classes
src/gene-registry.ts  — NEW: GeneRegistry
src/breeder.ts        — NEW: crossover/mutation for gene genomes
src/heuristics.ts     — NEW: cyclomatic_complexity, type_hint_coverage, docstring_coverage
docs/HERMES.md        — UPDATE: add m27-research-opt, EA-Heuristics sections
examples/04-memory-config-evolution.ts   — NEW
examples/05-research-arm-evolution.ts    — NEW
examples/06-code-quality-evolution.ts    — NEW
```

### Modified files
```
src/types.ts          — ADD RubricDim, TrialResult, Judgment, Gene types, benchmarkGate
src/index.ts          — re-export new modules
README.md             — ADD m27-research-opt and EA-Heuristics to references
```
