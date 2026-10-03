import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { randomAvatar, type AvatarData, type PoseState } from "@/game/avatar";
import { pickWord } from "@/game/words";
import { sfx, voice, START_LINES, WIN_LINES, isMuted, setMuted } from "@/game/audio";
import { GADGETS, getGadget, mergeEffects, type GadgetId } from "@/game/gadgets";
import { Fighter } from "./Fighter";
import { MogCardModal } from "./MogCardModal";

type Phase = "intro" | "stare" | "word" | "clash" | "matchEnd";
type Who = "p" | "b";
const BOT_NAMES = ["xX_MewLord_Xx", "JawlineJerry", "SigmaSteve", "AuraFarmer42", "CopeMaster"];

type FloatingText = {
  id: number;
  text: string;
  x: string;
  y: string;
  type: "damage" | "crit" | "heal" | "stun" | "block";
};

type Props = {
  avatar: AvatarData;
  level: number;
  equippedGadgets?: GadgetId[];
  onExit: () => void;
  onReward?: (coins: number, xp: number) => void;
};

export function Duel({ avatar, level, equippedGadgets = [], onExit, onReward }: Props) {
  // Bot setup with possible random gadget for higher levels
  const bot = useMemo(() => {
    const bg: GadgetId[] = level > 20 ? [GADGETS[Math.floor(Math.random() * GADGETS.length)]!.id] : [];
    return {
      avatar: randomAvatar(),
      name: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)] ?? "Bot",
      gadgets: bg,
    };
  }, [level]);

  const pEffects = useMemo(() => mergeEffects(equippedGadgets), [equippedGadgets]);
  const bEffects = useMemo(() => mergeEffects(bot.gadgets), [bot.gadgets]);

  const MAX_HP = 100;
  const [phase, setPhase] = useState<Phase>("intro");
  const [exchange, setExchange] = useState(1);
  const [hp, setHp] = useState({ p: MAX_HP, b: MAX_HP });
  const [exMeter, setExMeter] = useState({ p: 0, b: 0 }); // 0-100 Mewing Frenzy gauge
  const [playerPose, setPlayerPose] = useState<PoseState>("idle");
  const [botPose, setBotPose] = useState<PoseState>("idle");

  const [word, setWord] = useState("");
  const [wordVisible, setWordVisible] = useState(false);
  const [typed, setTyped] = useState("");
  const [botChars, setBotChars] = useState(0);
  const [falseStart, setFalseStart] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [shudder, setShudder] = useState(0);
  const [botPulse, setBotPulse] = useState(0);
  const [botShudder, setBotShudder] = useState(0);
  const [fx, setFx] = useState({ flash: 0, shake: 0 });
  const [muted, setMute] = useState(isMuted());
  const [times, setTimes] = useState<number[]>([]);
  const [floating, setFloating] = useState<FloatingText[]>([]);
  const [isBotStunned, setIsBotStunned] = useState(false);
  const [totalDamageDealt, setTotalDamageDealt] = useState(0);
  const [showMogCard, setShowMogCard] = useState(false);

  const phaseRef = useRef<Phase>("intro");
  const timers = useRef<number[]>([]);
  const revealAt = useRef(0);
  const falseRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hpRef = useRef(hp);
  hpRef.current = hp;
  const exRef = useRef(exMeter);
  exRef.current = exMeter;
  const floatId = useRef(1);

  const setP = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const clearAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearAll, []);

  const addFloat = (text: string, x: string, y: string, type: FloatingText["type"]) => {
    const id = floatId.current++;
    setFloating((f) => [...f, { id, text, x, y, type }]);
    setTimeout(() => {
      setFloating((f) => f.filter((item) => item.id !== id));
    }, 950);
  };

  // Attack execution when someone completes typing
  const executeAttack = useCallback(
    (attacker: Who) => {
      if (phaseRef.current !== "word") return;
      clearAll();
      setP("clash");

      const isPlayer = attacker === "p";
      const atkEffects = isPlayer ? pEffects : bEffects;
      const defEffects = isPlayer ? bEffects : pEffects;

      // Base damage calculation
      const elapsedSec = Math.max(0.3, (performance.now() - revealAt.current) / 1000);
      let dmg = 22 + Math.round(word.length * 1.5);
      if (elapsedSec < 1.3) dmg += 6; // Quick speed bonus!

      // EX Meter: Mewing Frenzy super multiplier
      const isFrenzy = exRef.current[attacker] >= 100;
      if (isFrenzy) {
        dmg = Math.round(dmg * 1.45);
      }

      // Danger Zone / Desperation bonus (< 25 HP)
      const currentAtkHp = hpRef.current[attacker];
      if (currentAtkHp < 25) {
        dmg = Math.round(dmg * 1.2);
      }

      // Gadget: Power gloves damage multiplier
      if (atkEffects.damageMultiplier) {
        dmg = Math.round(dmg * atkEffects.damageMultiplier);
      }

      // Gadget: Focus lens crit chance
      let isCrit = false;
      if (atkEffects.critChance && Math.random() < atkEffects.critChance) {
        dmg = Math.round(dmg * 2);
        isCrit = true;
      }

      // Defender Gadget: Iron shield defense multiplier
      if (defEffects.defenseMultiplier) {
        const reduced = Math.round(dmg * defEffects.defenseMultiplier);
        dmg = reduced;
      }

      // Apply damage to defender
      const target = isPlayer ? "b" : "p";
      const currentDefHp = hpRef.current[target];
      const newDefHp = Math.max(0, currentDefHp - dmg);

      if (isPlayer) {
        setTotalDamageDealt((prev) => prev + dmg);
      }

      // Gadget: Vampiric fangs lifesteal
      let healAmount = 0;
      if (atkEffects.lifestealPct && isPlayer) {
        healAmount = Math.max(1, Math.round(dmg * atkEffects.lifestealPct));
      }

      // Gadget: Stun pulse chance
      let causedStun = false;
      if (atkEffects.stunChance && Math.random() < atkEffects.stunChance) {
        causedStun = true;
      }

      // Visuals & SFX
      setFx((f) => ({ flash: f.flash + (isFrenzy ? 2 : 1), shake: f.shake + (isCrit || isFrenzy ? 2 : 1) }));
      if (isCrit || isFrenzy) {
        sfx.crit();
      } else if (defEffects.defenseMultiplier && Math.random() < 0.5) {
        sfx.shield();
      } else {
        sfx.hit();
      }

      // Update poses for fighting animation
      if (isPlayer) {
        setPlayerPose("attack");
        setBotPose("hit");
        setPulse((p) => p + 1);
        setBotShudder((s) => s + 1);
        setTimes((t) => [...t, performance.now() - revealAt.current]);

        if (isFrenzy) {
          addFloat("🔥 MEWING FRENZY!", "68%", "30%", "crit");
        }

        // Floating texts for bot
        addFloat(
          `-${dmg}${isCrit ? " CRIT!" : ""}`,
          "70%",
          "38%",
          isCrit || isFrenzy ? "crit" : "damage"
        );

        if (defEffects.defenseMultiplier) {
          addFloat("🛡 BLOCKED", "72%", "30%", "block");
        }

        if (healAmount > 0) {
          sfx.heal();
          addFloat(`+${healAmount} HP`, "25%", "35%", "heal");
        }

        if (causedStun) {
          sfx.stun();
          setIsBotStunned(true);
          addFloat("⚡ STUNNED!", "70%", "24%", "stun");
        }
      } else {
        // Bot attacked player
        setBotPose("attack");
        setPlayerPose("hit");
        setBotPulse((p) => p + 1);
        setShudder((s) => s + 1);

        if (isFrenzy) {
          addFloat("🔥 BOT FRENZY!", "25%", "30%", "crit");
        }

        addFloat(`-${dmg}`, "25%", "38%", "damage");
        if (pEffects.defenseMultiplier) {
          addFloat("🛡 SHIELDED", "25%", "30%", "block");
        }
      }

      // Update HP
      setHp((prev) => {
        const nextHp = { ...prev, [target]: newDefHp };
        if (healAmount > 0) {
          nextHp.p = Math.min(MAX_HP, nextHp.p + healAmount);
        }
        return nextHp;
      });

      // Update EX / Frenzy meter
      setExMeter((prev) => ({
        ...prev,
        [attacker]: isFrenzy ? 0 : Math.min(100, prev[attacker] + 35),
      }));

      // Check for K.O.
      if (newDefHp <= 0) {
        later(() => {
          setP("matchEnd");
          if (isPlayer) {
            setPlayerPose("win");
            setBotPose("lose");
            sfx.win();
            voice(WIN_LINES[Math.floor(Math.random() * WIN_LINES.length)] ?? "Mogged");
            onReward?.(150 + level * 5, 60 + level * 2);
          } else {
            setPlayerPose("lose");
            setBotPose("win");
            sfx.lose();
            onReward?.(30, 15);
          }
        }, 800);
      } else {
        // Next exchange
        later(() => {
          setPlayerPose("idle");
          setBotPose("idle");
          setExchange((e) => e + 1);
          startExchange(exchange + 1);
        }, 1100);
      }
    },
    [word, pEffects, bEffects, exchange, level, onReward]
  );

  const startExchange = useCallback(
    (ex: number) => {
      clearAll();
      const w = pickWord(level, ex, word);
      setWord(w);
      setTyped("");
      setBotChars(0);
      setWordVisible(false);
      setFalseStart(false);
      falseRef.current = false;
      setPlayerPose("idle");
      setBotPose("idle");
      setP("stare");

      setTimeout(() => inputRef.current?.focus(), 30);

      // Standoff delay (1.0 to 2.5s)
      const baseDelay = 1100 + Math.random() * 1500;
      let beatAt = 0,
        gap = 650;
      while (beatAt + gap < baseDelay) {
        const t = beatAt;
        later(() => sfx.heartbeat(), t);
        beatAt += gap;
        gap = Math.max(240, gap * 0.8);
      }

      later(() => {
        setP("word");
        setPlayerPose("locked");
        setBotPose("locked");
        setFx((f) => ({ ...f, flash: f.flash + 1 }));
        sfx.flash();
        voice(START_LINES[Math.floor(Math.random() * START_LINES.length)] ?? "Sigma");

        // GADGET ADVANTAGE: Chrono Shift gives negative word delay (-0.1s / -100ms)
        const chronoBonusMs = (pEffects.timeBonusSec ?? 0) * 1000;
        const penaltyMs = falseRef.current ? 400 : 0;
        const playerDelay = Math.max(0, penaltyMs + chronoBonusMs);

        revealAt.current = performance.now() + playerDelay;
        later(() => setWordVisible(true), playerDelay);

        // Bot typing simulation with human variance + stun effect
        const stunDelay = isBotStunned ? 450 : 0;
        setIsBotStunned(false);

        const cps = 3.2 + level / 28 + Math.random() * 1.0;
        let t = 320 + Math.random() * 250 + stunDelay;

        for (let i = 1; i <= w.length; i++) {
          t += (1000 / cps) * (0.65 + Math.random() * 0.7);
          if (Math.random() < 0.05) t += 300;
          const n = i;
          later(() => {
            if (phaseRef.current === "word") {
              setBotChars(n);
              setBotPulse((x) => x + 1);
              if (n === w.length) {
                executeAttack("b");
              }
            }
          }, t);
        }
      }, baseDelay);
    },
    [level, word, pEffects, isBotStunned, executeAttack]
  );

  const onInput = (v: string) => {
    const ph = phaseRef.current;
    if (ph === "stare") {
      if (!falseRef.current) {
        falseRef.current = true;
        setFalseStart(true);
        setShudder((s) => s + 1);
        sfx.wrong();
      }
      return;
    }
    if (ph !== "word" || !wordVisible) return;

    const prev = typed;
    setTyped(v);
    if (v.length > prev.length) {
      const ok = word.startsWith(v);
      if (ok) {
        setPulse((p) => p + 1);
        sfx.key();
      } else {
        setShudder((s) => s + 1);
        sfx.wrong();
      }
    }
    if (v === word) {
      if (performance.now() - revealAt.current < 120) return; // Reaction limit
      executeAttack("p");
    }
  };

  const correctLen = (() => {
    let i = 0;
    while (i < typed.length && typed[i] === word[i]) i++;
    return i;
  })();

  const won = hp.b <= 0;
  const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  const xpReward = won ? 60 + Math.round(30 - avg / 120) : 15;
  const coinsReward = won ? 150 + level * 4 : 40;
  const isDanger = hp.p < 25 || hp.b < 25;

  const dust = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        top: `${20 + Math.random() * 70}%`,
        dur: `${4 + Math.random() * 6}s`,
        delay: `${-Math.random() * 8}s`,
        key: i,
      })),
    []
  );

  return (
    <div
      className={`relative flex h-[100dvh] flex-col overflow-hidden bg-letterbox select-none ${
        isDanger ? "danger-overlay" : ""
      }`}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Letterbox Top */}
      <div className="z-20 flex h-[11vh] items-center justify-between px-4">
        <button
          className="btn-ghost"
          onClick={(e) => {
            e.stopPropagation();
            clearAll();
            onExit();
          }}
        >
          ◀ Retreat
        </button>

        <div className="font-display text-center text-[0.6rem] text-muted-foreground md:text-xs">
          CLASH #{exchange} · LV {level}
          {isDanger && <span className="text-destructive block text-[0.55rem] font-bold">⚠️ DANGER ZONE (+20% DMG)</span>}
        </div>

        <button
          className="btn-ghost"
          onClick={(e) => {
            e.stopPropagation();
            setMuted(!muted);
            setMute(!muted);
          }}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      {/* Main Fighting Arena */}
      <div
        key={`s${fx.shake}`}
        className={`relative flex-1 bg-sky grain overflow-hidden ${
          fx.shake ? "shake" : ""
        }`}
      >
        {dust.map((d) => (
          <span
            key={d.key}
            className="dust"
            style={{
              top: d.top,
              animationDuration: d.dur,
              animationDelay: d.delay,
            }}
          />
        ))}

        {/* Street Fighter Style Fighting Healthbars + EX Frenzy Gauges */}
        <div className="absolute inset-x-0 top-3 z-20 flex items-start justify-between px-3 md:px-12">
          {/* Player HP & EX Meter */}
          <HealthPlate
            name="YOU"
            hp={hp.p}
            maxHp={MAX_HP}
            exMeter={exMeter.p}
            right={false}
            gadgets={equippedGadgets}
          />

          {/* VS Badge */}
          <div className="mx-2 mt-1 flex flex-col items-center">
            <span
              className="font-display text-xs text-accent md:text-sm"
              style={{ textShadow: "2px 2px 0 var(--letterbox)" }}
            >
              VS
            </span>
          </div>

          {/* Bot HP & EX Meter */}
          <HealthPlate
            name={bot.name}
            hp={hp.b}
            maxHp={MAX_HP}
            exMeter={exMeter.b}
            right
            gadgets={bot.gadgets}
          />
        </div>

        {/* Floating Combat Text Popups */}
        {floating.map((f) => (
          <div
            key={f.id}
            className={`${
              f.type === "heal"
                ? "float-heal text-success"
                : f.type === "crit"
                ? "float-damage text-accent text-lg md:text-2xl crit-pulse"
                : f.type === "block"
                ? "float-heal text-blue-400 text-xs md:text-sm"
                : f.type === "stun"
                ? "float-heal text-yellow-300 text-xs md:text-sm"
                : "float-damage text-destructive text-base md:text-xl"
            }`}
            style={{ left: f.x, top: f.y }}
          >
            {f.text}
          </div>
        ))}

        {/* Fighters with dynamic attack/hit poses */}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between px-2 md:px-16 pointer-events-none">
          <Fighter
            avatar={avatar}
            pose={playerPose}
            intensity={0.3 + (1 - hp.p / MAX_HP) * 0.5 + (exMeter.p >= 100 ? 0.4 : 0)}
            pulse={pulse}
            shudder={shudder}
            className="h-[43vh] w-[43vh] max-w-[50vw] object-contain transition-transform duration-75"
          />
          <Fighter
            avatar={bot.avatar}
            pose={botPose}
            intensity={0.3 + (1 - hp.b / MAX_HP) * 0.5 + (exMeter.b >= 100 ? 0.4 : 0)}
            pulse={botPulse}
            shudder={botShudder}
            mirror
            className="h-[43vh] w-[43vh] max-w-[50vw] object-contain transition-transform duration-75"
          />
        </div>

        {/* Center Prompt & Words */}
        <div className="absolute inset-x-0 top-[23%] z-10 flex flex-col items-center px-4 text-center">
          {phase === "intro" && (
            <div className="flex flex-col items-center gap-3">
              <p
                className="font-display text-sm text-accent md:text-lg"
                style={{ textShadow: "3px 3px 0 var(--letterbox)" }}
              >
                BATTLE TYPER · HEALTHBAR FIGHT
              </p>
              <p className="text-xl md:text-2xl">Type words fast to strike and KO your foe!</p>
              {equippedGadgets.length > 0 && (
                <div className="flex items-center gap-2 bg-letterbox/80 px-3 py-1 border border-accent">
                  <span className="text-xs text-accent">Active Gadgets:</span>
                  {equippedGadgets.map((g) => (
                    <span key={g} className="text-xs text-white" title={getGadget(g).desc}>
                      {getGadget(g).icon} {getGadget(g).name} ({getGadget(g).desc})
                    </span>
                  ))}
                </div>
              )}
              <button
                className="btn-pixel mt-2"
                onClick={(e) => {
                  e.stopPropagation();
                  startExchange(1);
                }}
              >
                ⚔ Fight!
              </button>
            </div>
          )}

          {phase === "stare" && (
            <div className="flex flex-col items-center">
              <p
                className={`font-display text-xs md:text-sm ${
                  falseStart ? "text-destructive" : "text-foreground blink"
                }`}
              >
                {falseStart ? "FALSE START! +0.4s" : "STANDOFF..."}
              </p>
              {pEffects.timeBonusSec && (
                <span className="font-display mt-1 text-[0.6rem] text-accent">
                  ⚡ Chrono Shift: -0.1s delay
                </span>
              )}
            </div>
          )}

          {(phase === "word" || phase === "clash") && wordVisible && (
            <div key={word} className="pop bg-letterbox/90 px-6 py-4 border-2 border-border shadow-pixel">
              <p className="font-display text-lg tracking-wider md:text-3xl">
                {word.split("").map((ch, i) => (
                  <span
                    key={i}
                    className={
                      i < correctLen
                        ? "text-success"
                        : i === correctLen && typed.length > correctLen
                        ? "bg-destructive text-destructive-foreground"
                        : "text-foreground"
                    }
                  >
                    {ch === " " ? "\u00a0" : ch}
                  </span>
                ))}
              </p>
            </div>
          )}

          {phase === "word" && !wordVisible && (
            <p className="font-display text-xs text-destructive">PENALTY...</p>
          )}

          {/* K.O. Match End Results & Mog Finisher */}
          {phase === "matchEnd" && (
            <div className="pop flex flex-col items-center gap-3 border-4 border-letterbox bg-card p-6 shadow-pixel max-w-md">
              <p
                className={`font-display text-2xl md:text-4xl ${
                  won ? "text-accent" : "text-destructive"
                }`}
              >
                {won ? "MOGGED TO OBLIVION" : "DEFEATED"}
              </p>
              <div className="flex items-center gap-4 text-xl">
                <span className="text-accent font-display text-sm">+{coinsReward} 🪙 Coins</span>
                <span className="text-white font-display text-sm">+{xpReward} XP</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Fastest strike: {avg ? `${(avg / 1000).toFixed(2)}s` : "--"} · Total Dmg: {totalDamageDealt}
              </p>

              <div className="flex flex-wrap justify-center gap-3 mt-2">
                <button
                  className="btn-pixel text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHp({ p: MAX_HP, b: MAX_HP });
                    setExMeter({ p: 0, b: 0 });
                    setExchange(1);
                    setTimes([]);
                    setTotalDamageDealt(0);
                    startExchange(1);
                  }}
                >
                  Rematch
                </button>
                <button
                  className="btn-pixel text-xs bg-accent text-accent-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMogCard(true);
                  }}
                >
                  📸 Export Mog Card
                </button>
                <button
                  className="btn-pixel text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onExit();
                  }}
                >
                  Shop / Builder
                </button>
              </div>
            </div>
          )}
        </div>

        {fx.flash > 0 && (
          <div
            key={`f${fx.flash}`}
            className="flash pointer-events-none absolute inset-0 z-30 bg-foreground"
          />
        )}
      </div>

      {/* Letterbox Bottom Input */}
      <div className="z-20 flex h-[13vh] items-center justify-center px-4">
        <input
          ref={inputRef}
          value={phase === "stare" ? "" : typed}
          onChange={(e) => onInput(e.target.value)}
          onPaste={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={phase === "intro" || phase === "matchEnd"}
          placeholder={
            phase === "stare"
              ? "wait for it..."
              : phase === "word"
              ? "TYPE TO STRIKE!"
              : ""
          }
          className="font-display w-full max-w-xl border-4 border-primary bg-card px-4 py-3 text-center text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent md:text-lg"
          aria-label="Type the word"
        />
      </div>

      {/* Export Mog Card Modal */}
      {showMogCard && (
        <MogCardModal
          avatar={avatar}
          level={level}
          avgTimeMs={avg}
          damageDealt={totalDamageDealt}
          won={won}
          onClose={() => setShowMogCard(false)}
        />
      )}
    </div>
  );
}

/** Street Fighter Style Health Bar & EX Frenzy Gauge */
function HealthPlate({
  name,
  hp,
  maxHp,
  exMeter,
  right,
  gadgets = [],
}: {
  name: string;
  hp: number;
  maxHp: number;
  exMeter: number;
  right: boolean;
  gadgets: GadgetId[];
}) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const hpColor =
    pct > 50 ? "bg-success" : pct > 25 ? "bg-accent" : "bg-destructive";
  const isFrenzy = exMeter >= 100;

  return (
    <div
      className={`flex w-[42%] max-w-sm flex-col gap-1 ${
        right ? "items-end text-right" : "items-start text-left"
      }`}
    >
      <div
        className={`flex items-center justify-between w-full text-xs font-display ${
          right ? "flex-row-reverse" : ""
        }`}
      >
        <span
          className="text-[0.65rem] md:text-xs text-foreground tracking-wide"
          style={{ textShadow: "2px 2px 0 var(--letterbox)" }}
        >
          {name}
        </span>
        <span className="text-[0.55rem] text-muted-foreground font-mono">
          {hp} / {maxHp} HP
        </span>
      </div>

      {/* HP Bar Outer */}
      <div className="relative h-4 w-full border-2 border-letterbox bg-muted shadow-pixel overflow-hidden">
        <div
          className={`h-full ${hpColor} hp-bar-transition ${right ? "ml-auto" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* EX / Mewing Frenzy Meter */}
      <div className="w-full flex items-center gap-1 mt-0.5">
        <span className="text-[0.5rem] font-display text-muted-foreground">
          {isFrenzy ? "🔥 FRENZY" : "EX"}
        </span>
        <div className="relative h-1.5 flex-1 bg-muted border border-letterbox overflow-hidden">
          <div
            className={`h-full transition-all duration-150 ${
              isFrenzy ? "bg-accent blink" : "bg-cyan-400"
            }`}
            style={{ width: `${exMeter}%` }}
          />
        </div>
      </div>

      {/* Equipped Gadgets Badges */}
      {gadgets.length > 0 && (
        <div className={`flex gap-1 mt-0.5 ${right ? "flex-row-reverse" : ""}`}>
          {gadgets.map((gid) => {
            const g = getGadget(gid);
            return (
              <span
                key={gid}
                className="flex items-center gap-0.5 px-1 py-0.5 text-[0.55rem] font-display bg-letterbox/70 border border-border text-accent"
                title={`${g.name}: ${g.desc}`}
              >
                <span>{g.icon}</span>
                <span className="hidden md:inline">{g.name}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
