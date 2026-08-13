import type { Metadata } from "next";
import "./globals.css";
import { RoleProvider } from "@/lib/role-context";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "HOME — Wolfsburg",
  description: "A collectively-owned temporary living space in Wolfsburg",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ background: "var(--background)", color: "var(--foreground)" }}>
        <RoleProvider>
          <Nav />
          <main>{children}</main>
        </RoleProvider>
      </body>
    </html>
  );
}
