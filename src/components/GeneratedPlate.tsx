import { useId } from "react";
import type { Figure } from "../types";
import { lineShort } from "../lib/text";

type PlateProps = {
  figure: Figure;
  photoUrl?: string;
  variant?: "card" | "thumb" | "detail";
  labelled?: boolean;
};

function mix(hex: string, target: "white" | "black", amount: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  const toward = target === "white" ? 255 : 0;
  const next = channels.map((channel) => Math.round(channel + (toward - channel) * amount));
  return `#${next.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function GeneratedPlate({ figure, photoUrl, variant = "card", labelled = false }: PlateProps) {
  const reactId = useId().replace(/:/g, "");
  const gradientId = `g${reactId}`;
  const color = figure.image.lineColor;
  const short = lineShort(figure.line);
  const className = `plate plate-${variant}`;

  if (photoUrl) {
    return (
      <span className={`plate-wrap plate-wrap-${variant}`}>
        <img
          className={className}
          src={photoUrl}
          alt={labelled ? `${figure.name}, photo you added` : ""}
          aria-hidden={labelled ? undefined : true}
        />
        {variant === "thumb" ? null : <span className="photo-flag">Your photo</span>}
      </span>
    );
  }

  const pattern =
    short === "Kenner" ? (
      <circle cx="36" cy="36" r="64" fill="none" stroke="#fff" strokeOpacity="0.16" strokeWidth="10" />
    ) : short === "Retro" ? (
      <g fill="#fff" opacity="0.14">
        <rect y="34" width="200" height="7" />
        <rect y="50" width="200" height="2" />
        <rect y="58" width="200" height="2" />
      </g>
    ) : (
      <g fill="none" stroke="#fff">
        <circle cx="100" cy="104" r="84" strokeOpacity="0.16" />
        <circle cx="100" cy="104" r="74" strokeOpacity="0.1" />
      </g>
    );

  return (
    <svg
      className={`${className} plate-svg`}
      viewBox="0 0 200 230"
      role={labelled ? "img" : undefined}
      aria-hidden={labelled ? undefined : true}
      aria-label={
        labelled
          ? `${figure.name}. Generated catalog plate for ${figure.line}. Not a product photo.`
          : undefined
      }
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={mix(color, "white", 0.22)} />
          <stop offset="48%" stopColor={color} />
          <stop offset="100%" stopColor={mix(color, "black", 0.38)} />
        </linearGradient>
      </defs>
      <rect width="200" height="230" fill={`url(#${gradientId})`} />
      {pattern}
      <circle cx="158" cy="42" r="34" fill="#fff" opacity="0.08" />
      <circle cx="100" cy="96" r="52" fill="#140e08" opacity="0.9" />
      <text
        x="100"
        y="104"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#f6f1e7"
        fontFamily="Fraunces, Georgia, serif"
        fontSize="42"
        fontWeight="600"
      >
        {figure.image.initials}
      </text>
      <rect y="178" width="200" height="52" fill="#140e08" />
      <text
        x="100"
        y="200"
        textAnchor="middle"
        fill="#f6f1e7"
        fontFamily="Outfit, sans-serif"
        fontSize="13"
        letterSpacing="1.5"
      >
        {short.toUpperCase()}
      </text>
      <text
        x="100"
        y="218"
        textAnchor="middle"
        fill="#e6b15a"
        fontFamily="Outfit, sans-serif"
        fontSize="11"
      >
        3.75″
      </text>
      {figure.number ? (
        <>
          <rect x="112" y="14" width="74" height="22" rx="11" fill="#140e08" />
          <text
            x="149"
            y="29"
            textAnchor="middle"
            fill="#f6f1e7"
            fontFamily="Outfit, sans-serif"
            fontSize="11"
          >
            {figure.number}
          </text>
        </>
      ) : null}
    </svg>
  );
}
