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

        // 1. Find the user by Email OR Tracking Number OR Phone Number
        const user = await prisma.users.findFirst({
          where: {
            OR: [
              { email: credentials.username },
              { Member_Profile: { tracking_no: credentials.username } },
              { Staff_Profile: { tracking_no: credentials.username } },
              { Member_Profile: { phone_number: credentials.username } }
            ]
          }
        });

        if (!user) throw new Error("User not found");

        // 2. Check the password (raw check for now, you can upgrade to bcrypt later)
        if (user.password !== credentials.password) {
          throw new Error("Invalid password");
        }

        // 3. Return the user payload to the session
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