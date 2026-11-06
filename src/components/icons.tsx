import type { ReactNode } from "react";

type IconProps = { className?: string };

function Icon({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function IconGrid(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.4" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.4" />
    </Icon>
  );
}

export function IconShelf(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 8h16M4 13h16M4 18h16" />
      <path d="M7 8V5.5M12 8V5.5M17 8V5.5" />
    </Icon>
  );
}

export function IconBookmark(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.2L6 20V5.5a1 1 0 0 1 1-1z" />
    </Icon>
  );
}

export function IconLock(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Icon>
  );
}

export function IconGear(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" />
    </Icon>
  );
}

export function IconScan(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 5H5v2M17 5h2v2M7 19H5v-2M17 19h2v-2M4 12h16" />
    </Icon>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  );
}

export function IconCamera(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 7.5 9.2 5h5.6L16 7.5H19a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8.5a1 1 0 0 1 1-1h3z" />
      <circle cx="12" cy="13" r="3" />
    </Icon>
  );
}
