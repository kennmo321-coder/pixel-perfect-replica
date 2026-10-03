// Prototype audio: Web Audio synth blips + Web Speech voice stingers (placeholder for licensed clips).
let ctx: AudioContext | null = null;
let muted = false;

export const setMuted = (m: boolean) => { muted = m; if (m && typeof speechSynthesis !== "undefined") speechSynthesis.cancel(); };
export const isMuted = () => muted;

function ac() {
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function unlockAudio() { try { ac(); } catch { /* noop */ } }

export function tone(freq: number, dur = 0.08, type: OscillatorType = "square", vol = 0.06, slide = 0) {
  if (muted) return;
  try {
    const a = ac();
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, a.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), a.currentTime + dur);
    g.gain.setValueAtTime(vol, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g).connect(a.destination);
    o.start();
    o.stop(a.currentTime + dur);
  } catch { /* noop */ }
}

export const sfx = {
  key: () => tone(900 + Math.random() * 200, 0.03, "square", 0.03),
  wrong: () => tone(120, 0.15, "sawtooth", 0.07),
  heartbeat: () => { tone(60, 0.12, "sine", 0.25, -20); setTimeout(() => tone(55, 0.1, "sine", 0.18, -20), 140); },
  flash: () => tone(1400, 0.25, "triangle", 0.08, -1000),
  win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.15, "square", 0.06), i * 90)),
  lose: () => [400, 300, 200].forEach((f, i) => setTimeout(() => tone(f, 0.2, "sawtooth", 0.05), i * 120)),
  boom: () => tone(90, 0.6, "sine", 0.35, -60),
  hit: () => { tone(280, 0.08, "triangle", 0.2, -180); setTimeout(() => tone(140, 0.1, "sawtooth", 0.15, -60), 30); },
  heavyHit: () => { tone(180, 0.15, "sawtooth", 0.3, -120); tone(80, 0.3, "sine", 0.4, -40); },
  crit: () => {
    tone(880, 0.08, "square", 0.15);
    setTimeout(() => tone(1320, 0.12, "triangle", 0.2), 60);
    setTimeout(() => tone(120, 0.25, "sawtooth", 0.3, -80), 120);
  },
  heal: () => [587, 740, 880, 1174].forEach((f, i) => setTimeout(() => tone(f, 0.08, "sine", 0.1), i * 50)),
  shield: () => { tone(1200, 0.05, "triangle", 0.12, -400); setTimeout(() => tone(600, 0.08, "square", 0.08, -200), 40); },
  stun: () => [220, 330, 220, 440].forEach((f, i) => setTimeout(() => tone(f, 0.04, "sawtooth", 0.12), i * 40)),
  coin: () => { tone(987, 0.08, "square", 0.1); setTimeout(() => tone(1318, 0.2, "square", 0.12), 80); },
};

export function voice(text: string) {
  if (muted || typeof speechSynthesis === "undefined") return;
  const u = new SpeechSynthesisUtterance(text);
  u.pitch = 0.2;
  u.rate = 0.9;
  u.volume = 1;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

export const START_LINES = ["Eat this", "Sigma", "Aura", "Lock in", "Oh yeah"];
export const WIN_LINES = ["Mogged", "Skill issue", "Aura plus one thousand"];
