function Svg({
  children,
  className = "h-4 w-4",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function FolderIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </Svg>
  );
}

export function FileIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" />
      <path d="M14 3v5h5" />
    </Svg>
  );
}

export function UsersIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M17.5 14.3c2.4.8 4 2.9 4 5.7" />
    </Svg>
  );
}

export function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.2 2.4 2.4 4.6-5" />
    </Svg>
  );
}

export function FlagIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M5 21V4" />
      <path d="M5 4h12l-2.5 4L17 12H5" />
    </Svg>
  );
}

export function CalendarIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </Svg>
  );
}

export function PaperclipIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="m20 11.5-7.8 7.8a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L10 16.9a1.7 1.7 0 0 1-2.4-2.4l7.4-7.4" />
    </Svg>
  );
}

export function GridIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x="4" y="4" width="7" height="7" rx="1.8" />
      <rect x="13" y="4" width="7" height="7" rx="1.8" />
      <rect x="4" y="13" width="7" height="7" rx="1.8" />
      <rect x="13" y="13" width="7" height="7" rx="1.8" />
    </Svg>
  );
}

export function HomeIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="m3.5 10.5 8.5-7 8.5 7" />
      <path d="M5.5 9v10.5h13V9" />
    </Svg>
  );
}

export function GearIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.15-1.4l2-1.55-2-3.45-2.35 1a7 7 0 0 0-2.4-1.4L13.7 2.7h-3.4L9.9 5.2a7 7 0 0 0-2.4 1.4l-2.35-1-2 3.45 2 1.55A7 7 0 0 0 5 12c0 .48.05.94.15 1.4l-2 1.55 2 3.45 2.35-1a7 7 0 0 0 2.4 1.4l.4 2.5h3.4l.4-2.5a7 7 0 0 0 2.4-1.4l2.35 1 2-3.45-2-1.55c.1-.46.15-.92.15-1.4z" />
    </Svg>
  );
}

export function SearchIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.4-4.4" />
    </Svg>
  );
}

export function PenIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
      <path d="m13.5 6.5 3 3" />
    </Svg>
  );
}

export function PrinterIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M7 8V3.5h10V8" />
      <rect x="4" y="8" width="16" height="8" rx="2" />
      <path d="M7 13h10v7H7z" />
    </Svg>
  );
}

export function SunIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
    </Svg>
  );
}

export function MoonIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" />
    </Svg>
  );
}

export function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="m14.5 6-6 6 6 6" />
    </Svg>
  );
}

export function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="m9.5 6 6 6-6 6" />
    </Svg>
  );
}

export function ScaleIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M12 3v18M8 21h8" />
      <path d="M12 6H6.5L3 13a3.5 3.5 0 0 0 7 0L6.5 6M12 6h5.5L21 13a3.5 3.5 0 0 1-7 0L17.5 6" />
    </Svg>
  );
}

export function CoinsIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <circle cx="8" cy="8" r="5" />
      <path d="M18.09 10.37A5 5 0 1 1 12.5 18.5" />
      <path d="M7 6h1v4M17 14h-1v4" />
    </Svg>
  );
}

export function BuildingIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
      <path d="M3 21h18" />
      <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" />
    </Svg>
  );
}

export function CloudIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M7 18a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18.2 10 4 4 0 0 1 17.5 18H7z" />
    </Svg>
  );
}

export function SparklesIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
      <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14z" />
    </Svg>
  );
}

export function SendIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M4 12l16-8-6 16-3-6-7-2z" />
    </Svg>
  );
}

export function CircleIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
    </Svg>
  );
}

export function TrashIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M4 7h16" />
      <path d="M9 7V4.8c0-.44.36-.8.8-.8h4.4c.44 0 .8.36.8.8V7" />
      <path d="M6 7l1 13a2 2 0 0 0 2 1.9h6a2 2 0 0 0 2-1.9L18 7" />
      <path d="M10 11v6M14 11v6" />
    </Svg>
  );
}

export function WhatsAppIcon({ className }: { className?: string }) {
  // WhatsApp logosu (dolgulu) — marka rengiyle kullanılmak üzere.
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.8c2.16 0 4.18.84 5.71 2.37a8.05 8.05 0 0 1 2.37 5.72c0 4.46-3.63 8.09-8.09 8.09a8.1 8.1 0 0 1-4.12-1.13l-.3-.18-3.11.82.83-3.04-.2-.31a8.05 8.05 0 0 1-1.24-4.29c0-4.46 3.63-8.09 8.1-8.09Zm-2.6 4.02c-.13 0-.34.05-.52.24-.18.19-.7.69-.7 1.68 0 .99.72 1.94.82 2.08.1.13 1.4 2.24 3.48 3.05 1.72.68 2.07.55 2.44.51.37-.03 1.2-.49 1.37-.96.17-.47.17-.87.12-.96-.05-.08-.18-.13-.37-.23-.19-.09-1.2-.59-1.38-.66-.18-.07-.32-.1-.46.1-.13.19-.53.66-.65.8-.12.13-.24.15-.43.05-.19-.1-.82-.3-1.56-.96-.58-.51-.96-1.15-1.08-1.34-.12-.19-.01-.3.08-.4.09-.09.19-.23.29-.34.09-.12.13-.2.19-.33.06-.13.03-.24-.02-.34-.05-.1-.44-1.11-.62-1.52-.16-.4-.33-.34-.45-.35l-.38-.01Z" />
    </svg>
  );
}

export function ChatIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.8A8 8 0 1 1 21 12z" />
      <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" />
    </Svg>
  );
}
