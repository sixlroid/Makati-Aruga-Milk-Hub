import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { assignMissingMemberIdentifiers } from '@/lib/identifiers';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

async function findMemberByTracking(input: string) {
  const normalized = input.toUpperCase().trim();

  return prisma.member_Profiles.findFirst({
    where: {
      OR: [
        { tracking_no: normalized },
        { dtn: normalized },
        { rtn: normalized }
      ]
    }
  });
}

export async function GET(request: NextRequest) {
  try {
    const mtn = request.nextUrl.searchParams.get('mtn');

    if (!mtn) {
      return NextResponse.json({ error: 'Missing tracking number parameter.' }, { status: 400 });
    }

    const member = await findMemberByTracking(mtn);

    if (!member) {
      return NextResponse.json({ error: 'No member profile found.' }, { status: 404 });
    }

    const withIdentifiers = await assignMissingMemberIdentifiers(member.member_id, prisma);
    const history = await prisma.raw_Collections.findMany({
      where: { donor_id: member.member_id },
      orderBy: { date_collected: 'desc' }
    });

    return NextResponse.json({ member: withIdentifiers, history }, { status: 200 });
  } catch (error) {
    console.error('MEMBER PORTAL API ERROR:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const data = await request.json();
    const tracking = data.tracking_no || data.mtn;

    if (!tracking) {
      return NextResponse.json({ error: 'Tracking number is required.' }, { status: 400 });
    }

    const member = await findMemberByTracking(tracking);

    if (!member) {
      return NextResponse.json({ error: 'No member profile found.' }, { status: 404 });
    }

    const updatedMember = await prisma.member_Profiles.update({
      where: { member_id: member.member_id },
      data: {
        first_name: data.first_name ?? member.first_name,
        last_name: data.last_name ?? member.last_name,
        middle_initial: data.middle_initial ?? member.middle_initial,
        email: data.email ?? member.email,
        phone_number: data.phone_number ?? member.phone_number,
        medical_docs: data.medical_docs ?? member.medical_docs
      }
    });

    const withIdentifiers = await assignMissingMemberIdentifiers(updatedMember.member_id, prisma);

    return NextResponse.json({ member: withIdentifiers }, { status: 200 });
  } catch (error) {
    console.error('MEMBER PROFILE UPDATE ERROR:', error);
    return NextResponse.json({ error: 'Unable to update profile.' }, { status: 500 });
  }
}