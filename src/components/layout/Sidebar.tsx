import { LogOut, Wallet } from "lucide-react";
import { auth, signOut } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { SidebarNavLink } from "@/components/layout/SidebarNavLink";
import { NAV_LINKS } from "@/components/layout/nav-links";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export async function Sidebar() {
  const [session, profile] = await Promise.all([auth(), getProfile()]);
  const email = session?.user?.email ?? "";
  const displayName = profile?.name || email;
  const fallback = (profile?.name || email).slice(0, 2).toUpperCase();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col items-center border-r border-sidebar-border bg-sidebar pt-10 text-sidebar-foreground md:flex">
      <Avatar className="size-16">
        {profile?.avatarDataUrl && <AvatarImage src={profile.avatarDataUrl} alt="" />}
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

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
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
    </aside>
  );
}
