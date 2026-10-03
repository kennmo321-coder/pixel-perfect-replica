// Pixel avatar: stored as a tiny JSON of part ids, drawn procedurally onto a 48x48 grid.
export type Archetype = "elder" | "clerk" | "psycho" | "gymbro";
export type AvatarData = {
  archetype: Archetype;
  skin: number;
  hair: number;
  eyes: number;
  acc: number;
  aura: number;
};

export const ARCHETYPES: { id: Archetype; name: string; blurb: string }[] = [
  { id: "elder", name: "The Green Elder", blurb: "Has seen worse." },
  { id: "clerk", name: "Sigma Tentacle Clerk", blurb: "Deadpan. Unimpressed." },
  { id: "psycho", name: "The Suit Psycho", blurb: "Lets see your card." },
  { id: "gymbro", name: "Gym Bro", blurb: "Never skips jaw day." },
];

export const SKINS = ["#7cc46a", "#8ec9c0", "#f1c7a3", "#d39a6a", "#8d5a3b", "#5a3a28"];
export const SKIN_SHADE = ["#4e8f45", "#5e9a92", "#c99a78", "#a8714a", "#643c25", "#3c2619"];
export const HAIRS = ["None", "Slick", "Antennae", "Buzz", "Mohawk"];
export const EYES = ["Stern", "Half-lid", "Wide"];
export const ACCS = ["None", "Shades", "Scar", "Gold tooth", "Chain"];
export const AURAS = [
  { name: "Elder Green", color: "#6dff7a" },
  { name: "Cold Teal", color: "#5ff0ff" },
  { name: "Blood Red", color: "#ff3b3b" },
  { name: "Gold", color: "#ffd23f" },
  { name: "Sunset", color: "#ff8a2a" },
];

export const PRESETS: Record<Archetype, AvatarData> = {
  elder: { archetype: "elder", skin: 0, hair: 2, eyes: 0, acc: 0, aura: 0 },
  clerk: { archetype: "clerk", skin: 1, hair: 0, eyes: 1, acc: 0, aura: 1 },
  psycho: { archetype: "psycho", skin: 2, hair: 1, eyes: 2, acc: 0, aura: 2 },
  gymbro: { archetype: "gymbro", skin: 3, hair: 3, eyes: 0, acc: 4, aura: 3 },
};

export function randomAvatar(): AvatarData {
  const arc = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)]?.id ?? "elder";
  const r = (n: number) => Math.floor(Math.random() * n);
  return { ...PRESETS[arc], acc: r(ACCS.length), aura: r(AURAS.length) };
}

export type PoseState = "idle" | "locked" | "win" | "lose" | "attack" | "hit";

/** Draws avatar at (ox, oy) on a 48x48 grid. frame drives the 4-frame mewing loop. */
export function drawAvatar(c: CanvasRenderingContext2D, a: AvatarData, ox: number, oy: number, frame: number, pose: PoseState) {
  const p = (x: number, y: number, w: number, h: number, col: string) => {
    c.fillStyle = col;
    c.fillRect(ox + x, oy + y, w, h);
  };
  const skin = SKINS[a.skin] ?? "#f1c7a3";
  const shade = SKIN_SHADE[a.skin] ?? "#c99a78";
  const ink = "#1a0f0a";
  const f = frame % 4;

  // Clothing
  const cloth: Record<Archetype, () => void> = {
    elder: () => { p(4, 38, 40, 10, "#f2ede0"); p(14, 38, 20, 10, "#5b3d8c"); p(4, 38, 4, 10, "#d8d0bc"); p(40, 38, 4, 10, "#d8d0bc"); },
    clerk: () => { p(10, 39, 28, 9, "#a9744a"); p(22, 39, 4, 2, "#c43030"); p(23, 41, 2, 5, "#c43030"); },
    psycho: () => { p(6, 38, 36, 10, "#3b3f4a"); p(19, 38, 10, 10, "#f4f4f0"); p(23, 39, 2, 9, "#b0151d"); p(19, 38, 3, 6, "#2a2d36"); p(26, 38, 3, 6, "#2a2d36"); },
    gymbro: () => { p(8, 39, 32, 9, skin); p(16, 39, 16, 9, "#2a2a2a"); p(14, 41, 2, 7, shade); p(32, 41, 2, 7, shade); },
  };
  cloth[a.archetype]();

  // Neck
  p(19, 32, 10, 7, shade);

  const tall = a.archetype === "clerk";
  const hx = tall ? 15 : 13, hw = tall ? 18 : 22, hy = tall ? 2 : 8, hh = tall ? 30 : 24;
  // Head
  p(hx, hy, hw, hh, skin);
  p(hx + 1, hy + hh, hw - 2, 2, skin); // jaw
  // Mewing jaw highlight pulse
  if (f === 1 || f === 2) p(hx + 2, hy + hh, hw - 4, 1, shade);
  p(hx, hy + hh - 4, 1, 4, shade);
  p(hx + hw - 1, hy + hh - 4, 1, 4, shade);

  // Ears
  if (a.archetype === "elder") {
    p(9, 15, 4, 3, skin); p(10, 18, 3, 3, skin);
    p(35, 15, 4, 3, skin); p(35, 18, 3, 3, skin);
  } else {
    p(hx - 2, 19, 2, 5, shade); p(hx + hw, 19, 2, 5, shade);
  }

  // Hair
  const hair = a.hair;
  if (hair === 1) { p(hx, hy - 2, hw, 5, "#1b1410"); p(hx + hw - 6, hy - 3, 6, 2, "#1b1410"); }
  if (hair === 2) { p(19, hy - 5, 1, 5, skin); p(18, hy - 6, 2, 1, skin); p(28, hy - 5, 1, 5, skin); p(28, hy - 6, 2, 1, skin); }
  if (hair === 3) p(hx, hy - 1, hw, 3, "#3a2a20");
  if (hair === 4) p(hx + hw / 2 - 2, hy - 5, 4, 7, "#e6492d");

  const lock = pose === "locked" || pose === "win" || pose === "attack";
  const eyeY = tall ? 14 : 18;
  // Brows
  const by = eyeY - 3 + (lock ? 1 : pose === "hit" ? -1 : 0);
  if (pose === "attack") {
    // Fierce slanted battle brows
    p(hx + 3, by - 1, 6, 1, ink);
    p(hx + 7, by, 3, 2, ink);
    p(hx + hw - 9, by, 6, 1, ink);
    p(hx + hw - 10, by, 3, 2, ink);
  } else if (pose === "hit") {
    // Raised pained brows
    p(hx + 3, by, 6, 1, ink);
    p(hx + hw - 9, by, 6, 1, ink);
  } else {
    p(hx + 3, by, 6, 1, ink);
    p(hx + hw - 9, by, 6, 1, ink);
    if (lock) { p(hx + 8, by + 1, 1, 1, ink); p(hx + hw - 9, by + 1, 1, 1, ink); }
  }

  // Eyes
  const twitch = f === 3 && pose === "idle";
  const drawEye = (x: number) => {
    if (a.acc === 1) return;
    if (pose === "hit") {
      // Wincing eyes (shut tight line)
      p(x, eyeY + 1, 5, 1, ink);
      return;
    }
    const squint = lock || a.eyes === 1;
    p(x, eyeY, 5, squint ? 1 : 3, "#ffffff");
    p(x + (twitch ? 1 : 2), eyeY + (squint ? 0 : 1), 2, squint ? 1 : 2, ink);
    if (a.eyes === 2 && !squint) p(x, eyeY - 1, 5, 1, "#ffffff");
  };
  drawEye(hx + 3);
  drawEye(hx + hw - 8);
  if (a.acc === 1) { p(hx + 2, eyeY - 1, hw - 4, 4, ink); p(hx + 4, eyeY, 2, 1, "#6a6a8a"); p(hx + hw - 8, eyeY, 2, 1, "#6a6a8a"); }

  // Nose
  if (tall) { p(21, eyeY + 2, 6, 10, shade); p(20, eyeY + 9, 8, 4, skin); p(21, eyeY + 12, 6, 1, shade); }
  else p(23, eyeY + 4, 2, 4, shade);

  // Mouth
  const my = tall ? hy + hh - 4 : hy + hh - 6;
  if (pose === "attack") {
    // Battle shout / fierce grin
    p(20, my - 2, 8, 4, ink);
    p(21, my - 1, 6, 2, "#ffffff"); // teeth
  } else if (pose === "hit") {
    // Grimacing open mouth
    p(21, my - 1, 6, 3, ink);
    p(22, my, 4, 1, shade);
  } else if (pose === "win") { p(20, my, 8, 1, ink); p(27, my - 1, 2, 1, ink); }
  else if (pose === "lose") { p(21, my, 6, 1, ink); p(20, my + 1, 1, 1, ink); p(27, my + 1, 1, 1, ink); }
  else if (a.archetype === "psycho") { p(19, my, 10, 1, ink); p(18, my - 1, 1, 1, ink); p(29, my - 1, 1, 1, ink); }
  else p(21, my, 6, 1, ink);
  if (a.acc === 3) p(25, my, 2, 1, "#ffd23f");

  // Scar / chain
  if (a.acc === 2) { p(hx + hw - 7, eyeY - 4, 1, 1, "#b02020"); p(hx + hw - 6, eyeY - 3, 1, 1, "#b02020"); p(hx + hw - 5, eyeY + 4, 1, 1, "#b02020"); p(hx + hw - 4, eyeY + 5, 1, 1, "#b02020"); }
  if (a.acc === 4) { p(16, 37, 16, 1, "#ffd23f"); p(18, 38, 12, 1, "#ffd23f"); p(23, 39, 2, 2, "#ffd23f"); }
}
