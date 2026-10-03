// Word pool config. Each entry: text + level range. Difficulty is computed, not hand-set.
export type Word = { text: string; level_min: number; level_max: number };

const T1 = ["rizz", "mew", "aura", "mog", "cope", "based", "chad", "vibe", "goat", "drip", "bruh", "yeet"];
const T2 = ["sigma", "mogging", "mewing", "looksmax", "grindset", "jawline", "rizzler", "locked", "unbothered", "delulu"];
const T3 = ["eat this", "Oh Yeah", "stay mad", "skill issue", "Aura Farm", "Mog Diff", "Lock In", "no cap fr"];
const T4 = ["Sigma_Grindset99", "TOP 1% mogger", "+1000 Aura", "Mewing 24/7", "Jaw#Locked", "Rizz_Lvl.99"];
const T5 = ["Unbothered & Moisturized!", "Sigma-Mode: 100% Locked", "Mog_Diff = Skill_Issue", "Aura++ (x9000) GG"];

export const WORDS: Word[] = [
  ...T1.map((text) => ({ text, level_min: 1, level_max: 10 })),
  ...T2.map((text) => ({ text, level_min: 11, level_max: 25 })),
  ...T3.map((text) => ({ text, level_min: 26, level_max: 50 })),
  ...T4.map((text) => ({ text, level_min: 51, level_max: 75 })),
  ...T5.map((text) => ({ text, level_min: 76, level_max: 100 })),
];

/** Measurable difficulty: length, char variety, shift, digits, symbols. */
export function difficulty(text: string): number {
  let s = text.length;
  s += new Set(text.toLowerCase()).size * 0.5;
  for (const ch of text) {
    if (/[A-Z]/.test(ch)) s += 1;
    else if (/[0-9]/.test(ch)) s += 1.5;
    else if (/[^a-z ]/i.test(ch)) s += 2;
  }
  return Math.round(s * 10) / 10;
}

/** Rounds 2-3 pull from the upper half of the level's difficulty range. */
export function pickWord(level: number, round: number, avoid?: string): string {
  const pool = WORDS.filter((w) => level >= w.level_min && level <= w.level_max)
    .map((w) => w.text)
    .sort((a, b) => difficulty(a) - difficulty(b));
  const half = Math.floor(pool.length / 2);
  const slice = round >= 2 ? pool.slice(half) : pool;
  const opts = slice.filter((w) => w !== avoid);
  return opts[Math.floor(Math.random() * opts.length)] ?? pool[0] ?? "mew";
}
