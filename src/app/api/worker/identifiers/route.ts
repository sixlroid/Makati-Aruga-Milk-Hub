import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { assignMissingMemberIdentifiers } from '@/lib/identifiers';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const tracking = data.tracking_no;

    if (!tracking) {
      return NextResponse.json({ error: 'Tracking number is required.' }, { status: 400 });
    }

    const member = await prisma.member_Profiles.findFirst({
      where: {
        OR: [
          { tracking_no: tracking.toUpperCase().trim() },
          { dtn: tracking.toUpperCase().trim() },
          { rtn: tracking.toUpperCase().trim() }
        ]
      }
    });

    if (!member) {
      return NextResponse.json({ error: 'Member profile not found.' }, { status: 404 });
    }

    const result = await assignMissingMemberIdentifiers(member.member_id, prisma);

    return NextResponse.json({ message: 'Identifiers generated successfully.', member: result }, { status: 200 });
  } catch (error) {
    console.error('IDENTIFIER WORKER ERROR:', error);
    return NextResponse.json({ error: 'Unable to generate identifiers.' }, { status: 500 });
  }
}
