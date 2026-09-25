import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const departments = await prisma.department.findMany({
      include: {
        categoryRules: {
          select: { category: true, slaHours: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ departments });
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
