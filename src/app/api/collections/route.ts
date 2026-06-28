import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    // This receives the payload from the Nurse Dashboard
    const { dtn, volume, source } = await request.json();

    if (!dtn || !volume) {
      return NextResponse.json({ error: "DTN and Volume are required." }, { status: 400 });
    }

    const appointment = await prisma.donation_Appointments.findUnique({
      where: { dtn },
      include: { donor: true }
    });

    if (!appointment) {
      return NextResponse.json({ error: "Invalid DTN. Appointment not found." }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Create the physical collection log (This adds it to Lab Inventory)
      await tx.raw_Collections.create({
        data: {
          dtn_reference: dtn,
          donor_id: appointment.donor_id,
          program_source: source,
          raw_volume_ml: Number(volume),
        }
      });

      // 2. Mark the appointment as Completed
      await tx.donation_Appointments.update({
        where: { dtn },
        data: { status: "Completed" }
      });

      // 3. WIPE THE TICKET: Clear the DTN from the member profile
      await tx.member_Profiles.update({
        where: { member_id: appointment.donor_id },
        data: {
          dtn: null,
          dtn_status: null
        }
      });
    });

    return NextResponse.json({ message: "Collection logged successfully." }, { status: 200 });
  } catch (error) {
    console.error("COLLECTION ERROR:", error);
    return NextResponse.json({ error: "Failed to process collection." }, { status: 500 });
  }
}