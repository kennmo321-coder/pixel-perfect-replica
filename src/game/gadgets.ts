// Gadgets: purchasable items that give real mechanical advantages in combat.
// Players can equip up to 2 gadgets before a duel.

export type GadgetId = "chrono" | "power" | "shield" | "vampire" | "stun" | "focus";

export type GadgetEffect = {
  timeBonusSec?: number;      // negative = word appears earlier for you
  damageMultiplier?: number;  // >1 = more damage
  defenseMultiplier?: number; // <1 = take less damage
  lifestealPct?: number;      // fraction of damage dealt healed
  stunChance?: number;        // chance to delay opponent's next word
  stunDelaySec?: number;      // how long the stun lasts
  critChance?: number;        // chance for 2× damage
};

export type Gadget = {
  id: GadgetId;
  name: string;
  desc: string;
  icon: string;
  price: number;
  effect: GadgetEffect;
};

export const GADGETS: Gadget[] = [
  {
    id: "chrono",
    name: "Chrono Shift",
    desc: "−0.1 s word delay",
    icon: "⏱",
    price: 500,
    effect: { timeBonusSec: -0.1 },
  },
  {
    id: "power",
    name: "Power Gloves",
    desc: "+20% damage",
    icon: "🥊",
    price: 400,
    effect: { damageMultiplier: 1.2 },
  },
  {
    id: "shield",
    name: "Iron Shield",
    desc: "−15% incoming dmg",
    icon: "🛡",
    price: 450,
    effect: { defenseMultiplier: 0.85 },
  },
  {
    id: "vampire",
    name: "Vampiric Fangs",
    desc: "Heal 10% of dmg dealt",
    icon: "🧛",
    price: 600,
    effect: { lifestealPct: 0.1 },
  },
  {
    id: "stun",
    name: "Stun Pulse",
    desc: "15% stun on hit",
    icon: "⚡",
    price: 550,
    effect: { stunChance: 0.15, stunDelaySec: 0.4 },
  },
  {
    id: "focus",
    name: "Focus Lens",
    desc: "10% crit (2× dmg)",
    icon: "🎯",
    price: 350,
    effect: { critChance: 0.1 },
  },
];

export function getGadget(id: GadgetId): Gadget {
  return GADGETS.find((g) => g.id === id) ?? GADGETS[0]!;
}

/** Merge effects from multiple equipped gadgets into a single combined effect. */
export function mergeEffects(ids: GadgetId[]): GadgetEffect {
  const m: GadgetEffect = {};
  for (const id of ids) {
    const e = getGadget(id).effect;
    if (e.timeBonusSec) m.timeBonusSec = (m.timeBonusSec ?? 0) + e.timeBonusSec;
    if (e.damageMultiplier) m.damageMultiplier = (m.damageMultiplier ?? 1) * e.damageMultiplier;
    if (e.defenseMultiplier) m.defenseMultiplier = (m.defenseMultiplier ?? 1) * e.defenseMultiplier;
    if (e.lifestealPct) m.lifestealPct = (m.lifestealPct ?? 0) + e.lifestealPct;
    if (e.stunChance) { m.stunChance = (m.stunChance ?? 0) + e.stunChance; m.stunDelaySec = e.stunDelaySec; }
    if (e.critChance) m.critChance = (m.critChance ?? 0) + e.critChance;
  }
  return m;
}
