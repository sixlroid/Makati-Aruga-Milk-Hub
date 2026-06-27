import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma"; // Adjust path to your global prisma

export async function POST(request: Request) {
  try {
    const { rtn, mtn, approved_volume, computed_fee, hospital } = await request.json();

    if (!rtn || !mtn || !approved_volume) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Update the member's RTN ticket to 'approved' and save the nurse's fee/volume
    await prisma.member_Profiles.updateMany({
      where: { 
        tracking_no: mtn,
        rtn: rtn 
      },
      data: {
        rtn_status: 'approved',
        rtn_volume: Number(approved_volume),
        rtn_fee: Number(computed_fee),
        rtn_hospital: hospital
      }
    });

    return NextResponse.json({ message: "Request approved for pickup." }, { status: 200 });
  } catch (error) {
    console.error("NURSE APPROVE ERROR:", error);
    return NextResponse.json({ error: "Failed to approve request." }, { status: 500 });
  }
}