/**
 * The scaffold preset registry: which presets exist, their family, their
 * renamable role slots (with canonical names as authored in the .fsl
 * sources), and the teaching notes returned alongside each scaffold.
 * Adding a chart family later = a new .fsl file + one entry here.
 *
 * @see ./scaffold.js for the substitution logic that consumes this.
 */
/** One renamable slot in a preset: a state, an action label, or a fixed-arity state list. */
export type RoleSlot = {
    role: string;
    kind: 'state' | 'action';
    canonical: string;
} | {
    role: string;
    kind: 'stateList';
    canonical: readonly string[];
};
/** A registry entry: family grouping, canonical machine name, slots, notes. */
export interface PresetDef {
    family: string;
    machineName: string;
    slots: readonly RoleSlot[];
    notes: readonly string[];
}
/** All preset definitions, keyed by preset id. */
export declare const SCAFFOLD_REGISTRY: Record<string, PresetDef>;
/** Preset ids in stable sorted order; the tool's input enum derives from this. */
export declare const PRESET_IDS: readonly string[];
//# sourceMappingURL=scaffold-registry.d.ts.map