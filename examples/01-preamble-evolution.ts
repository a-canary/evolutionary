/**
 * Example 01 — Preamble Evolution
 *
 * Evolves short "anti-sycophancy" style preambles (15–35 words) using
 * 3 programmatic fitness signals: keyword match, length efficiency, instruction clarity.
 *
 * Demonstrates:
 * - Free-text artifact type
 * - Full EA lifecycle with callbacks
 * - SHA256 eval cache (enabled by default)
 * - Parallel evaluation with concurrency limit
 * - External monitor polling getState() every 3s
 * - Agent lifecycle decisions in onRetire hook
 *
 * Run: npx ts-node examples/01-preamble-evolution.ts
 */

import { EA, EAConfig, Individual, RetireCause } from '../src/index.js';

// =============================================================================
// Domain Constants
// =============================================================================

const PREAMBLE_TEMPLATES = [
  'Answer the question directly. Do not elaborate on the reasoning process.',
  'You are a helpful assistant. Provide clear and concise answers.',
  'Think carefully before answering. Provide accurate information.',
  'As an AI assistant, I will answer truthfully and to the best of my ability.',
  'I will reason step by step and then provide my final answer.',
  'Based on my knowledge, here is my response to your question.',
  'Let me provide a comprehensive answer to your inquiry.',
  'Please consider the following question carefully.',
];

const PROHIBITED = ['please', 'thank you', 'certainly', 'however', 'as an AI'];
const MAX_WORDS = 35;
const MIN_WORDS = 5;

// =============================================================================
// Callbacks
// =============================================================================

/** Validation: fast gate — skip eval cost for obviously bad preambles */
async function validate(ind: Individual) {
  const text = ind.genome._text ?? '';
  const words = text.trim().split(/\s+/);

  if (words.length > MAX_WORDS) return { valid: false, reason: `wordcount ${words.length} > ${MAX_WORDS}` };
  if (words.length < MIN_WORDS) return { valid: false, reason: `wordcount ${words.length} < ${MIN_WORDS}` };
  for (const phrase of PROHIBITED) {
    if (text.toLowerCase().includes(phrase)) return { valid: false, reason: `prohibited: "${phrase}"` };
  }
  return { valid: true, reason: '' };
}

/** Evaluation: 3-signal composite score
 *
 * In a real use-case this would call a benchmark or LLM judge.
 * Here we simulate with programmatic signals + a small delay.
 */
async function evaluate(ind: Individual) {
  await sleep(30 + Math.random() * 70); // simulate API latency

  const text = ind.genome._text ?? '';
  const words = text.trim().split(/\s+/);

  // C1: instruction keyword present
  const c1 = /\b(answer|question|helpful|accurate|truthful|provide|clear)\b/i.test(text) ? 1.0 : 0.3;

  // C2: length efficiency — reward ~20 words, penalize very short/long
  const optimal = 20;
  const c2 = Math.max(0, 1 - Math.abs(words.length - optimal) / optimal);

  // C3: instruction clarity (starts with a clear directive verb)
  const c3 = /^(Answer|Provide|Think|Let|Based|Here is|I will|As an)/i.test(text.trim()) ? 1.0 : 0.5;

  const fitness = Math.round((c1 * 0.5 + c2 * 0.3 + c3 * 0.2) * 100) / 100;

  return {
    fitness,
    metrics: { c1, c2, c3, wordcount: words.length },
    judgeOutput: `C1=${c1} C2=${c2.toFixed(2)} C3=${c3}`,
  };
}

/** Mutation: 70% LLM-style (semantic rewrite), 30% random edit */
async function mutate(parent: Individual): Promise<Individual> {
  const text = parent.genome._text ?? '';

  if (Math.random() < 0.7) {
    // Semantic rewrite — in reality call LLM with mutation prompt
    const mutations: Array<[string, string]> = [
      ['Answer the question directly.', 'Provide a direct response.'],
      ['Do not elaborate on the reasoning process.', 'Avoid unnecessary detail.'],
      ['helpful', 'useful'],
      ['concise', 'brief'],
      ['think carefully', 'reason carefully'],
      ['Provide accurate', 'Give accurate'],
      ['truthful', 'honest'],
      ['Based on my knowledge', 'Drawing on available information'],
    ];
    let mutated = text;
    for (const [from, to] of mutations) {
      mutated = mutated.replace(new RegExp(from, 'gi'), to);
    }
    if (mutated === text) mutated = text + '.'; // ensure some change
    const newGenome = { ...parent.genome, _text: mutated };
    return { ...parent, genome: newGenome };
  } else {
    // Random word swap
    const words = text.split(/\s+/);
    if (words.length > 3) {
      const i = Math.floor(Math.random() * (words.length - 1));
      [words[i], words[i + 1]] = [words[i + 1], words[i]];
    }
    return { ...parent, genome: { ...parent.genome, _text: words.join(' ') } };
  }
}

/** Crossover: unbiased LLM blend — in reality call LLM with mix prompt */
async function crossover(a: Individual, b: Individual): Promise<Individual> {
  const textA = a.genome._text ?? '';
  const textB = b.genome._text ?? '';
  const wordsA = textA.split(/\s+/);
  const wordsB = textB.split(/\s+/);

  // Simulate LLM blend: first ~50% from A, last ~50% from B
  const mid = Math.floor(wordsA.length * 0.5);
  const newText = [...wordsA.slice(0, mid), ...wordsB.slice(Math.floor(wordsB.length * 0.5))].join(' ');

  return {
    ...a,
    genome: { _text: newText },
    parents: [a.id, b.id],
  };
}

/** Seed: first 8 from templates, then random */
async function seed(index: number): Promise<{ _text: string }> {
  if (index < PREAMBLE_TEMPLATES.length) {
    return { _text: PREAMBLE_TEMPLATES[index] };
  }
  const base = PREAMBLE_TEMPLATES[index % PREAMBLE_TEMPLATES.length];
  return { _text: base + ' Updated.' };
}

/** Rank-based selection: keep top survivalRate fraction */
function select(population: Individual[], scores: Map<string, number>): Individual[] {
  return [...population]
    .sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0))
    .slice(0, Math.max(1, Math.floor(population.length * 0.5)));
}

/** Stop if no improvement for 5 generations or fitness >= 0.95 */
function shouldTerminate(_gen: number, _best: number, stagnant: number): boolean {
  return stagnant >= 5;
}

// =============================================================================
// Agent Lifecycle Decisions
// =============================================================================

let bestEver: Individual | null = null;
const archivedCount = { lineage: 0, failed: 0 };

async function onRetire(ind: Individual, cause: RetireCause): Promise<void> {
  // Best-ever is never discarded
  if (!bestEver || (ind.fitness ?? 0) > (bestEver.fitness ?? 0)) {
    bestEver = { ...ind };
    console.log(`  ★ New best: ${ind.id} fitness=${ind.fitness}`);
  }

  // Lineage archive — save all retirees for postmortem analysis
  archivedCount.lineage++;
  console.log(`  [RETIRE] ${ind.id} cause=${cause} fitness=${ind.fitness} (archived=${archivedCount.lineage})`);
}

// =============================================================================
// Monitor — polls every 3 seconds
// =============================================================================

function startMonitor(ea: EA): () => void {
  const id = setInterval(() => {
    if (ea.isDone()) { clearInterval(id); return; }
    const s = ea.getState();
    const bar = '█'.repeat(Math.round(s.bestFitness * 20)) + '░'.repeat(20 - Math.round(s.bestFitness * 20));
    console.log(
      `  gen=${String(s.generation).padStart(2)} ` +
      `eval=${s.evaluatedCount}/${s.populationSize} ` +
      `best=${s.bestFitness.toFixed(3)} ${bar} ` +
      `stale=${s.stagnantRounds} ` +
      `cache=${s.cacheSize} ` +
      `hits=${(s.cacheHitRate * 100).toFixed(0)}%`
    );
  }, 3000);
  return () => clearInterval(id);
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('\n=== Example 01: Preamble Evolution ===\n');
  console.log('Pop=8, survival=50%, max_gen=20, early_stop=5, eval_concurrency=4\n');

  const runId = `preamble_${Date.now().toString(36)}`;
  const logPath = `/tmp/${runId}/lineage.jsonl`;

  const config: EAConfig = {
    artifactType: 'free-text',
    populationSize: 8,
    survivalRate: 0.5,
    elitismCount: 1,
    maxGenerations: 20,
    earlyStopRounds: 5,
    fitnessTarget: null,
    crossoverRate: 0.3,
    llmMutationRatio: 0.7,
    evalTimeoutMs: 30_000,
    evalCacheEnabled: true,
    evalConcurrency: 4,
    breedConcurrency: 4,
    backoffBaseMs: 1_000,
    backoffMaxMs: 8_000,
    backoffMaxRetries: 2,
    logPath,
    lineagePath: `/tmp/${runId}/postmortem`,
    runId,

    validate,
    evaluate,
    mutate,
    crossover,
    seed,
    select,
    shouldTerminate,
    onRetire,
  };

  const ea = new EA(config);
  const stopMonitor = startMonitor(ea);

  const start = Date.now();
  const result = await ea.run();
  stopMonitor();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`\n=== Complete ===`);
  console.log(`  Run:          ${result.runId}`);
  console.log(`  Generations:  ${result.generationsCompleted}`);
  console.log(`  Total evals:  ${result.totalEvaluations}`);
  console.log(`  Cache hit %:  ${(result.cacheHitRate * 100).toFixed(1)}%`);
  console.log(`  Best fitness: ${result.bestFitness}`);
  console.log(`  Best text:    "${result.bestIndividual.genome._text}"`);
  console.log(`  Elapsed:      ${elapsed}s`);
  console.log(`  Log:          ${logPath}`);
  if (bestEver) console.log(`\n  ★ Best ever:  ${bestEver.id} — "${bestEver.genome._text}"`);
  console.log();
}

function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }

main().catch(console.error);