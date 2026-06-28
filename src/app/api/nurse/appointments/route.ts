import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const appointments = await prisma.donation_Appointments.findMany({
      where: { status: 'Pending' },
      include: { donor: true },
      orderBy: { appointment_date: 'asc' }
    });
    return NextResponse.json(appointments, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { dtn } = await request.json();
    
    // Flip both the appointment AND the member's profile status to Approved!
    await prisma.$transaction(async (tx) => {
      await tx.donation_Appointments.update({
        where: { dtn },
        data: { status: 'Approved' }
      });
      await tx.member_Profiles.update({
        where: { dtn },
        data: { dtn_status: 'approved' }
      });
    });

    return NextResponse.json({ message: "Appointment confirmed!" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to confirm appointment" }, { status: 500 });
  }
}