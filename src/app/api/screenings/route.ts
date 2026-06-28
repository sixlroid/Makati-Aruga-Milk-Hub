import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { dtn } = await request.json();

    if (!dtn) return NextResponse.json({ error: "DTN is required" }, { status: 400 });

    const appointment = await prisma.donation_Appointments.findUnique({
      where: { dtn: dtn }
    });

    if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    // Execute the Approval Transaction
    await prisma.$transaction(async (tx) => {
      // 1. Mark appointment as officially approved
      await tx.donation_Appointments.update({
        where: { dtn: dtn },
        data: { status: 'Approved' }
      });

      // 2. Update the member's profile to clear them for future donations
      if (appointment.donor_id) {
        await tx.member_Profiles.update({
          where: { member_id: appointment.donor_id },
          data: { eligible_to_donate: true }
        });
      }
    });

    return NextResponse.json({ message: "Appointment officially confirmed and cleared for intake." }, { status: 200 });
  } catch (error) {
    console.error("SCREENING ERROR:", error);
    return NextResponse.json({ error: "Failed to process screening." }, { status: 500 });
  }
}