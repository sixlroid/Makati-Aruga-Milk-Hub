import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

// GET: Fetch all active appointments for the Nurse Dashboard
export async function GET() {
  try {
    const appointments = await prisma.donation_Appointments.findMany({
      where: { 
        status: { in: ['Pending', 'Approved'] } // Only show active items
      },
      include: {
        donor: {
          select: { first_name: true, last_name: true, tracking_no: true }
        }
      },
      orderBy: { appointment_date: 'asc' }
    });
    return NextResponse.json(appointments, { status: 200 });
  } catch (error) {
    console.error("FETCH APPOINTMENTS ERROR:", error);
    return NextResponse.json({ error: "Failed to load DTN queue" }, { status: 500 });
  }
}

// PATCH: Approve or Reject a specific DTN ticket
export async function PATCH(request: Request) {
  try {
    const { appointment_id, dtn, status } = await request.json(); // status will be 'Approved' or 'Rejected'

    await prisma.$transaction([
      // 1. Update the appointment history ledger
      prisma.donation_Appointments.update({
        where: { appointment_id },
        data: { status }
      }),
      
      // 2. Update the Member Profile so their dashboard changes state
      prisma.member_Profiles.update({
        where: { dtn },
        data: { dtn_status: status }
      })
    ]);

    return NextResponse.json({ message: `DTN Ticket ${status} successfully.` }, { status: 200 });
  } catch (error) {
    console.error("UPDATE APPOINTMENT ERROR:", error);
    return NextResponse.json({ error: "Failed to update ticket status" }, { status: 500 });
  }
}