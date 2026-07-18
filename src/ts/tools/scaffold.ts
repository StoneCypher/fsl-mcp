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

/** Escapes regex metacharacters so a literal string is safe inside an alternation. */
const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** One canonical -> replacement pair to resolve in the single combined substitution pass. */
interface Substitution {
  /** The exact literal to match: a full machine_name statement, a quoted action, or a bare state name. */
  readonly from: string;
  /** The literal text to substitute in place of a match. */
  readonly to: string;
  /** Whether `from` must be wrapped in `\b...\b` (bare state tokens) rather than matched verbatim. */
  readonly bounded: boolean;
}

/**
 * Applies every substitution to `src` in one single-pass combined regex, so no
 * replacement text is ever re-scanned by a later alternative (the source of the
 * cross-slot corruption this replaces). Order in `subs` sets alternation
 * precedence: earlier entries win when two alternatives could start at the
 * same position. `subs` must be non-empty; the sole caller always pushes the
 * machine_name statement first.
 */
const substitute = (src: string, subs: readonly Substitution[]): string => {
  const lookup = new Map<string, string>(subs.map((sub): [string, string] => [sub.from, sub.to]));
  const pattern = subs
    .map((sub) => (sub.bounded ? `\\b${escapeRegExp(sub.from)}\\b` : escapeRegExp(sub.from)))
    .join('|');
  const combined = new RegExp(pattern, 'g');
  return src.replace(combined, (match) => lookup.get(match) ?? match);
};

/**
 * Builds a scaffold from a preset with optional renames; never throws.
 *
 * @param preset - a preset id from the registry (the tool's enum enforces this at the boundary)
 * @param machineName - replacement for the preset's machine_name (always quoted)
 * @param roles - renames keyed by role; list slots need exactly their canonical count
 */
export function fslScaffold(preset: string, machineName?: string, roles?: ScaffoldRoles): ScaffoldResult {
  const presetKnown = Object.prototype.hasOwnProperty.call(SCAFFOLD_REGISTRY, preset)
    && Object.prototype.hasOwnProperty.call(SCAFFOLD_SOURCES, preset);
  const def: PresetDef | undefined = presetKnown ? SCAFFOLD_REGISTRY[preset] : undefined;
  const raw: string | undefined = presetKnown ? SCAFFOLD_SOURCES[preset] : undefined;
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

  // Build every substitution against the ORIGINAL raw source, then resolve them
  // all in one combined regex pass (see `substitute`). Order matters: the
  // machine_name statement and quoted-action forms are pushed before bare
  // state tokens, so they take alternation precedence. The machine_name
  // substitution is ALWAYS pushed - even as an identity rewrite - so the
  // combined regex consumes the whole statement and no bare state token can
  // reach into its quoted text (e.g. review-loop's "Review Loop" containing
  // the canonical state Review).
  const subs: Substitution[] = [];
  subs.push({
    from: `machine_name: "${def.machineName}";`,
    to: `machine_name: "${machineName ?? def.machineName}";`,
    bounded: false,
  });
  for (const slot of def.slots) {
    if (slot.kind !== 'action') continue;
    const value = resolved[slot.role];
    if (typeof value === 'string' && value !== slot.canonical) {
      subs.push({ from: `'${slot.canonical}'`, to: `'${actionBody(value)}'`, bounded: false });
    }
  }
  for (const slot of def.slots) {
    const value = resolved[slot.role];
    if (value === undefined) continue;
    if (slot.kind === 'stateList' && typeof value !== 'string') {
      slot.canonical.forEach((from, i) => {
        const to = value[i];
        if (to !== undefined && to !== from) {
          subs.push({ from, to: stateToken(to), bounded: true });
        }
      });
    } else if (slot.kind === 'state' && typeof value === 'string' && value !== slot.canonical) {
      subs.push({ from: slot.canonical, to: stateToken(value), bounded: true });
    }
  }
  const source = substitute(raw, subs);

  const diagnostics = analyze(source);
  if (hasErrors(diagnostics)) {
    return { valid: false, errors: ['substituted scaffold failed to compile (tool defect - please report)'] };
  }
  return { valid: true, preset, family: def.family, source, roles: resolved, notes: def.notes };
}
