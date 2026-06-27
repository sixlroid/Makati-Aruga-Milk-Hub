import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "../../../../lib/prisma"; // Safely using global prisma

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

    /// FETCH 1: The original Donations ledger
    const history = await prisma.raw_Collections.findMany({
      where: { donor_id: member.member_id }, // <-- Fixed: uses donor_id
      orderBy: { date_collected: 'desc' }
    });

    // FETCH 2: The new Dispensing/Received ledger
    const receivedMilkHistory = await prisma.transactions.findMany({
      where: { receiver_id: member.member_id },
      orderBy: { timestamp: 'desc' } // <-- Fixed: uses timestamp
    });

    // FETCH 3: The Health Screening status
    const latestScreening = await prisma.health_Screenings.findFirst({
      where: { member_id: member.member_id },
      orderBy: { created_at: 'desc' }
    });

    const screeningValidUntil = latestScreening
      ? new Date(latestScreening.created_at.getTime() + 90 * 24 * 60 * 60 * 1000)
      : null;

    const screeningValid = screeningValidUntil ? screeningValidUntil > new Date() : false;

    return NextResponse.json({
      member: {
        ...member,
        last_screening_at: latestScreening?.created_at.toISOString() ?? null,
        screening_valid_until: screeningValidUntil?.toISOString() ?? null,
        screening_valid: screeningValid,
        screening_expired: !!latestScreening && !screeningValid,
        eligible_to_donate: member.status === 'Approved' && screeningValid,
        has_previous_donations: history.length > 0
      },
      history, // This sends the donations back to the frontend
      receivedMilkHistory // This sends the newly acquired milk back to the frontend
    }, { status: 200 });

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

    return NextResponse.json({ member: updatedMember }, { status: 200 });
  } catch (error) {
    console.error('MEMBER PROFILE UPDATE ERROR:', error);
    return NextResponse.json({ error: 'Unable to update profile.' }, { status: 500 });
  }
}