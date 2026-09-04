"use client";

import type { GearSlot } from "@/lib/gear/types";

export type EquippedItem = {
  icon: string;
  color: string;
  name: string;
} | null;

type CharacterAvatarProps = {
  equipment: Partial<Record<GearSlot, EquippedItem>>;
  size?: "sm" | "lg";
  onSlotClick?: (slot: GearSlot) => void;
};

// Layout geïnspireerd op het klassieke "worn equipment"-scherm: een
// silhouet in het midden, met uitrustingsslots eromheen gepositioneerd.
const LAYOUT: (GearSlot | null)[][] = [
  ["cape", "helmet", null],
  ["gloves", "jersey", "glasses"],
  [null, "shorts", "accessory"],
  ["socks", "shoes", null],
];

export default function CharacterAvatar({
  equipment,
  size = "lg",
  onSlotClick,
}: CharacterAvatarProps) {
  const cellSize = size === "lg" ? 72 : 40;
  const iconSize = size === "lg" ? "text-3xl" : "text-lg";
  const gap = size === "lg" ? "gap-2" : "gap-1";

  return (
    <div className="relative inline-block">
      <span
        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10"
        style={{ fontSize: cellSize * 3.6 }}
      >
        🚴
      </span>

      <div className={`relative grid grid-cols-3 ${gap}`}>
        {LAYOUT.flat().map((slot, index) => {
          if (!slot) {
            return <div key={index} style={{ width: cellSize, height: cellSize }} />;
          }

          const item = equipment[slot];
          const clickable = Boolean(onSlotClick);

          return (
            <button
              key={index}
              type="button"
              disabled={!clickable}
              onClick={() => onSlotClick?.(slot)}
              title={item ? item.name : `Leeg (${slot})`}
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: item ? `${item.color}22` : "rgba(255,255,255,0.03)",
                borderColor: item ? `${item.color}88` : "rgba(255,255,255,0.15)",
              }}
              className={`flex items-center justify-center rounded-xl border ${
                clickable ? "cursor-pointer hover:opacity-80" : "cursor-default"
              } ${!item ? "border-dashed" : ""}`}
            >
              <span className={iconSize}>{item ? item.icon : ""}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
