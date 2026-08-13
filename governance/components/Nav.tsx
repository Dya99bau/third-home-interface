"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/lib/role-context";
import { roleConfig, Role } from "@/lib/data";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/governance", label: "Governance" },
  { href: "/events", label: "Events" },
  { href: "/stay", label: "Stay" },
  { href: "/community", label: "Community" },
  { href: "/studio", label: "Open Studio" },
  { href: "/model", label: "3D Model" },
];

export default function Nav() {
  const pathname = usePathname();
  const { role, setRole } = useRole();

  return (
    <header style={{ borderBottom: "1px solid var(--sand-dark)", background: "var(--cream)" }}>
      <style>{`
        @keyframes th-pulse {
          0%,100% {
            text-shadow:
              0 0 4px rgba(197,96,59,0.6),
              0 0 12px rgba(197,96,59,0.3),
              0 0 24px rgba(197,96,59,0.15);
            letter-spacing: 0.02em;
          }
          50% {
            text-shadow:
              0 0 8px rgba(197,96,59,1),
              0 0 22px rgba(197,96,59,0.7),
              0 0 42px rgba(232,140,80,0.45),
              0 0 70px rgba(232,140,80,0.2);
            letter-spacing: 0.04em;
          }
        }
        .th-logo {
          animation: th-pulse 3s ease-in-out infinite;
          color: var(--terracotta);
          font-family: Georgia, serif;
          font-size: 1.5rem;
          font-weight: 700;
          text-decoration: none;
          display: inline-block;
        }
      `}</style>
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="th-logo">
          Third Home
        </Link>

        {/* Links */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "text-sm transition-colors",
                pathname === l.href ? "font-semibold" : "opacity-60 hover:opacity-100"
              )}
              style={{ color: "var(--warm-brown)" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Role switcher */}
        <div className="flex items-center gap-1 rounded-full p-1" style={{ background: "var(--sand)" }}>
          {(["guest", "member", "keeper"] as Role[]).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-all",
                role === r ? roleConfig[r].color + " shadow-sm" : "opacity-50 hover:opacity-80"
              )}
            >
              {roleConfig[r].label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex gap-4 px-6 pb-3 overflow-x-auto">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn("text-sm whitespace-nowrap", pathname === l.href ? "font-semibold" : "opacity-60")}
            style={{ color: "var(--warm-brown)" }}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
