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

export function CloudIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M7 18a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18.2 10 4 4 0 0 1 17.5 18H7z" />
    </Svg>
  );
}
