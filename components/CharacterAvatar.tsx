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

const EMPTY_COLOR = "#3f3f46";
const SKIN_COLOR = "#c98f65";

export default function CharacterAvatar({
  equipment,
  size = "lg",
  onSlotClick,
}: CharacterAvatarProps) {
  const clickable = Boolean(onSlotClick);
  const width = size === "lg" ? 200 : 90;

  function colorFor(slot: GearSlot) {
    return equipment[slot]?.color || EMPTY_COLOR;
  }

  function titleFor(slot: GearSlot) {
    return equipment[slot]?.name || `Leeg (${slot})`;
  }

  function part(slot: GearSlot, children: React.ReactNode) {
    return (
      <g
        onClick={clickable ? () => onSlotClick?.(slot) : undefined}
        className={clickable ? "cursor-pointer transition hover:opacity-70" : undefined}
      >
        <title>{titleFor(slot)}</title>
        {children}
      </g>
    );
  }

  return (
    <svg
      viewBox="0 0 100 170"
      width={width}
      height={width * 1.7}
      className="select-none"
    >
      {/* Cape — achter de rest, breder dan de romp zodat hij aan weerszijden
          zichtbaar naar buiten waait */}
      {part(
        "cape",
        <path
          d="M 40 48 L 60 48 Q 92 90 82 146 L 18 146 Q 8 90 40 48 Z"
          fill={colorFor("cape")}
          opacity={equipment.cape ? 1 : 0.3}
        />
      )}

      {/* Armen (mouwen = jersey-kleur) + handschoenen */}
      {part(
        "jersey",
        <rect x="16" y="50" width="12" height="44" rx="6" fill={colorFor("jersey")} />
      )}
      {part(
        "jersey",
        <rect x="72" y="50" width="12" height="44" rx="6" fill={colorFor("jersey")} />
      )}
      {part(
        "gloves",
        <circle cx="22" cy="97" r="7" fill={colorFor("gloves")} />
      )}
      {part(
        "gloves",
        <circle cx="78" cy="97" r="7" fill={colorFor("gloves")} />
      )}

      {/* Benen: broek (bovenbeen) + sokken (onderbeen) + schoenen */}
      {part(
        "shorts",
        <rect x="32" y="100" width="15" height="30" rx="6" fill={colorFor("shorts")} />
      )}
      {part(
        "shorts",
        <rect x="53" y="100" width="15" height="30" rx="6" fill={colorFor("shorts")} />
      )}
      {part(
        "socks",
        <rect x="33" y="128" width="13" height="24" rx="5" fill={colorFor("socks")} />
      )}
      {part(
        "socks",
        <rect x="54" y="128" width="13" height="24" rx="5" fill={colorFor("socks")} />
      )}
      {part(
        "shoes",
        <rect x="30" y="150" width="18" height="9" rx="4" fill={colorFor("shoes")} />
      )}
      {part(
        "shoes",
        <rect x="52" y="150" width="18" height="9" rx="4" fill={colorFor("shoes")} />
      )}

      {/* Torso (jersey) */}
      {part(
        "jersey",
        <rect x="30" y="46" width="40" height="56" rx="12" fill={colorFor("jersey")} />
      )}

      {/* Accessoire: badge op de borst */}
      {part(
        "accessory",
        <circle cx="50" cy="62" r="6" fill={colorFor("accessory")} stroke="#00000033" />
      )}

      {/* Hoofd + helm + bril */}
      <circle cx="50" cy="26" r="16" fill={SKIN_COLOR} />
      {part(
        "helmet",
        <path
          d="M 33 26 A 17 17 0 0 1 67 26 L 67 20 Q 67 8 50 8 Q 33 8 33 20 Z"
          fill={colorFor("helmet")}
        />
      )}
      {part(
        "glasses",
        <rect x="38" y="27" width="24" height="6" rx="3" fill={colorFor("glasses")} />
      )}
    </svg>
  );
}
