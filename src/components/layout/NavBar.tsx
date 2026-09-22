import Link from "next/link";
import { LayoutDashboard, Landmark, ArrowLeftRight, Settings, Menu, LogOut, Wallet } from "lucide-react";
import { signOut } from "@/lib/auth";
import { NavLink } from "@/components/layout/NavLink";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/settings", label: "Settings", icon: Settings },
];

function SignOutButton({ className }: { className?: string }) {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <Button type="submit" variant="ghost" size="sm" className={className}>
        <LogOut className="size-4" />
        Sign out
      </Button>
    </form>
  );
}

export function NavBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
            <Wallet className="size-5 text-primary" />
            <span className="hidden sm:inline">Expense Tracker</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {LINKS.map((link) => (
              <NavLink key={link.href} href={link.href}>
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="hidden md:block">
          <SignOutButton />
        </div>

        <Sheet>
          <SheetTrigger
            render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" />}
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 text-left">
                <Wallet className="size-5 text-primary" />
                Expense Tracker
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4">
              {LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent"
                  >
                    <Icon className="size-4" />
                    {link.label}
                  </NavLink>
                );
              })}
            </nav>
            <Separator className="my-2" />
            <div className="px-4">
              <SignOutButton className="w-full justify-start" />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
