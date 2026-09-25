import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const complaints = await prisma.complaint.findMany({
      where: {
        citizenId: session.user.id,
      },
      include: {
        department: {
          select: { id: true, name: true },
        },
        statusHistory: {
          orderBy: { changedAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ complaints });
  } catch (error) {
    console.error('Error fetching citizen complaints:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
