import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ComplaintStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();
    const departments = await prisma.department.findMany({
      include: {
        complaints: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            resolvedAt: true,
            slaDeadline: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const performance = departments.map((dept) => {
      const complaints = dept.complaints;
      const total = complaints.length;
      const resolvedList = complaints.filter((c) => c.status === ComplaintStatus.RESOLVED);
      const openList = complaints.filter((c) => c.status !== ComplaintStatus.RESOLVED);

      const resolved = resolvedList.length;
      const open = openList.length;

      const activeBreaches = openList.filter(
        (c) => new Date(c.slaDeadline) < now
      ).length;

      const resolvedLate = resolvedList.filter((c) => {
        if (!c.resolvedAt) return false;
        return new Date(c.resolvedAt) > new Date(c.slaDeadline);
      }).length;

      let avgResolutionHours = 0;
      if (resolvedList.length > 0) {
        const totalDurationMs = resolvedList.reduce((acc, c) => {
          if (!c.resolvedAt) return acc;
          return acc + (new Date(c.resolvedAt).getTime() - new Date(c.createdAt).getTime());
        }, 0);

        const avgMs = totalDurationMs / resolvedList.length;
        avgResolutionHours = Number((avgMs / (1000 * 60 * 60)).toFixed(1));
      }

      const resolvedOnTime = resolved - resolvedLate;
      const complianceRate = resolved > 0 ? Math.round((resolvedOnTime / resolved) * 100) : 100;

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        total,
        open,
        resolved,
        resolvedLate,
        activeBreaches,
        avgResolutionHours,
        complianceRate,
      };
    });

    return NextResponse.json({ performance });
  } catch (error) {
    console.error('Error calculating department performance:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
