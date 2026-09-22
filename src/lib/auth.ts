import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const allowedEmail = process.env.ALLOWED_USER_EMAIL;
        const passwordHash = process.env.AUTH_PASSWORD_HASH;
        if (!allowedEmail || !passwordHash) {
          throw new Error("Auth is not configured: missing ALLOWED_USER_EMAIL or AUTH_PASSWORD_HASH");
        }

        if (email.toLowerCase() !== allowedEmail.toLowerCase()) {
          return null;
        }

        const valid = await bcrypt.compare(password, passwordHash);
        if (!valid) {
          return null;
        }

        return { id: "owner", email: allowedEmail };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
});
