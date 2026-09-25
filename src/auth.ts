import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.email || token?.email) {
        const email = user?.email || (token.email as string);
        const dbUser = await prisma.user.findUnique({
          where: { email },
          select: { id: true, role: true, departmentId: true },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.departmentId = dbUser.departmentId;
        } else if (user?.id) {
          token.id = user.id;
          token.role = Role.CITIZEN;
          token.departmentId = null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as Role) || Role.CITIZEN;
        session.user.departmentId = (token.departmentId as string | null) || null;
      }
      return session;
    },
  },
});
