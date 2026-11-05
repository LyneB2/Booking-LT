import type { Metadata } from "next";
import Link from "next/link";
import "./style.css";
export const metadata: Metadata = {
  title: "Booking LT",
  description: "A thoughtful workspace for your complex.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <Link href="/" className="brand">
            Booking <span>LT</span>
          </Link>
          <nav aria-label="Main">
            <Link href="/workspace">My account</Link>
            <Link href="/admin">Platform</Link>
          </nav>
        </header>
        <main>{children}</main>
        <footer>Booking LT · Built around your complex</footer>
      </body>
    </html>
  );
}
