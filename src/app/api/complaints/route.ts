import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';
import { classifyComplaint } from '@/services/classifier';
import { routeComplaint, calculateDeadline } from '@/services/routingEngine';
import { ComplaintStatus, Severity, Role } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to submit a complaint.' }, { status: 401 });
    }

    const formData = await req.formData();
    const description = (formData.get('description') as string) || '';
    const file = formData.get('photo') as File | null;
    const addressText = (formData.get('addressText') as string) || null;
    const latStr = formData.get('latitude') as string | null;
    const lngStr = formData.get('longitude') as string | null;

    if (!description.trim()) {
      return NextResponse.json({ error: 'Description is required.' }, { status: 400 });
    }

    const latitude = latStr ? parseFloat(latStr) : null;
    const longitude = lngStr ? parseFloat(lngStr) : null;

    let photoUrl = '';

    // Upload photo to Vercel Blob if provided
    if (file && file.size > 0) {
      try {
        if (process.env.BLOB_READ_WRITE_TOKEN) {
          const blob = await put(`complaints/${Date.now()}-${file.name}`, file, {
            access: 'public',
          });
          photoUrl = blob.url;
        } else {
          // Local base64 fallback for offline/development if token is not yet provided
          const buffer = Buffer.from(await file.arrayBuffer());
          photoUrl = `data:${file.type || 'image/jpeg'};base64,${buffer.toString('base64')}`;
        }
      } catch (uploadError) {
        console.warn('Blob upload failed, falling back to data URL:', uploadError);
        const buffer = Buffer.from(await file.arrayBuffer());
        photoUrl = `data:${file.type || 'image/jpeg'};base64,${buffer.toString('base64')}`;
      }
    }

    // 1. Run AI Classifier (Gemini Vision / heuristics)
    const classification = await classifyComplaint(photoUrl, description);

    // 2. Run Routing + SLA Engine
    const routing = await routeComplaint(classification.category);

    const now = new Date();
    const slaDeadline = calculateDeadline(now, routing.slaHours);

    // 3. Persist Complaint & initial StatusHistory transactionally
    const complaint = await prisma.$transaction(async (tx) => {
      const newComplaint = await tx.complaint.create({
        data: {
          citizenId: session.user.id,
          description,
          photoUrl: photoUrl || '/placeholder-issue.png',
          latitude,
          longitude,
          addressText,
          category: classification.category,
          severity: classification.severity as Severity,
          confidence: classification.confidence,
          needsHumanReview: classification.needsHumanReview,
          departmentId: routing.departmentId,
          slaHours: routing.slaHours,
          slaDeadline,
          status: ComplaintStatus.SUBMITTED,
          createdAt: now,
        },
        include: {
          department: {
            select: { id: true, name: true },
          },
        },
      });

      await tx.statusHistory.create({
        data: {
          complaintId: newComplaint.id,
          status: ComplaintStatus.SUBMITTED,
          note: `Complaint submitted by citizen and auto-classified as "${classification.category}".`,
          changedById: session.user.id,
          changedAt: now,
        },
      });

      return newComplaint;
    });

    return NextResponse.json({
      message: 'Complaint submitted and auto-routed successfully.',
      complaint,
    }, { status: 201 });
  } catch (error) {
    console.error('Error submitting complaint:', error);
    return NextResponse.json({ error: 'Internal server error while processing complaint.' }, { status: 500 });
  }
}

/**
 * GET /api/complaints — staff/admin, scoped to departmentId unless admin
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const { role, departmentId } = session.user;

    if (role !== Role.DEPARTMENT_STAFF && role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden. Staff or Admin role required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') as ComplaintStatus | null;

    // Build role-scoped where clause
    const where: any = {};

    if (role === Role.DEPARTMENT_STAFF) {
      if (!departmentId) {
        return NextResponse.json({ error: 'No department assigned to your staff account.' }, { status: 403 });
      }
      where.departmentId = departmentId;
    }

    if (statusFilter && Object.values(ComplaintStatus).includes(statusFilter)) {
      where.status = statusFilter;
    }

    const complaints = await prisma.complaint.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        statusHistory: {
          include: { changedBy: { select: { name: true, email: true, role: true } } },
          orderBy: { changedAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ complaints });
  } catch (error) {
    console.error('Error fetching department complaints:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
