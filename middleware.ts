import { withAuth } from "next-auth/middleware";

// First line of defence. Every admin page and API route also checks the role itself (lib/session.ts).
export default withAuth({
  pages: { signIn: "/login" },
  callbacks: {
    authorized: ({ token, req }) => {
      if (!token) return false;
      if (req.nextUrl.pathname.startsWith("/admin")) return token.role !== undefined && token.role !== "GUEST";
      return true;
    },
  },
});

export const config = { matcher: ["/admin/:path*", "/dashboard/:path*"] };
