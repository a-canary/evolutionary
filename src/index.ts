/**
 * EA Framework — Public API
 *
 * Import everything from here:
 *   import { EA, EAConfig, Individual, Genome, ... } from 'evolutionary';
 */

export { EA } from './ea.js';
export type {
  EAConfig,
  Individual,
  Genome,
  EARunState,
  EARunResult,
  FitnessResult,
  ValidationResult,
  ArtifactType,
  EvalMethod,
  IndividualStatus,
  RetireCause,
  BreedMethod,
  LogEvent,
  LogEventType,
} from './types.js';

export { SHA256EvalCache, NoOpCache } from './cache.js';
export type { EvalCache } from './cache.js';
export { LineageLogger } from './logger.js';
export { withBackoff, sleep } from './backoff.js';
export { Semaphore } from './semaphore.js';
export { newId, createIndividual, rouletteSelect, pickTwo, normalizeScore, safeConfig, ts } from './utils.js';