type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  "aria-hidden": true,
  width: 20,
  height: 20,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="11" cy="11" r="6.25" />
      <path d="M16 16.5 20.5 21" />
    </svg>
  );
}

export function PauseIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M8 5.5v13M16 5.5v13" />
    </svg>
  );
}

export function PlayIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}

export function ShareIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="6.5" cy="12" r="2.25" />
      <circle cx="17" cy="6.5" r="2.25" />
      <circle cx="17" cy="17.5" r="2.25" />
      <path d="M8.6 11.1 14.8 7.6M8.6 12.9l6.2 3.4" />
    </svg>
  );
}

export function LinkIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M10 13.5a4.2 4.2 0 0 0 6 .4l2.2-2.2a4.2 4.2 0 0 0-6-6L11 6.9" />
      <path d="M14 10.5a4.2 4.2 0 0 0-6-.4l-2.2 2.2a4.2 4.2 0 0 0 6 6L13 17.1" />
    </svg>
  );
}

export function ChevronIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
