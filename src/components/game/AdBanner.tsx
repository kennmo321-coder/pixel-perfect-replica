import { useEffect, useState } from "react";

/**
 * Slim, barely noticeable horizontal ad banner stripe.
 * Designed to fit seamlessly into the retro pixel aesthetic.
 *
 * To integrate real Google AdSense or another ad provider:
 * 1. Place your AdSense script in index.html or __root.tsx.
 * 2. Replace the fallback rotating ad line with your <ins className="adsbygoogle" ... /> tag.
 */

const SAMPLE_ADS = [
  { text: "⚡ Boost typing speed with Mechanical Keyboards · 15% OFF", link: "#" },
  { text: "🏆 Level Up Your Aura · Join the Discord Community", link: "#" },
  { text: "🎮 Pixel Art Game Assets CC0 · Free Download", link: "#" },
  { text: "☕ Support Aura Duel Developer · Buy Us A Coffee", link: "#" },
];

export function AdBanner() {
  const [adIndex, setAdIndex] = useState(0);

  // Subtle rotation every 20 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setAdIndex((prev) => (prev + 1) % SAMPLE_ADS.length);
    }, 20000);
    return () => clearInterval(timer);
  }, []);

  const currentAd = SAMPLE_ADS[adIndex] ?? SAMPLE_ADS[0]!;

  return (
    <div
      className="w-full h-7 bg-letterbox/95 border-b border-border/40 flex items-center justify-between px-3 text-[0.6rem] font-display text-muted-foreground select-none z-50 overflow-hidden"
      style={{ letterSpacing: "0.02em" }}
    >
      {/* Left: Tiny Ad Tag */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="bg-muted/60 text-muted-foreground px-1 py-0.2 text-[0.5rem] border border-border/30">
          AD
        </span>
      </div>

      {/* Center: Ad Message / Ad Network Container */}
      <div className="flex-1 text-center truncate px-2">
        <a
          href={currentAd.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground/80 hover:text-accent transition-colors truncate inline-block"
        >
          {currentAd.text}
        </a>
      </div>

      {/* Right: Small indicator */}
      <div className="flex-shrink-0 text-[0.55rem] text-muted-foreground/40 hidden sm:block">
        sponsored
      </div>
    </div>
  );
}
