import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const role = (token?.role as string) || "";

    // Helper: If someone is in the wrong place, automatically route them to their actual home
    const redirectHome = () => {
      if (role === "member_donor_receiver") return NextResponse.redirect(new URL("/portals/member/dashboard", req.url));
      if (role === "nurse") return NextResponse.redirect(new URL("/portals/nurse/dashboard", req.url));
      if (role.includes("lab")) return NextResponse.redirect(new URL("/portals/lab/dashboard", req.url));
      if (role === "admin") return NextResponse.redirect(new URL("/portals/admin/dashboard", req.url));
      return NextResponse.redirect(new URL("/", req.url)); // Fallback to login
    };

    // 🛑 STRICT ROUTE ENFORCEMENT: Match the URL to the exact user role
    if (path.startsWith("/portals/member") && role !== "member_donor_receiver") return redirectHome();
    if (path.startsWith("/portals/nurse") && role !== "nurse") return redirectHome();
    if (path.startsWith("/portals/lab") && !role.includes("lab")) return redirectHome();
    if (path.startsWith("/portals/admin") && role !== "admin") return redirectHome();

    // If they pass the checks, let them through
    return NextResponse.next();
  },
  {
    callbacks: {
      // 🛑 UNAUTHENTICATED BLOCKADE: If they have no token (not logged in), 
      // NextAuth immediately intercepts and kicks them to the sign-in page.
      authorized: ({ token }) => !!token,
    },
  }
);

// Apply this security blanket ONLY to the portals folder and everything inside it
export const config = {
  matcher: ["/portals/:path*"],
};