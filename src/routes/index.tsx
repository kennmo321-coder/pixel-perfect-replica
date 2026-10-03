import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PRESETS, type AvatarData } from "@/game/avatar";
import { unlockAudio } from "@/game/audio";
import { type GadgetId } from "@/game/gadgets";
import { Builder } from "@/components/game/Builder";
import { Duel } from "@/components/game/Duel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aura Duel — Pixel Battle Typer" },
      {
        name: "description",
        content:
          "1v1 pixel-art battle typer with healthbars. Equip gadgets for combat advantages (-0.1s delay, +20% dmg), strike fast and mog your opponent.",
      },
      { property: "og:title", content: "Aura Duel — Pixel Battle Typer" },
      { property: "og:description", content: "Type faster. Strike harder. Mog them." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const KEY_AVATAR = "aura-duel-avatar";
const KEY_COINS = "aura-duel-coins";
const KEY_PURCHASED = "aura-duel-purchased-gadgets";
const KEY_EQUIPPED = "aura-duel-equipped-gadgets";

function Index() {
  const [avatar, setAvatar] = useState<AvatarData>(PRESETS.elder);
  const [level, setLevel] = useState(5);
  const [coins, setCoins] = useState(1000);
  const [purchasedGadgets, setPurchasedGadgets] = useState<GadgetId[]>(["chrono"]);
  const [equippedGadgets, setEquippedGadgets] = useState<GadgetId[]>(["chrono"]);
  const [screen, setScreen] = useState<"build" | "duel">("build");

  useEffect(() => {
    try {
      const a = localStorage.getItem(KEY_AVATAR);
      if (a) setAvatar(JSON.parse(a));
      const c = localStorage.getItem(KEY_COINS);
      if (c) setCoins(Number(c));
      const p = localStorage.getItem(KEY_PURCHASED);
      if (p) setPurchasedGadgets(JSON.parse(p));
      const e = localStorage.getItem(KEY_EQUIPPED);
      if (e) setEquippedGadgets(JSON.parse(e));
    } catch {
      /* noop */
    }
  }, []);

  const saveAvatar = (a: AvatarData) => {
    setAvatar(a);
    localStorage.setItem(KEY_AVATAR, JSON.stringify(a));
  };

  const saveCoins = (amount: number) => {
    setCoins(amount);
    localStorage.setItem(KEY_COINS, String(amount));
  };

  const savePurchased = (list: GadgetId[]) => {
    setPurchasedGadgets(list);
    localStorage.setItem(KEY_PURCHASED, JSON.stringify(list));
  };

  const saveEquipped = (list: GadgetId[]) => {
    setEquippedGadgets(list);
    localStorage.setItem(KEY_EQUIPPED, JSON.stringify(list));
  };

  const handleReward = (earnedCoins: number, earnedXp: number) => {
    saveCoins(coins + earnedCoins);
    if (earnedXp > 50 && level < 100) {
      setLevel((l) => Math.min(100, l + 1));
    }
  };

  if (screen === "duel") {
    return (
      <Duel
        avatar={avatar}
        level={level}
        equippedGadgets={equippedGadgets}
        onExit={() => setScreen("build")}
        onReward={handleReward}
      />
    );
  }

  return (
    <Builder
      avatar={avatar}
      setAvatar={saveAvatar}
      level={level}
      setLevel={setLevel}
      coins={coins}
      setCoins={saveCoins}
      purchasedGadgets={purchasedGadgets}
      setPurchasedGadgets={savePurchased}
      equippedGadgets={equippedGadgets}
      setEquippedGadgets={saveEquipped}
      onDuel={() => {
        unlockAudio();
        setScreen("duel");
      }}
    />
  );
}
