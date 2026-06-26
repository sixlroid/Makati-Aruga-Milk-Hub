import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const handler = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const normalizedInput = credentials.username.trim();
        const lookupValue = normalizedInput.toLowerCase();

        const user = await prisma.users.findFirst({
          where: {
            OR: [
              { email: normalizedInput },
              { email: { equals: lookupValue, mode: 'insensitive' } },
              { Member_Profile: { phone_number: normalizedInput } },
              { Staff_Profile: { phone_number: normalizedInput } },
              { Member_Profile: { tracking_no: normalizedInput } },
              { Staff_Profile: { tracking_no: normalizedInput } }
            ]
          },
          include: {
            Member_Profile: { select: { status: true } },
            Staff_Profile: { select: { status: true } }
          }
        });

        if (!user) throw new Error("User not found");

        const profileStatus = user.Member_Profile?.status ?? user.Staff_Profile?.status;
        if (profileStatus === "Inactive") {
          throw new Error("Account is inactive");
        }

        if (user.password !== credentials.password) {
          throw new Error("Invalid password");
        }

        return {
          id: user.user_id.toString(),
          email: user.email,
          role: user.role,
        };
      }
    })
  ],
  callbacks: {
    // Pass the role into the token so the frontend knows who is logged in
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
      }
      return session;
    }
  },
  pages: {
    signIn: "/", // If they fail, keep them on the homepage
  }
});

export { handler as GET, handler as POST };