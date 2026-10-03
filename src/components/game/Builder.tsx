import { useState } from "react";
import { ACCS, ARCHETYPES, AURAS, EYES, HAIRS, PRESETS, SKINS, type AvatarData } from "@/game/avatar";
import { GADGETS, getGadget, type GadgetId } from "@/game/gadgets";
import { sfx } from "@/game/audio";
import { Fighter } from "./Fighter";

type Props = {
  avatar: AvatarData;
  setAvatar: (a: AvatarData) => void;
  level: number;
  setLevel: (n: number) => void;
  coins: number;
  setCoins: (c: number) => void;
  purchasedGadgets: GadgetId[];
  setPurchasedGadgets: (g: GadgetId[]) => void;
  equippedGadgets: GadgetId[];
  setEquippedGadgets: (g: GadgetId[]) => void;
  onDuel: () => void;
};

export function Builder({
  avatar,
  setAvatar,
  level,
  setLevel,
  coins,
  setCoins,
  purchasedGadgets,
  setPurchasedGadgets,
  equippedGadgets,
  setEquippedGadgets,
  onDuel,
}: Props) {
  const [tab, setTab] = useState<"avatar" | "gadgets">("avatar");

  const cycle = (key: keyof Omit<AvatarData, "archetype">, n: number, d: number) =>
    setAvatar({ ...avatar, [key]: (avatar[key] + d + n) % n });

  const rows: { label: string; key: keyof Omit<AvatarData, "archetype">; n: number; value?: string }[] = [
    { label: "Skin", key: "skin", n: SKINS.length, value: `#${avatar.skin + 1}` },
    { label: "Hair", key: "hair", n: HAIRS.length, value: HAIRS[avatar.hair] },
    { label: "Eyes", key: "eyes", n: EYES.length, value: EYES[avatar.eyes] },
    { label: "Extra", key: "acc", n: ACCS.length, value: ACCS[avatar.acc] },
    { label: "Aura", key: "aura", n: AURAS.length, value: AURAS[avatar.aura]?.name },
  ];
  const arc = ARCHETYPES.find((a) => a.id === avatar.archetype) ?? ARCHETYPES[0]!;

  const handleBuyCash = () => {
    sfx.coin();
    setCoins(coins + 1000);
  };

  const handleBuyGadget = (id: GadgetId) => {
    const g = getGadget(id);
    if (coins < g.price) {
      sfx.wrong();
      return;
    }
    sfx.coin();
    setCoins(coins - g.price);
    const updated = [...purchasedGadgets, id];
    setPurchasedGadgets(updated);
    // Automatically equip if less than 2 equipped
    if (equippedGadgets.length < 2) {
      setEquippedGadgets([...equippedGadgets, id]);
    }
  };

  const handleToggleEquip = (id: GadgetId) => {
    if (equippedGadgets.includes(id)) {
      setEquippedGadgets(equippedGadgets.filter((g) => g !== id));
      sfx.key();
    } else {
      if (equippedGadgets.length >= 2) {
        // Replace second slot
        setEquippedGadgets([equippedGadgets[0]!, id]);
      } else {
        setEquippedGadgets([...equippedGadgets, id]);
      }
      sfx.key();
    }
  };

  return (
    <div className="relative min-h-screen bg-sky grain overflow-hidden">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 md:py-10">
        {/* Header with Title and Coin Store Balance */}
        <header className="flex flex-col items-center gap-3">
          <h1
            className="font-display text-3xl text-accent md:text-5xl"
            style={{ textShadow: "4px 4px 0 var(--letterbox)" }}
          >
            AURA DUEL
          </h1>
          <p className="text-xl md:text-2xl text-foreground">Type faster. Strike harder. Mog them.</p>

          {/* Pay-to-win Store / Currency Bar */}
          <div className="flex items-center gap-3 bg-letterbox/90 px-4 py-2 border-2 border-border shadow-pixel">
            <span className="font-display text-xs md:text-sm text-accent">
              🪙 {coins} COINS
            </span>
            <button
              className="btn-pixel text-[0.65rem] py-1 px-3 bg-accent text-accent-foreground"
              onClick={handleBuyCash}
              title="Simulate payment / purchase currency to buy combat perks"
            >
              +1,000 Coins [Buy Cash]
            </button>
          </div>
        </header>

        {/* Main Grid: Avatar Preview + Customizer / Gadget Store */}
        <div className="grid gap-6 md:grid-cols-[1fr_1.1fr]">
          {/* Left Column: Fighter Canvas & Active Gadgets */}
          <div className="flex flex-col items-center border-4 border-letterbox bg-card/85 p-6 shadow-pixel justify-between">
            <div className="flex flex-col items-center w-full">
              <Fighter avatar={avatar} intensity={0.55} className="h-56 w-56 md:h-72 md:w-72" />
              <p className="font-display mt-2 text-xs text-accent">{arc.name}</p>
              <p className="text-muted-foreground text-center text-sm">{arc.blurb}</p>
            </div>

            {/* Equipped Gadget Slots Preview */}
            <div className="mt-4 w-full border-t-2 border-border pt-3">
              <p className="font-display text-[0.65rem] text-muted-foreground mb-2 text-center">
                ACTIVE COMBAT GADGETS ({equippedGadgets.length}/2)
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[0, 1].map((slotIdx) => {
                  const gid = equippedGadgets[slotIdx];
                  const g = gid ? getGadget(gid) : null;
                  return (
                    <div
                      key={slotIdx}
                      className={`flex flex-col items-center justify-center p-2 border-2 text-center min-h-[58px] ${
                        g
                          ? "border-accent bg-letterbox/80 text-foreground"
                          : "border-dashed border-border bg-letterbox/40 text-muted-foreground"
                      }`}
                    >
                      {g ? (
                        <>
                          <div className="flex items-center gap-1">
                            <span className="text-base">{g.icon}</span>
                            <span className="font-display text-[0.6rem] text-accent">{g.name}</span>
                          </div>
                          <span className="text-[0.6rem] text-muted-foreground mt-0.5">{g.desc}</span>
                        </>
                      ) : (
                        <span className="font-display text-[0.55rem]">SLOT {slotIdx + 1}: EMPTY</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              className="btn-pixel mt-5 w-full text-base"
              onClick={onDuel}
            >
              ⚔ Enter Arena {equippedGadgets.length > 0 ? `(${equippedGadgets.length} Perks)` : ""}
            </button>
          </div>

          {/* Right Column: Customizer Tabs (Avatar vs Gadgets) */}
          <div className="flex flex-col gap-4 border-4 border-letterbox bg-card/90 p-5 shadow-pixel">
            {/* Tab Switcher */}
            <div className="flex gap-2 border-b-2 border-border pb-3">
              <button
                onClick={() => setTab("avatar")}
                className={`flex-1 py-2 font-display text-xs ${
                  tab === "avatar"
                    ? "bg-primary text-primary-foreground border-2 border-letterbox"
                    : "btn-ghost"
                }`}
              >
                🎭 Avatar
              </button>
              <button
                onClick={() => setTab("gadgets")}
                className={`flex-1 py-2 font-display text-xs ${
                  tab === "gadgets"
                    ? "bg-primary text-primary-foreground border-2 border-letterbox"
                    : "btn-ghost"
                }`}
              >
                ⚡ Gadget Shop (Pay-to-Win)
              </button>
            </div>

            {/* TAB 1: Avatar Appearance Customizer */}
            {tab === "avatar" && (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="font-display mb-2 text-[0.6rem] text-muted-foreground">ARCHETYPE</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ARCHETYPES.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => setAvatar(PRESETS[a.id])}
                        className={`btn-ghost text-left text-xs ${
                          avatar.archetype === a.id ? "border-accent text-accent" : ""
                        }`}
                      >
                        {a.name}
                      </button>
                    ))}
                  </div>
                </div>

                {rows.map((r) => (
                  <div key={r.key} className="flex items-center justify-between gap-2">
                    <span className="font-display w-16 text-[0.6rem] text-muted-foreground">{r.label}</span>
                    <button className="btn-ghost" onClick={() => cycle(r.key, r.n, -1)} aria-label={`Previous ${r.label}`}>
                      ◀
                    </button>
                    <span className="flex-1 text-center text-xl">{r.value}</span>
                    <button className="btn-ghost" onClick={() => cycle(r.key, r.n, 1)} aria-label={`Next ${r.label}`}>
                      ▶
                    </button>
                  </div>
                ))}

                <div className="mt-2 border-t-2 border-border pt-4">
                  <label className="font-display flex justify-between text-[0.6rem] text-muted-foreground">
                    <span>WORD LEVEL</span>
                    <span className="text-accent">LV {level}</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={level}
                    onChange={(e) => setLevel(Number(e.target.value))}
                    className="mt-2 w-full accent-primary"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: Pay-to-win Gadget Shop & Equip */}
            {tab === "gadgets" && (
              <div className="flex flex-col gap-3">
                <div className="text-xs text-muted-foreground">
                  Purchased gadgets grant <span className="text-accent font-bold">real combat advantages</span> in typing duels. Equip up to 2 items!
                </div>

                <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
                  {GADGETS.map((g) => {
                    const owned = purchasedGadgets.includes(g.id);
                    const equipped = equippedGadgets.includes(g.id);

                    return (
                      <div
                        key={g.id}
                        className={`flex items-center justify-between p-3 border-2 ${
                          equipped
                            ? "border-accent bg-accent/10"
                            : owned
                            ? "border-border bg-letterbox/50"
                            : "border-border/60 bg-letterbox/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{g.icon}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-display text-xs text-foreground">{g.name}</span>
                              {equipped && (
                                <span className="font-display text-[0.55rem] bg-accent text-accent-foreground px-1">
                                  EQUIPPED
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-accent font-mono mt-0.5">{g.desc}</p>
                          </div>
                        </div>

                        <div>
                          {owned ? (
                            <button
                              className={`btn-ghost text-xs ${
                                equipped ? "border-destructive text-destructive" : "border-accent text-accent"
                              }`}
                              onClick={() => handleToggleEquip(g.id)}
                            >
                              {equipped ? "Unequip" : "Equip"}
                            </button>
                          ) : (
                            <button
                              disabled={coins < g.price}
                              className={`btn-pixel text-xs py-1 px-3 ${
                                coins < g.price ? "opacity-50 cursor-not-allowed" : ""
                              }`}
                              onClick={() => handleBuyGadget(g.id)}
                            >
                              Buy {g.price} 🪙
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
