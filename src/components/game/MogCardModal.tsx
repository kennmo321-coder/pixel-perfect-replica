import { useEffect, useRef, useState } from "react";
import { drawAvatar, AURAS, ARCHETYPES, type AvatarData } from "@/game/avatar";

type Props = {
  avatar: AvatarData;
  level: number;
  avgTimeMs: number;
  damageDealt: number;
  won: boolean;
  onClose: () => void;
};

export function MogCardModal({ avatar, level, avgTimeMs, damageDealt, won, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 620;
    const H = 380;
    canvas.width = W;
    canvas.height = H;

    // Background: Dark sunset gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#2c1810");
    grad.addColorStop(0.5, "#4a2416");
    grad.addColorStop(1, "#180c08");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Gold/accent pixel border
    ctx.strokeStyle = won ? "#ffd23f" : "#ff3b3b";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, W - 6, H - 6);

    ctx.strokeStyle = "#100604";
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, W - 16, H - 16);

    // Left card panel for Avatar
    ctx.fillStyle = "#1a0d08";
    ctx.fillRect(20, 20, 210, 340);
    ctx.strokeStyle = "#ffd23f";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 210, 340);

    // Draw Avatar & Aura on Left Panel
    const auraColor = AURAS[avatar.aura]?.color ?? "#ffd23f";
    ctx.fillStyle = auraColor;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(35, 75, 180, 180);
    ctx.globalAlpha = 1;

    // Render scaled avatar
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // Scale 3x on canvas
    ctx.translate(35, 65);
    ctx.scale(3.2, 3.2);
    drawAvatar(ctx, avatar, 4, 8, 1, won ? "win" : "lose");
    ctx.restore();

    // Right side: Stats & Mogging Trophy
    const arc = ARCHETYPES.find((a) => a.id === avatar.archetype) ?? ARCHETYPES[0]!;

    ctx.fillStyle = won ? "#ffd23f" : "#ff4444";
    ctx.font = 'bold 20px "Press Start 2P", monospace';
    ctx.fillText(won ? "MOGGED TO OBLIVION" : "HEAVY CASUALTY", 250, 58);

    ctx.fillStyle = "#ffffff";
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillText(arc.name.toUpperCase(), 250, 95);

    ctx.fillStyle = "#a89f91";
    ctx.font = '11px "Press Start 2P", monospace';
    ctx.fillText(`"${arc.blurb}"`, 250, 120);

    // Divider line
    ctx.fillStyle = "#ff8a2a";
    ctx.fillRect(250, 138, 340, 2);

    // Stats Grid
    const statY = 175;
    const gap = 32;

    const stats = [
      { label: "RANK LEVEL", val: `LV. ${level}` },
      { label: "STRIKE SPEED", val: avgTimeMs ? `${(avgTimeMs / 1000).toFixed(2)}s` : "0.95s" },
      { label: "TOTAL DAMAGE", val: `${damageDealt} DMG` },
      { label: "AURA STATUS", val: won ? "TOP 1% MOGGER" : "RECHARGING" },
    ];

    stats.forEach((st, i) => {
      ctx.fillStyle = "#8a7d6e";
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillText(st.label, 250, statY + i * gap);

      ctx.fillStyle = won ? "#ffd23f" : "#f1f1f1";
      ctx.font = '11px "Press Start 2P", monospace';
      ctx.fillText(st.val, 420, statY + i * gap);
    });

    // Footer Watermark
    ctx.fillStyle = "#ffd23f";
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillText("⚔ AURA DUEL · moggfight", 250, 340);
  }, [avatar, level, avgTimeMs, damageDealt, won]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `aura-duel-mog-card-lv${level}.png`;
    a.click();
  };

  const handleCopy = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch {
      handleDownload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="flex flex-col items-center gap-4 bg-letterbox p-6 border-4 border-accent shadow-pixel max-w-2xl w-full">
        <h2 className="font-display text-sm md:text-base text-accent">
          📸 OFFICIAL MOG CARD
        </h2>

        {/* Canvas Display */}
        <canvas
          ref={canvasRef}
          className="w-full max-w-[560px] h-auto border-2 border-border shadow-pixel pixelated"
        />

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          <button className="btn-pixel text-xs py-1.5 px-4" onClick={handleDownload}>
            💾 Download Image
          </button>
          <button className="btn-pixel text-xs py-1.5 px-4 bg-accent text-accent-foreground" onClick={handleCopy}>
            {copied ? "✓ Copied to Clipboard!" : "📋 Copy Card"}
          </button>
          <button className="btn-ghost text-xs py-1.5 px-4" onClick={onClose}>
            ✕ Close
          </button>
        </div>
      </div>
    </div>
  );
}
