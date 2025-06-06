import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import type { NextAuthOptions } from "next-auth";

// Read from environment (OpenShift env or .env.local)
const ALLOWED_GITHUB_USERS =
  (process.env.ALLOWED_GITHUB_USERS || "")
    .split(",")
    .map((u) => u.trim().toLowerCase())
    .filter(Boolean);

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      // no custom scope needed, default is enough for public profile
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Get GitHub username from profile (always lowercase!)
      const username =
        (profile as any)?.login?.toLowerCase() ||
        user.name?.toLowerCase() ||
        (user.email ? user.email.split("@")[0].toLowerCase() : "");
      
      console.log(`[AUTH] GitHub sign-in attempt: ${username}`);
      if (process.env.NODE_ENV === "development") {
        console.log("[AUTH] DEV mode, allowing sign-in.");
        return true;
      }
      if (!username) {
        console.log("[AUTH] No username, denying sign-in.");
        return false;
      }
      if (ALLOWED_GITHUB_USERS.length === 0) {
        console.log("[AUTH] No allowed usernames set, denying sign-in.");
        return false;
      }
      const allowed = ALLOWED_GITHUB_USERS.includes(username);
      console.log(`[AUTH] Username "${username}" is ${allowed ? "ALLOWED" : "DENIED"}`);
      return allowed;
    },
    async session({ session, token }) {
      // Optionally: Mark isAdmin only for allowed users
      session.isAdmin =
        session?.user?.name &&
        ALLOWED_GITHUB_USERS.includes(session.user.name.toLowerCase());
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
