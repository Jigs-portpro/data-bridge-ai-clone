import axios from 'axios';
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, }) {
      try {
        const { id_token }: any = account ?? {};

        const payload = {
          role: "admin",
          deviceType: "WEB",
          adminToken: id_token,
          flushPreviousSessions: true,
        };

        // Only allow @portpro.io emails
        if (!user.email?.endsWith("@portpro.io")) {
          return false;
        }

        const url = process.env.NEXT_PUBLIC_BASE_URI + '/login';
        await axios.post(url, payload, {
          headers: {
            "Content-Type": "application/json",
          },
        });
        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    },
    async session({ session }) {
      // Optionally add custom session fields here
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST }; 