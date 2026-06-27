import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { mtn, appointment_date, collection_method } = data;

    const member = await prisma.member_Profiles.findUnique({
      where: { tracking_no: mtn }
    });

    if (!member) return NextResponse.json({ error: "Member profile not found." }, { status: 404 });

    if (!member.eligible_to_donate) {
      return NextResponse.json({ error: "Your clinical clearance is expired or pending." }, { status: 403 });
    }

    const appointment = await prisma.donation_Appointments.create({
      data: {
        donor_id: member.member_id,
        appointment_date: new Date(appointment_date),
        collection_method,
        status: "Scheduled"
      }
    });

    return NextResponse.json({ 
      message: "On-site donation appointment successfully scheduled!" 
    }, { status: 201 });

  } catch (error) {
    console.error("APPOINTMENT ERROR:", error);
    return NextResponse.json({ error: "Failed to schedule appointment." }, { status: 500 });
  }
}