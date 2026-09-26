import { LayoutDashboard, Landmark, ArrowLeftRight, Repeat, Settings } from "lucide-react";

// Kept dependency-free (only lucide-react, safe for the client bundle) and
// separate from Sidebar.tsx — that file transitively pulls in server-only
// code (NextAuth/Prisma) through `@/lib/auth`, which breaks the client build
// for MobileNavSheet if it imports NAV_LINKS from there instead.
export const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/subscriptions", label: "Subscriptions", icon: Repeat },
  { href: "/settings", label: "Settings", icon: Settings },
];
