/**
 * fsl_scaffold's engine: resolves a preset id plus optional machine name and
 * role renames into a complete, analyze-verified FSL document. Substitution
 * is a token-boundary rename of the canonical names authored in the preset
 * sources - it never changes structure, which is why list slots are
 * fixed-arity.
 *
 * @example
 *   const r = fslScaffold('decision', 'Fraud Check', { outcomes: ['Approve', 'Deny'] });
 *   if (r.valid) console.log(r.source);
 *
 * @see ./scaffold-registry.js for the preset catalog
 */
import { analyze, hasErrors } from '../analyze.js';
import { SCAFFOLD_SOURCES } from './scaffold-content.js';
import { SCAFFOLD_REGISTRY } from './scaffold-registry.js';
import type { PresetDef } from './scaffold-registry.js';

/** Caller-supplied renames, keyed by role name. */
export type ScaffoldRoles = Record<string, string | readonly string[]>;

/** A successful scaffold: substituted source plus the fully-resolved role map. */
export interface ScaffoldSuccess {
  valid: true; preset: string; family: string; source: string;
  roles: Record<string, string | readonly string[]>; notes: readonly string[];
}

/** A rejected scaffold: named validation (or, defensively, compile) errors. */
export interface ScaffoldFailure { valid: false; errors: readonly string[] }

export type ScaffoldResult = ScaffoldSuccess | ScaffoldFailure;

const BARE = /^[A-Za-z][A-Za-z0-9_]*$/;

const isBadName = (s: string): boolean =>
  s.length === 0 || s.includes('\n') || s.includes('\r');

/** Renders a state name as FSL: bare when safe, double-quoted otherwise. */
const stateToken = (name: string): string => (BARE.test(name) ? name : `"${name}"`);

/** Renders an action label body with apostrophes escaped for single quotes. */
const actionBody = (name: string): string => name.replace(/'/g, "\\'");

const replaceAll = (src: string, find: RegExp, repl: string): string => src.replace(find, repl);

/**
 * Builds a scaffold from a preset with optional renames; never throws.
 *
 * @param preset - a preset id from the registry (the tool's enum enforces this at the boundary)
 * @param machineName - replacement for the preset's machine_name (always quoted)
 * @param roles - renames keyed by role; list slots need exactly their canonical count
 */
export function fslScaffold(preset: string, machineName?: string, roles?: ScaffoldRoles): ScaffoldResult {
  const def: PresetDef | undefined = SCAFFOLD_REGISTRY[preset];
  const raw = SCAFFOLD_SOURCES[preset];
  if (def === undefined || raw === undefined) {
    return { valid: false, errors: [`unknown preset: ${preset}`] };
  }

  const errors: string[] = [];
  const known = new Set(def.slots.map((s) => s.role));
  for (const key of Object.keys(roles ?? {})) {
    if (!known.has(key)) errors.push(`unknown role: ${key}`);
  }
  if (machineName !== undefined && (isBadName(machineName) || machineName.includes('"'))) {
    errors.push('machine_name must be non-empty with no quotes or newlines');
  }

  const resolved: Record<string, string | readonly string[]> = {};
  const finalNames: string[] = [];
  for (const slot of def.slots) {
    const given = roles?.[slot.role];
    if (slot.kind === 'stateList') {
      const value = given ?? slot.canonical;
      if (typeof value === 'string' || value.length !== slot.canonical.length) {
        errors.push(`role ${slot.role} needs exactly ${String(slot.canonical.length)} names`);
        continue;
      }
      value.forEach((n) => {
        if (isBadName(n) || n.includes('"')) errors.push(`role ${slot.role}: bad name ${JSON.stringify(n)}`);
      });
      resolved[slot.role] = value;
      finalNames.push(...value);
    } else {
      const value = given ?? slot.canonical;
      if (typeof value !== 'string') { errors.push(`role ${slot.role} takes a single name`); continue; }
      if (isBadName(value) || (slot.kind === 'state' && value.includes('"'))) {
        errors.push(`role ${slot.role}: bad name ${JSON.stringify(value)}`);
        continue;
      }
      resolved[slot.role] = value;
      if (slot.kind === 'state') finalNames.push(value);
    }
  }
  if (new Set(finalNames).size !== finalNames.length) {
    errors.push('resolved state names must be unique');
  }
  if (errors.length > 0) return { valid: false, errors };

  let source = raw;
  if (machineName !== undefined) {
    source = source.replace(`machine_name: "${def.machineName}";`, `machine_name: "${machineName}";`);
  }
  for (const slot of def.slots) {
    const value = resolved[slot.role];
    if (value === undefined) continue;
    if (slot.kind === 'stateList' && typeof value !== 'string') {
      slot.canonical.forEach((from, i) => {
        const to = value[i];
        if (to !== undefined && to !== from) {
          source = replaceAll(source, new RegExp(`\\b${from}\\b`, 'g'), stateToken(to));
        }
      });
    } else if (slot.kind === 'state' && typeof value === 'string' && value !== slot.canonical) {
      source = replaceAll(source, new RegExp(`\\b${slot.canonical}\\b`, 'g'), stateToken(value));
    } else if (slot.kind === 'action' && typeof value === 'string' && value !== slot.canonical) {
      source = replaceAll(source, new RegExp(`'${slot.canonical}'`, 'g'), `'${actionBody(value)}'`);
    }
  }

  const diagnostics = analyze(source);
  if (hasErrors(diagnostics)) {
    return { valid: false, errors: ['substituted scaffold failed to compile (tool defect - please report)'] };
  }
  return { valid: true, preset, family: def.family, source, roles: resolved, notes: def.notes };
}
