import { useEffect, useRef } from "react";
import { AURAS, drawAvatar, type AvatarData, type PoseState } from "@/game/avatar";

type Props = {
  avatar: AvatarData;
  pose?: PoseState;
  intensity?: number; // 0..1 aura strength
  pulse?: number; // increment on correct key
  shudder?: number; // increment on wrong key
  mirror?: boolean;
  className?: string;
};

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; s: number };
const W = 72, H = 72;

/** Canvas sprite + pixel aura particle system (object-pooled). */
export function Fighter({ avatar, pose = "idle", intensity = 0.3, pulse = 0, shudder = 0, mirror, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef({ avatar, pose, intensity, burst: 0, shake: 0 });
  live.current.avatar = avatar;
  live.current.pose = pose;
  live.current.intensity = intensity;

  useEffect(() => { if (pulse) live.current.burst = 1; }, [pulse]);
  useEffect(() => { if (shudder) live.current.shake = 8; }, [shudder]);

  useEffect(() => {
    const c = ref.current!.getContext("2d")!;
    const pool: Particle[] = Array.from({ length: 160 }, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, s: 1 }));
    let raf = 0, t = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(50, now - last); last = now; t += dt;
      const L = live.current;
      const color = AURAS[L.avatar.aura]?.color ?? "#ffd23f";
      let inten = L.pose === "win" ? 1.3 : L.pose === "attack" ? 1.5 : L.pose === "lose" ? (Math.random() < 0.15 ? 0.3 : 0) : L.intensity;
      inten += L.burst * 0.8;
      L.burst = Math.max(0, L.burst - dt / 200);
      c.clearRect(0, 0, W, H);

      // Glow
      if (inten > 0.05) {
        c.globalAlpha = Math.min(0.3, inten * 0.18);
        c.fillStyle = color;
        const g = 6 + inten * 8;
        c.fillRect(12 - g / 2, 14 - g / 2, 48 + g, 50 + g);
        c.globalAlpha = 1;
      }
      // Spawn aura particles
      const spawn = Math.floor(inten * 4 + Math.random());
      for (let i = 0; i < spawn; i++) {
        const p = pool.find((q) => q.life <= 0);
        if (!p) break;
        p.x = 14 + Math.random() * 44; p.y = 50 + Math.random() * 20;
        p.vx = (Math.random() - 0.5) * 0.02; p.vy = -(0.02 + Math.random() * 0.05) * (1 + inten);
        p.max = p.life = 500 + Math.random() * 700; p.s = Math.random() < 0.35 ? 2 : 1;
      }
      c.fillStyle = color;
      for (const p of pool) {
        if (p.life <= 0) continue;
        p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
        c.globalAlpha = Math.max(0, p.life / p.max);
        c.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
      }
      c.globalAlpha = 1;

      const frame = Math.floor(t / 166); // ~6fps mewing loop
      let sx = 0;
      if (L.shake > 0) { sx = (L.shake % 2 ? 1 : -1) * Math.min(4, Math.ceil(L.shake / 2)); L.shake -= dt / 15; }
      
      // Dynamic combat lunge / recoil
      const lean = L.pose === "attack" ? 11 : L.pose === "hit" ? -7 : L.pose === "locked" ? 3 : L.pose === "win" ? 4 : 0;
      const vertOffset = L.pose === "lose" ? 3 : L.pose === "attack" ? -1 : 0;

      // Draw avatar
      drawAvatar(c, L.avatar, 12 + sx + lean, 22 + vertOffset, frame, L.pose);

      // Attack shockwave slash effect
      if (L.pose === "attack") {
        c.fillStyle = "#ffffff";
        c.fillRect(52, 26, 6, 2);
        c.fillRect(56, 28, 8, 3);
        c.fillRect(54, 31, 10, 2);
        c.fillRect(50, 33, 6, 2);
        c.fillStyle = color;
        c.fillRect(58, 27, 4, 5);
      }

      // Hit spark effect
      if (L.pose === "hit") {
        c.fillStyle = "#ff4444";
        c.fillRect(20, 24, 3, 3);
        c.fillRect(28, 20, 4, 4);
        c.fillRect(36, 26, 3, 3);
        c.fillStyle = "#ffffff";
        c.fillRect(29, 21, 2, 2);
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      className={`pixelated ${pose === "lose" ? "grayscale-[0.8]" : ""} ${className ?? ""}`}
      style={{ transform: mirror ? "scaleX(-1)" : undefined }}
    />
  );
}
