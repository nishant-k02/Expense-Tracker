import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { Wallet, AlertCircle } from "lucide-react";
import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
    <main className="auth-gradient flex flex-1 items-center justify-center overflow-hidden bg-background px-4 py-12">
      <Card className="w-full max-w-sm border-white/10 bg-card/90 backdrop-blur-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-1 flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Wallet className="size-5" />
          </div>
          <CardTitle className="text-xl tracking-tight">Expense Tracker</CardTitle>
          <CardDescription>Sign in to continue</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle />
              <AlertDescription>Invalid email or password.</AlertDescription>
            </Alert>
          )}

          <form action={authenticate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" name="email" required autoComplete="email" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" name="password" required autoComplete="current-password" />
            </div>
            <Button type="submit" className="mt-2 w-full">
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
