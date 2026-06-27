import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
//import { prisma } from "@/lib/prisma"; // 👈 Using your safe global connection!
import { prisma } from "../../../../lib/prisma";
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
            // 👈 NEW: We explicitly tell Prisma to fetch the tracking numbers
            Member_Profile: { select: { status: true, tracking_no: true } }, 
            Staff_Profile: { select: { status: true, tracking_no: true } }
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

        // 👈 NEW: Extract the tracking number depending on if they are a Member or Staff
        const userTrackingNumber = user.Member_Profile?.tracking_no ?? user.Staff_Profile?.tracking_no;

        return {
          id: user.user_id.toString(),
          email: user.email,
          role: user.role,
          name: userTrackingNumber, // 👈 NEW: Attaches the MTN to the session name!
        };
      }
    })
  ],
  callbacks: {
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
    signIn: "/", 
  }
});

export { handler as GET, handler as POST };