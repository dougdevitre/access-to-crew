import type { KitItem } from './schema.js';

/**
 * Kit sizing is arithmetic, not AI: per-crew ratios per task profile.
 * Every item comes from the approved tools list (G2). Profiles line up with
 * data/tier0-tasks.seed.csv and TIER0_ELIGIBLE_CODES in the ingest job.
 */
const KIT_PROFILES: Record<string, ReadonlyArray<{ item: string; perCrew: number }>> = {
  alley_sweep: [
    { item: 'push broom', perCrew: 0.25 },
    { item: 'trash bag', perCrew: 3 },
    { item: 'flat shovel', perCrew: 0.25 },
    { item: 'litter grabber', perCrew: 0.5 },
    { item: 'work gloves', perCrew: 1 },
    { item: 'safety glasses', perCrew: 1 },
    { item: 'wheelbarrow', perCrew: 0.125 },
  ],
  lot_litter: [
    { item: 'litter grabber', perCrew: 1 },
    { item: 'trash bag', perCrew: 3 },
    { item: 'rubble bag', perCrew: 0.5 },
    { item: 'work gloves', perCrew: 1 },
    { item: 'safety glasses', perCrew: 1 },
  ],
  greening: [
    { item: 'leaf rake', perCrew: 0.5 },
    { item: 'hand loppers', perCrew: 0.25 },
    { item: 'hand shears', perCrew: 0.25 },
    { item: 'trowel', perCrew: 0.5 },
    { item: 'trash bag', perCrew: 2 },
    { item: 'work gloves', perCrew: 1 },
    { item: 'wheelbarrow', perCrew: 0.125 },
    { item: 'watering can', perCrew: 0.25 },
  ],
  glass_rubble: [
    { item: 'flat shovel', perCrew: 0.5 },
    { item: 'push broom', perCrew: 0.25 },
    { item: 'rubble bag', perCrew: 2 },
    { item: 'work gloves', perCrew: 1 },
    { item: 'safety glasses', perCrew: 1 },
    { item: 'wheelbarrow', perCrew: 0.25 },
  ],
  snow: [
    { item: 'snow shovel', perCrew: 0.5 },
    { item: 'work gloves', perCrew: 1 },
  ],
  indoor: [
    { item: 'work gloves', perCrew: 1 },
    { item: 'trash bag', perCrew: 1 },
  ],
};

// The ingest job maps "Weeds/High Grass" to this profile name.
KIT_PROFILES.sidewalk_clearing = KIT_PROFILES.greening!;

export type KitProfile = keyof typeof KIT_PROFILES;

/**
 * Size a kit for a crew. Quantities round up and never hit zero — a crew of
 * two still gets one of everything. Unknown profiles fall back to the
 * lot_litter kit rather than throwing mid-ingest.
 */
export function buildKit(profile: string, crewSize: number): KitItem[] {
  const spec = KIT_PROFILES[profile] ?? KIT_PROFILES.lot_litter!;
  return spec.map(({ item, perCrew }) => ({
    item,
    qty: Math.max(1, Math.ceil(perCrew * crewSize)),
  }));
}
