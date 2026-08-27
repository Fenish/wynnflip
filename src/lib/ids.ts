/**
 * Identification keys, as the game writes them.
 *
 * The API hands back `healthRegenRaw` and `2ndSpellCost`; nobody reads an item
 * card that way. Each entry carries the in-game label, the unit (Wynncraft's
 * rule is that a `raw` prefix means a flat number and everything else is a
 * percentage), and whether a bigger number is actually better - spell cost is
 * the exception where a negative value is the good one, so sign alone cannot
 * decide the colour.
 */
export interface IdMeta {
 label: string;
 /** '%' or a flat suffix like '/3s'; empty for a bare number. */
 unit: string;
 /** false when a lower number is the desirable one. */
 higherIsBetter: boolean;
}

const PCT = { unit: "%", higherIsBetter: true };
const FLAT = { unit: "", higherIsBetter: true };

export const IDS: Record<string, IdMeta> = {
 // skill points and pools
 rawStrength: { label: "Strength", ...FLAT },
 rawDexterity: { label: "Dexterity", ...FLAT },
 rawIntelligence: { label: "Intelligence", ...FLAT },
 rawDefence: { label: "Defence", ...FLAT },
 rawAgility: { label: "Agility", ...FLAT },
 rawHealth: { label: "Health", ...FLAT },
 rawMaxMana: { label: "Max Mana", ...FLAT },

 // sustain
 healthRegen: { label: "Health Regen", ...PCT },
 healthRegenRaw: { label: "Health Regen", unit: "/4s", higherIsBetter: true },
 manaRegen: { label: "Mana Regen", unit: "/5s", higherIsBetter: true },
 manaSteal: { label: "Mana Steal", unit: "/3s", higherIsBetter: true },
 lifeSteal: { label: "Life Steal", unit: "/3s", higherIsBetter: true },
 healingEfficiency: { label: "Healing Efficiency", ...PCT },

 // damage, percentage form
 damage: { label: "Damage", ...PCT },
 mainAttackDamage: { label: "Main Attack Damage", ...PCT },
 spellDamage: { label: "Spell Damage", ...PCT },
 elementalDamage: { label: "Elemental Damage", ...PCT },
 elementalSpellDamage: { label: "Elemental Spell Damage", ...PCT },
 neutralDamage: { label: "Neutral Damage", ...PCT },
 earthDamage: { label: "Earth Damage", ...PCT },
 thunderDamage: { label: "Thunder Damage", ...PCT },
 waterDamage: { label: "Water Damage", ...PCT },
 fireDamage: { label: "Fire Damage", ...PCT },
 airDamage: { label: "Air Damage", ...PCT },
 earthSpellDamage: { label: "Earth Spell Damage", ...PCT },
 thunderSpellDamage: { label: "Thunder Spell Damage", ...PCT },
 waterSpellDamage: { label: "Water Spell Damage", ...PCT },
 fireSpellDamage: { label: "Fire Spell Damage", ...PCT },
 airSpellDamage: { label: "Air Spell Damage", ...PCT },
 earthMainAttackDamage: { label: "Earth Main Attack Damage", ...PCT },
 waterMainAttackDamage: { label: "Water Main Attack Damage", ...PCT },

 // damage, flat form
 rawMainAttackDamage: { label: "Main Attack Damage", ...FLAT },
 rawSpellDamage: { label: "Spell Damage", ...FLAT },
 rawNeutralDamage: { label: "Neutral Damage", ...FLAT },
 rawEarthDamage: { label: "Earth Damage", ...FLAT },
 rawThunderDamage: { label: "Thunder Damage", ...FLAT },
 rawWaterDamage: { label: "Water Damage", ...FLAT },
 rawFireDamage: { label: "Fire Damage", ...FLAT },
 rawAirDamage: { label: "Air Damage", ...FLAT },
 rawEarthSpellDamage: { label: "Earth Spell Damage", ...FLAT },
 rawThunderSpellDamage: { label: "Thunder Spell Damage", ...FLAT },
 rawWaterSpellDamage: { label: "Water Spell Damage", ...FLAT },
 rawFireSpellDamage: { label: "Fire Spell Damage", ...FLAT },
 rawAirSpellDamage: { label: "Air Spell Damage", ...FLAT },
 rawEarthMainAttackDamage: { label: "Earth Main Attack Damage", ...FLAT },
 rawThunderMainAttackDamage: { label: "Thunder Main Attack Damage", ...FLAT },
 rawWaterMainAttackDamage: { label: "Water Main Attack Damage", ...FLAT },
 rawFireMainAttackDamage: { label: "Fire Main Attack Damage", ...FLAT },
 rawAirMainAttackDamage: { label: "Air Main Attack Damage", ...FLAT },
 rawNeutralMainAttackDamage: { label: "Neutral Main Attack Damage", ...FLAT },

 // defence
 elementalDefence: { label: "Elemental Defence", ...PCT },
 earthDefence: { label: "Earth Defence", ...PCT },
 thunderDefence: { label: "Thunder Defence", ...PCT },
 waterDefence: { label: "Water Defence", ...PCT },
 fireDefence: { label: "Fire Defence", ...PCT },
 airDefence: { label: "Air Defence", ...PCT },
 thorns: { label: "Thorns", ...PCT },
 reflection: { label: "Reflection", ...PCT },

 // movement and utility
 walkSpeed: { label: "Walk Speed", ...PCT },
 sprint: { label: "Sprint", ...PCT },
 sprintRegen: { label: "Sprint Regen", ...PCT },
 jumpHeight: { label: "Jump Height", ...FLAT },
 rawAttackSpeed: { label: "Attack Speed", unit: " tier", higherIsBetter: true },
 mainAttackRange: { label: "Attack Range", ...PCT },
 knockback: { label: "Knockback", ...PCT },
 poison: { label: "Poison", unit: "/3s", higherIsBetter: true },
 exploding: { label: "Exploding", ...PCT },
 stealing: { label: "Stealing", ...PCT },

 // gathering and rewards
 lootBonus: { label: "Loot Bonus", ...PCT },
 lootQuality: { label: "Loot Quality", ...PCT },
 combatExperience: { label: "Combat XP Bonus", ...PCT },
 gatherXpBonus: { label: "Gathering XP Bonus", ...PCT },
 gatherSpeed: { label: "Gathering Speed", ...PCT },

 // the one where less is more
 "2ndSpellCost": { label: "2nd Spell Cost", unit: "%", higherIsBetter: false },
};

/** Falls back to spacing out the camelCase key rather than showing it raw. */
export function idMeta(key: string): IdMeta {
 return (
  IDS[key] ?? {
   label: key
    .replace(/^raw/, "")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim(),
   unit: key.startsWith("raw") ? "" : "%",
   higherIsBetter: true,
  }
 );
}

/** Ingredient effects that are not identifications. */
export const CONSUMABLE: Record<string, IdMeta> = {
 duration: { label: "Duration", unit: "s", higherIsBetter: true },
 charges: { label: "Charges", unit: "", higherIsBetter: true },
};
