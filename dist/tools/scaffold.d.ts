/** Caller-supplied renames, keyed by role name. */
export type ScaffoldRoles = Record<string, string | readonly string[]>;
/** A successful scaffold: substituted source plus the fully-resolved role map. */
export interface ScaffoldSuccess {
    valid: true;
    preset: string;
    family: string;
    source: string;
    roles: Record<string, string | readonly string[]>;
    notes: readonly string[];
}
/** A rejected scaffold: named validation (or, defensively, compile) errors. */
export interface ScaffoldFailure {
    valid: false;
    errors: readonly string[];
}
export type ScaffoldResult = ScaffoldSuccess | ScaffoldFailure;
/**
 * Builds a scaffold from a preset with optional renames; never throws.
 *
 * @param preset - a preset id from the registry (the tool's enum enforces this at the boundary)
 * @param machineName - replacement for the preset's machine_name (always quoted)
 * @param roles - renames keyed by role; list slots need exactly their canonical count
 */
export declare function fslScaffold(preset: string, machineName?: string, roles?: ScaffoldRoles): ScaffoldResult;
//# sourceMappingURL=scaffold.d.ts.map