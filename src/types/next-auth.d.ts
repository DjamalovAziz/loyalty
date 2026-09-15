declare module 'next-auth' {
  import { NextAuthOptions, Session, User } from 'next-auth/core';
  
  interface DefaultSession {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    expires: string;
  }
  
  export type { DefaultSession, NextAuthOptions, Session, User };
  
  const NextAuth: (options: NextAuthOptions) => any;
  export default NextAuth;
}

declare module 'next-auth/providers/credentials' {
  const CredentialsProvider: any;
  export default CredentialsProvider;
}

declare module 'next-auth/react' {
  export const signIn: any;
  export const useSession: any;
  export const getSession: any;
  export const getServerSession: any;
  export const SessionProvider: any;
}
