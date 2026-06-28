import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { mtn, appointment_date, collection_method } = await request.json();

    if (!mtn || !appointment_date) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const member = await prisma.member_Profiles.findUnique({
      where: { tracking_no: mtn }
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    // Generate a new Donor Tracking Number (DTN)
    const uniqueSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const generatedDtn = `DTN-${Date.now().toString().slice(-5)}${uniqueSuffix}`;

    await prisma.$transaction(async (tx) => {
      // 1. Create the official appointment
      await tx.donation_Appointments.create({
        data: {
          dtn: generatedDtn,
          donor_id: member.member_id,
          appointment_date: new Date(appointment_date),
          collection_method: collection_method || "Breast Pumped",
          status: "Pending"
        }
      });

      // 2. Lock the member profile into the Pending state
      await tx.member_Profiles.update({
        where: { tracking_no: mtn },
        data: {
          dtn: generatedDtn,
          dtn_status: 'pending'
        }
      });
    });

    return NextResponse.json({ message: "Donation appointment scheduled.", dtn: generatedDtn }, { status: 200 });
  } catch (error) {
    console.error("DONATION SCHEDULING ERROR:", error);
    return NextResponse.json({ error: "Failed to schedule donation." }, { status: 500 });
  }
}