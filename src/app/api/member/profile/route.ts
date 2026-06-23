import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// CRITICAL: Tells Next.js to completely disable caching for this route handler
export const dynamic = 'force-dynamic'; 

export async function GET(request: NextRequest) {
  try {
    const mtn = request.nextUrl.searchParams.get('mtn');

    if (!mtn) {
      return NextResponse.json({ error: "Missing tracking number parameter." }, { status: 400 });
    }

    // Fetch the target profile out of the database mapping index
    const member = await prisma.member_Profiles.findUnique({
      where: { tracking_no: mtn.toUpperCase().trim() }
    });

    if (!member) {
      return NextResponse.json({ error: "No member profile found." }, { status: 404 });
    }

    // Pull historical records matching their verified ID
    const history = await prisma.raw_Collections.findMany({
      where: { donor_id: member.member_id },
      orderBy: { date_collected: 'desc' }
    });

    return NextResponse.json({ member, history }, { status: 200 });

  } catch (error) {
    console.error("MEMBER PORTAL API ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}