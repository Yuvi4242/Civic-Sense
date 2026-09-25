import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ComplaintStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get('departmentId');
    const category = searchParams.get('category');
    const status = searchParams.get('status') as ComplaintStatus | null;
    const breachedOnly = searchParams.get('breached') === 'true';

    const where: any = {};

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (category) {
      where.category = category;
    }

    if (status && Object.values(ComplaintStatus).includes(status)) {
      where.status = status;
    }

    const complaints = await prisma.complaint.findMany({
      where,
      select: {
        id: true,
        description: true,
        photoUrl: true,
        resolvedPhotoUrl: true,
        latitude: true,
        longitude: true,
        addressText: true,
        category: true,
        severity: true,
        confidence: true,
        needsHumanReview: true,
        slaHours: true,
        slaDeadline: true,
        status: true,
        createdAt: true,
        acknowledgedAt: true,
        inProgressAt: true,
        resolvedAt: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        statusHistory: {
          select: {
            id: true,
            status: true,
            note: true,
            changedAt: true,
          },
          orderBy: { changedAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const now = new Date();

    const publicComplaints = complaints.map((c) => {
      const isResolved = c.status === ComplaintStatus.RESOLVED;
      const isBreached = isResolved
        ? c.resolvedAt ? new Date(c.resolvedAt) > new Date(c.slaDeadline) : false
        : now > new Date(c.slaDeadline);

      return {
        ...c,
        isBreached,
      };
    });

    const filtered = breachedOnly
      ? publicComplaints.filter((c) => c.isBreached)
      : publicComplaints;

    return NextResponse.json({ complaints: filtered });
  } catch (error) {
    console.error('Error fetching public complaints feed:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
