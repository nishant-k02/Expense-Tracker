"use client";

import { usePathname } from "next/navigation";
import { Menu, Wallet, LogOut } from "lucide-react";
import { NAV_LINKS } from "@/components/layout/Sidebar";
import { SidebarNavLink } from "@/components/layout/SidebarNavLink";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function MobileNavSheet({
  displayName,
  fallback,
  avatarDataUrl,
  onSignOut,
}: {
  displayName: string;
  fallback: string;
  avatarDataUrl: string | null;
  onSignOut: () => Promise<void>;
}) {
  const pathname = usePathname();

  return (
    // The mobile header lives in the layout, not the page, so it never
    // remounts on navigation — keying the (otherwise uncontrolled) Sheet by
    // the route forces a fresh instance on every navigation, resetting its
    // internal open state instead of leaving it open across route changes.
    <Sheet key={pathname}>
      <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Open menu" />}>
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="right" className="flex w-64 flex-col items-center bg-sidebar pt-8 text-sidebar-foreground">
        <SheetHeader className="sr-only">
          <SheetTitle>Expense Tracker menu</SheetTitle>
        </SheetHeader>

        <Avatar className="size-16">
          {avatarDataUrl && <AvatarImage src={avatarDataUrl} alt="" />}
          <AvatarFallback className="bg-sidebar-accent text-lg font-medium text-sidebar-accent-foreground">
            {fallback}
          </AvatarFallback>
        </Avatar>
        <p className="mt-3 max-w-full truncate px-3 text-sm font-medium text-sidebar-foreground">{displayName}</p>

        <nav className="mt-10 flex w-full flex-1 flex-col gap-3 px-5">
          {NAV_LINKS.map((link) => (
            <SidebarNavLink key={link.href} href={link.href} icon={<link.icon className="size-4" />}>
              {link.label}
            </SidebarNavLink>
          ))}

          <form action={onSignOut}>
            <Button
              type="submit"
              variant="ghost"
              className="h-auto w-full justify-start gap-3 px-4 py-3 text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </form>
        </nav>

        <div className="mb-6 flex flex-col items-center gap-1.5">
          <Wallet className="size-4 text-primary" />
          <span className="text-sm font-semibold tracking-tight text-primary">Expense Tracker</span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
