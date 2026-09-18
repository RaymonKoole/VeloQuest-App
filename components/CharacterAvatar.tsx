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
const OUTLINE = "#00000030";
const FACE_INK = "#2b2116";

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
          d="M 172 88 Q 182 80 190 83 Q 196 85 194 92"
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
        <rect x="16" y="50" width="12" height="44" rx="6" fill={fillFor("jersey")} stroke={OUTLINE} />
      )}
      {part(
        "jersey",
        <rect x="72" y="50" width="12" height="44" rx="6" fill={fillFor("jersey")} stroke={OUTLINE} />
      )}
      {part(
        "gloves",
        <circle cx="22" cy="97" r="7" fill={colorFor("gloves")} stroke={OUTLINE} />
      )}
      {part(
        "gloves",
        <circle cx="78" cy="97" r="7" fill={colorFor("gloves")} stroke={OUTLINE} />
      )}

      {/* Benen: broek (bovenbeen) + sokken (onderbeen) + schoenen */}
      {part(
        "shorts",
        <rect x="32" y="100" width="15" height="30" rx="6" fill={colorFor("shorts")} stroke={OUTLINE} />
      )}
      {part(
        "shorts",
        <rect x="53" y="100" width="15" height="30" rx="6" fill={colorFor("shorts")} stroke={OUTLINE} />
      )}
      {part(
        "socks",
        <rect x="33" y="128" width="13" height="24" rx="5" fill={colorFor("socks")} stroke={OUTLINE} />
      )}
      {part(
        "socks",
        <rect x="54" y="128" width="13" height="24" rx="5" fill={colorFor("socks")} stroke={OUTLINE} />
      )}
      {part(
        "shoes",
        <rect x="30" y="150" width="18" height="9" rx="4" fill={colorFor("shoes")} stroke={OUTLINE} />
      )}
      {part(
        "shoes",
        <rect x="52" y="150" width="18" height="9" rx="4" fill={colorFor("shoes")} stroke={OUTLINE} />
      )}

      {/* Torso (jersey) + ritssluiting bij de hals + zachte hoogtelichting voor volume */}
      {part(
        "jersey",
        <g>
          <rect x="30" y="46" width="40" height="56" rx="12" fill={fillFor("jersey")} stroke={OUTLINE} />
          <ellipse cx="40" cy="56" rx="7" ry="12" fill="#ffffff" opacity="0.12" />
          <line x1="50" y1="47" x2="50" y2="54" stroke="#00000035" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}

      {/* Accessoire: badge op de borst */}
      {part(
        "accessory",
        <circle cx="50" cy="62" r="6" fill={colorFor("accessory")} stroke="#00000033" />
      )}

      {/* Hoofd (iets groter voor meer personage-gevoel) + gezicht + helm + bril */}
      <circle cx="50" cy="25" r="18" fill={SKIN_COLOR} stroke={OUTLINE} />

      {/* Gezicht: wenkbrauwen, ogen, glimlach — zit los van de bril, zodat er
          altijd een gezicht te zien is, ook zonder bril uitgerust. Zit onder
          de rand van de helm (die stopt bij y=20), niet erachter. */}
      <g>
        <path d="M 39 22 Q 42 20 45 22" stroke={FACE_INK} strokeWidth="1.4" strokeLinecap="round" fill="none" />
        <path d="M 55 22 Q 58 20 61 22" stroke={FACE_INK} strokeWidth="1.4" strokeLinecap="round" fill="none" />
        <circle cx="43" cy="26" r="1.7" fill={FACE_INK} />
        <circle cx="57" cy="26" r="1.7" fill={FACE_INK} />
        <path d="M 44 37 Q 50 40.5 56 37" stroke={FACE_INK} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </g>

      {part(
        "helmet",
        <g>
          <path d="M 23 20 A 27 19 0 0 1 77 20 Z" fill={colorFor("helmet")} stroke={OUTLINE} />
          <path
            d="M 50 3 L 50 19 M 39 5 L 36 17 M 61 5 L 64 17"
            stroke="#00000035"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 39 42 Q 50 48 61 42"
            stroke="#00000055"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      )}
      {part(
        "glasses",
        <path
          d="M 32 27 Q 50 22 68 27 L 67 32 Q 50 28 33 32 Z"
          fill={colorFor("glasses")}
          opacity={equipment.glasses ? 1 : 0.15}
        />
      )}
    </svg>
  );
}
