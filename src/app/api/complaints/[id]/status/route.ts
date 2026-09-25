import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';
import { ComplaintStatus, Role } from '@prisma/client';

const VALID_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus | null> = {
  SUBMITTED: ComplaintStatus.ACKNOWLEDGED,
  ACKNOWLEDGED: ComplaintStatus.IN_PROGRESS,
  IN_PROGRESS: ComplaintStatus.RESOLVED,
  RESOLVED: null,
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const { role, departmentId } = session.user;
    if (role !== Role.DEPARTMENT_STAFF && role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden. Staff or Admin role required.' }, { status: 403 });
    }

    const complaintId = params.id;
    if (!complaintId) {
      return NextResponse.json({ error: 'Complaint ID is required.' }, { status: 400 });
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) {
      return NextResponse.json({ error: 'Complaint not found.' }, { status: 404 });
    }

    // 1. Department ownership check
    if (role === Role.DEPARTMENT_STAFF && complaint.departmentId !== departmentId) {
      return NextResponse.json({
        error: 'Forbidden. You can only update complaints assigned to your department.',
      }, { status: 403 });
    }

    let nextStatus: ComplaintStatus;
    let note: string | null = null;
    let resolvedPhotoUrl: string | null = null;

    // Check if request is formData or JSON
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      nextStatus = formData.get('status') as ComplaintStatus;
      note = (formData.get('note') as string) || null;
      const file = formData.get('proofPhoto') as File | null;

      if (file && file.size > 0) {
        try {
          if (process.env.BLOB_READ_WRITE_TOKEN) {
            const blob = await put(`resolutions/${Date.now()}-${file.name}`, file, {
              access: 'public',
            });
            resolvedPhotoUrl = blob.url;
          } else {
            const buffer = Buffer.from(await file.arrayBuffer());
            resolvedPhotoUrl = `data:${file.type || 'image/jpeg'};base64,${buffer.toString('base64')}`;
          }
        } catch (err) {
          console.warn('Resolution photo upload failed, using data url fallback:', err);
          const buffer = Buffer.from(await file.arrayBuffer());
          resolvedPhotoUrl = `data:${file.type || 'image/jpeg'};base64,${buffer.toString('base64')}`;
        }
      }
    } else {
      const body = await req.json();
      nextStatus = body.status;
      note = body.note || null;
      resolvedPhotoUrl = body.resolvedPhotoUrl || null;
    }

    // 2. Strict status transition state machine check
    const expectedNext = VALID_TRANSITIONS[complaint.status];
    if (!expectedNext || nextStatus !== expectedNext) {
      return NextResponse.json({
        error: `Invalid status transition from "${complaint.status}" to "${nextStatus}". Expected next status is "${expectedNext || 'None (Already Resolved)'}".`,
      }, { status: 400 });
    }

    const now = new Date();
    const updateData: any = {
      status: nextStatus,
    };

    if (nextStatus === ComplaintStatus.ACKNOWLEDGED) {
      updateData.acknowledgedAt = now;
    } else if (nextStatus === ComplaintStatus.IN_PROGRESS) {
      updateData.inProgressAt = now;
    } else if (nextStatus === ComplaintStatus.RESOLVED) {
      updateData.resolvedAt = now;
      if (resolvedPhotoUrl) {
        updateData.resolvedPhotoUrl = resolvedPhotoUrl;
      }
    }

    // 3. Update complaint and insert immutable audit trail in transaction
    const updatedComplaint = await prisma.$transaction(async (tx) => {
      const updated = await tx.complaint.update({
        where: { id: complaintId },
        data: updateData,
        include: {
          department: { select: { id: true, name: true } },
        },
      });

      await tx.statusHistory.create({
        data: {
          complaintId,
          status: nextStatus,
          note: note || `Status transitioned to ${nextStatus}`,
          changedById: session.user.id,
          changedAt: now,
        },
      });

      return updated;
    });

    return NextResponse.json({
      message: `Status updated to ${nextStatus} successfully.`,
      complaint: updatedComplaint,
    });
  } catch (error) {
    console.error('Error updating complaint status:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
