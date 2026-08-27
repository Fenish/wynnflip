export { stars } from "./tiers";

/**
 * The four gathering professions, in the words a player would use.
 *
 * "Mine Cinnabar Ingot" reads as an instruction; "mining / Cinnabar Ingot"
 * reads as a database row. The verb is the whole point.
 */
export const PROFESSIONS: Record<
 string,
 { verb: string; label: string; tone: string }
> = {
 mining: { verb: "Mine", label: "Mining", tone: "text-[#9db4d0]" },
 fishing: { verb: "Fish", label: "Fishing", tone: "text-[#6fc3d8]" },
 farming: { verb: "Harvest", label: "Farming", tone: "text-[#a8c46a]" },
 woodcutting: { verb: "Chop", label: "Woodcutting", tone: "text-[#c99a63]" },
};

export function profession(key: string) {
 return PROFESSIONS[key] ?? { verb: "Gather", label: key, tone: "text-muted" };
}

