import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { rtn, mtn } = await request.json();

    await prisma.member_Profiles.updateMany({
      where: { tracking_no: mtn, rtn: rtn },
      data: { 
        rtn_status: 'rejected',
        rtn_remarks: 'Rejected by Nurse. Please contact the facility or upload clearer documents.'
      }
    });

    return NextResponse.json({ message: "Request rejected." }, { status: 200 });
  } catch (error) {
    console.error("REJECT ERROR:", error);
    return NextResponse.json({ error: "Failed to reject." }, { status: 500 });
  }
}