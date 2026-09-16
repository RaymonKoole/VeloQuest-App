"use client";

import { Fragment, useId } from "react";
import type { GearSlot } from "@/lib/gear/types";
import { RAINBOW_PATTERN } from "@/lib/gear/types";

export type EquippedItem = {
  icon: string;
  color: string;
  name: string;
  pattern?: string | null;
} | null;

type CharacterAvatarProps = {
  equipment: Partial<Record<GearSlot, EquippedItem>>;
  size?: "sm" | "lg";
  onSlotClick?: (slot: GearSlot) => void;
};

const EMPTY_COLOR = "#3f3f46";
const SKIN_COLOR = "#c98f65";
const TIRE_COLOR = "#71717a";

// De officiële UCI-wereldkampioenstrui-banden (van boven naar onder).
const RAINBOW_BANDS = ["#0067b1", "#e2231a", "#231f20", "#ffd200", "#00a651"];

export default function CharacterAvatar({
  equipment,
  size = "lg",
  onSlotClick,
}: CharacterAvatarProps) {
  const clickable = Boolean(onSlotClick);
  const width = size === "lg" ? 200 : 90;
  const gradientId = `rainbow-${useId()}`;

  function colorFor(slot: GearSlot) {
    if (equipment[slot]?.color) {
      return equipment[slot]!.color;
    }

    // Fietsonderdelen zijn dunne lijnen/vormen die tegen de donkere
    // achtergrond nauwelijks zichtbaar zijn met de (donkere) EMPTY_COLOR
    // van kleding — een neutraal grijs blijft wel afleesbaar.
    return slot.startsWith("bike_") ? TIRE_COLOR : EMPTY_COLOR;
  }

  function fillFor(slot: GearSlot) {
    if (equipment[slot]?.pattern === RAINBOW_PATTERN) {
      return `url(#${gradientId})`;
    }

    return colorFor(slot);
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
      viewBox="0 0 200 170"
      width={width}
      height={width * 0.85}
      className="select-none"
    >
      <defs>
        {/* Harde kleurovergangen (geen vloeiende blend) zodat het echt op
            horizontale banden lijkt, zoals de regenboogtrui. */}
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          {RAINBOW_BANDS.map((bandColor, index) => {
            const start = (index / RAINBOW_BANDS.length) * 100;
            const end = ((index + 1) / RAINBOW_BANDS.length) * 100;

            return (
              <Fragment key={index}>
                <stop offset={`${start}%`} stopColor={bandColor} />
                <stop offset={`${end}%`} stopColor={bandColor} />
              </Fragment>
            );
          })}
        </linearGradient>
      </defs>

      {/* Racefiets — rechts naast de renner, opgebouwd uit losse,
          apart uitrustbare onderdelen */}
      {part(
        "bike_wheels",
        <g>
          <circle cx="128" cy="140" r="20" fill="none" stroke={fillFor("bike_wheels")} strokeWidth="5" />
          <circle cx="128" cy="140" r="3" fill={colorFor("bike_wheels")} />
          <circle cx="188" cy="140" r="20" fill="none" stroke={fillFor("bike_wheels")} strokeWidth="5" />
          <circle cx="188" cy="140" r="3" fill={colorFor("bike_wheels")} />
        </g>
      )}

      {part(
        "bike_groupset",
        <g>
          {/* Ketting van trapas naar achterwiel-naaf */}
          <path
            d="M 152 126 L 128 140"
            fill="none"
            stroke={colorFor("bike_groupset")}
            strokeWidth="2"
            strokeDasharray="2 2"
          />
          <circle cx="152" cy="126" r="4" fill={colorFor("bike_groupset")} />
        </g>
      )}

      {part(
        "bike_frame",
        <path
          d="M 128 140 L 152 126 L 145 90 M 152 126 L 172 88 M 145 90 L 172 88 L 188 140"
          fill="none"
          stroke={fillFor("bike_frame")}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {part(
        "bike_saddle",
        <ellipse
          cx="143"
          cy="88"
          rx="8"
          ry="3"
          fill={fillFor("bike_saddle")}
          transform="rotate(-12 143 88)"
        />
      )}

      {part(
        "bike_handlebar",
        <path
          d="M 172 88 Q 179 82 184 86"
          fill="none"
          stroke={fillFor("bike_handlebar")}
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}

      {/* Cape — achter de rest, breder dan de romp zodat hij aan weerszijden
          zichtbaar naar buiten waait */}
      {part(
        "cape",
        <path
          d="M 40 48 L 60 48 Q 92 90 82 146 L 18 146 Q 8 90 40 48 Z"
          fill={fillFor("cape")}
          opacity={equipment.cape ? 1 : 0.3}
        />
      )}

      {/* Armen (mouwen = jersey-kleur) + handschoenen */}
      {part(
        "jersey",
        <rect x="16" y="50" width="12" height="44" rx="6" fill={fillFor("jersey")} />
      )}
      {part(
        "jersey",
        <rect x="72" y="50" width="12" height="44" rx="6" fill={fillFor("jersey")} />
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
        <rect x="30" y="46" width="40" height="56" rx="12" fill={fillFor("jersey")} />
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
