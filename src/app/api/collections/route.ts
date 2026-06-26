import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { assignMissingMemberIdentifiers } from '@/lib/identifiers';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { mtn, volume, source, confirm_no_new_risks } = data;

    if (!mtn) {
      return NextResponse.json({ error: 'Tracking number is required.' }, { status: 400 });
    }

    if (!volume) {
      return NextResponse.json({ error: 'Donation volume is required.' }, { status: 400 });
    }

    const member = await prisma.member_Profiles.findUnique({
      where: { tracking_no: mtn.toUpperCase().trim() }
    });

    if (!member) {
      return NextResponse.json({ error: "No donor profile found matching that Tracking Number." }, { status: 404 });
    }

    // 2. CLINICAL CHECK: Ensure the donor is actually approved to donate!
    if (member.status !== "Approved") {
      return NextResponse.json({ 
        error: `Clinical Reject: This donor is currently marked as '${member.status}'. They must pass a Health Screening first.` 
      }, { status: 403 });
    }

    const latestScreening = await prisma.health_Screenings.findFirst({
      where: { member_id: member.member_id },
      orderBy: { created_at: 'desc' }
    });

    if (!latestScreening) {
      return NextResponse.json({ error: 'Donation requires an approved nurse screening before scheduling a collection.' }, { status: 403 });
    }

    const screeningExpiry = new Date(latestScreening.created_at.getTime() + 90 * 24 * 60 * 60 * 1000);

    if (screeningExpiry <= new Date()) {
      return NextResponse.json({ error: 'The nurse screening has expired after 3 months. Please complete a new screening before donating again.' }, { status: 403 });
    }

    const priorDonations = await prisma.raw_Collections.count({
      where: { donor_id: member.member_id }
    });

    if (priorDonations > 0 && !confirm_no_new_risks) {
      return NextResponse.json({ error: 'Please confirm that no new health risks have emerged since your last screening.' }, { status: 403 });
    }

    await assignMissingMemberIdentifiers(member.member_id, prisma);

    await prisma.raw_Collections.create({
      data: {
        donor_id: member.member_id,
        program_source: source ?? 'Scheduled donation',
        raw_volume_ml: parseInt(volume, 10)
      }
    });

    return NextResponse.json({ message: "Donation appointment requested. Raw collection logged and donor identifier generated if needed." }, { status: 201 });

  } catch (error) {
    console.error("COLLECTION API ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error while logging collection." }, { status: 500 });
  }
}