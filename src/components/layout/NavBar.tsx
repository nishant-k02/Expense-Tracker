import Link from "next/link";
import { signOut } from "@/lib/auth";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/accounts", label: "Accounts" },
  { href: "/transactions", label: "Transactions" },
  { href: "/settings", label: "Settings" },
];

export function NavBar() {
  return (
    <header className="border-b border-black/10 dark:border-white/15">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <nav className="flex items-center gap-5">
          <span className="font-semibold">Expense Tracker</span>
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-foreground/70 transition hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" className="text-sm text-foreground/60 hover:text-foreground">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
