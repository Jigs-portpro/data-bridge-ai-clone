import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      sessionId?: string;
    } & DefaultSession['user'];
  }

  interface User {
    sessionId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    sessionId?: string;
  }
} 