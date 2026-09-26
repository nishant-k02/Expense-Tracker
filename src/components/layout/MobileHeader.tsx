import { Wallet } from "lucide-react";
import { auth, signOut } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { MobileNavSheet } from "@/components/layout/MobileNavSheet";

export async function MobileHeader() {
  const [session, profile] = await Promise.all([auth(), getProfile()]);
  const email = session?.user?.email ?? "";
  const displayName = profile?.name || email;
  const fallback = (profile?.name || email).slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex items-center gap-2 font-semibold tracking-tight">
        <Wallet className="size-5 text-primary" />
        Expense Tracker
      </div>

      <MobileNavSheet
        displayName={displayName}
        fallback={fallback}
        avatarDataUrl={profile?.avatarDataUrl ?? null}
        onSignOut={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      />
    </header>
  );
}
