import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const departments = await prisma.department.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ users, departments });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, email, role, departmentId } = body;

    if (!userId && !email) {
      return NextResponse.json({ error: 'userId or email is required.' }, { status: 400 });
    }

    if (!role || !Object.values(Role).includes(role)) {
      return NextResponse.json({ error: 'Valid role (CITIZEN, DEPARTMENT_STAFF, ADMIN) is required.' }, { status: 400 });
    }

    // If role is DEPARTMENT_STAFF, ensure departmentId is valid
    if (role === Role.DEPARTMENT_STAFF && !departmentId) {
      return NextResponse.json({ error: 'departmentId is required for DEPARTMENT_STAFF role.' }, { status: 400 });
    }

    const targetUser = await prisma.user.update({
      where: userId ? { id: userId } : { email },
      data: {
        role,
        departmentId: role === Role.DEPARTMENT_STAFF ? departmentId : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
      },
    });

    return NextResponse.json({
      message: 'User updated successfully.',
      user: targetUser,
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
