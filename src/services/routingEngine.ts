import { prisma } from '@/lib/prisma';

export interface RouteResult {
  departmentId: string;
  slaHours: number;
}

/**
 * Route a complaint category to its assigned municipal department and SLA hours.
 * Falls back to the 'other' category rule or the default General department if not found.
 */
export async function routeComplaint(category: string): Promise<RouteResult> {
  const normalizedCategory = (category || 'other').toLowerCase().trim();

  // 1. Look up matching CategoryRule
  let rule = await prisma.categoryRule.findUnique({
    where: { category: normalizedCategory },
  });

  // 2. Fall back to 'other' rule
  if (!rule && normalizedCategory !== 'other') {
    rule = await prisma.categoryRule.findUnique({
      where: { category: 'other' },
    });
  }

  if (rule) {
    return {
      departmentId: rule.departmentId,
      slaHours: rule.slaHours,
    };
  }

  // 3. Fallback: Find General department if seed rule wasn't loaded yet
  let generalDept = await prisma.department.findFirst({
    where: { name: { contains: 'General', mode: 'insensitive' } },
  });

  if (!generalDept) {
    generalDept = await prisma.department.findFirst();
  }

  if (!generalDept) {
    throw new Error('No departments available in the database. Please run prisma seed.');
  }

  return {
    departmentId: generalDept.id,
    slaHours: 120, // Default 5 days SLA
  };
}

/**
 * Calculate the immutable SLA deadline: createdAt + slaHours
 */
export function calculateDeadline(createdAt: Date, slaHours: number): Date {
  return new Date(createdAt.getTime() + slaHours * 60 * 60 * 1000);
}
