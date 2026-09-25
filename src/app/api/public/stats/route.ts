import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ComplaintStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();

    const [total, resolved, openComplaints] = await Promise.all([
      prisma.complaint.count(),
      prisma.complaint.count({ where: { status: ComplaintStatus.RESOLVED } }),
      prisma.complaint.findMany({
        where: { status: { not: ComplaintStatus.RESOLVED } },
        select: { slaDeadline: true },
      }),
    ]);

    const open = openComplaints.length;
    const activeBreaches = openComplaints.filter((c) => new Date(c.slaDeadline) < now).length;

    return NextResponse.json({
      total,
      open,
      resolved,
      activeBreaches,
    });
  } catch (error) {
    console.error('Error fetching public stats:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
