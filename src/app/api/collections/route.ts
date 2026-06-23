import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { mtn, volume, source } = data;

    // 1. Find the donor by their Tracking Number
    const member = await prisma.member_Profiles.findUnique({
      where: { tracking_no: mtn.toUpperCase() }
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

    // 3. Log the Raw Milk Collection into the database
    await prisma.raw_Collections.create({
      data: {
        donor_id: member.member_id,
        program_source: source,
        raw_volume_ml: parseInt(volume),
        // date_collected and batch_id are handled automatically by your Prisma schema
      }
    });

    return NextResponse.json({ message: "Raw collection logged and Unpasteurized Label generated!" }, { status: 201 });

  } catch (error) {
    console.error("COLLECTION API ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error while logging collection." }, { status: 500 });
  }
}