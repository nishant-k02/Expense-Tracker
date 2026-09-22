import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const callbackUrl = typeof searchParams.callbackUrl === "string" ? searchParams.callbackUrl : "/dashboard";
  const error = typeof searchParams.error === "string" ? searchParams.error : undefined;

  async function authenticate(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: callbackUrl,
      });
    } catch (err) {
      if (err instanceof AuthError) {
        const params = new URLSearchParams({ error: "CredentialsSignin", callbackUrl });
        redirect(`/login?${params.toString()}`);
      }
      throw err;
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-black/10 p-8 dark:border-white/15">
        <h1 className="text-xl font-semibold">Expense Tracker</h1>
        <p className="mt-1 text-sm text-foreground/60">Sign in to continue</p>

        {error && (
          <p className="mt-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            Invalid email or password.
          </p>
        )}

        <form action={authenticate} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="rounded-md border border-black/10 bg-transparent px-3 py-2 outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Password
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="rounded-md border border-black/10 bg-transparent px-3 py-2 outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40"
            />
          </label>
          <button
            type="submit"
            className="mt-2 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background transition hover:opacity-90"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
