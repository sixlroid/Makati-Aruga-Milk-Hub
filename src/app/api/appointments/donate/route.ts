import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { mtn, appointment_date, collection_method, confirm_no_new_risks } = data;

    // 1. Clean the MTN to prevent invisible quote errors
    const cleanMtn = mtn.replace(/['"]/g, '').trim().toUpperCase();

    // 2. Validate the Member
    const member = await prisma.member_Profiles.findUnique({
      where: { tracking_no: cleanMtn }
    });

    if (!member) {
      return NextResponse.json({ error: "Member profile not found." }, { status: 404 });
    }

    // Optional but good: Check if they already have an active pending appointment
    if (member.dtn && member.dtn_status !== "Completed" && member.dtn_status !== "Rejected") {
        return NextResponse.json({ error: "You already have an active donation appointment scheduled." }, { status: 400 });
    }

    // 3. Generate the Unique DTN (Donor Tracking Number) Ticket
    const generatedDtn = `DTN-${Math.floor(100000 + Math.random() * 900000)}`;

    // 4. Execute the DB Transaction
    await prisma.$transaction([
      
      // A. Create the actual appointment ledger entry
      prisma.donation_Appointments.create({
        data: {
          dtn: generatedDtn,
          donor_id: member.member_id,
          appointment_date: new Date(appointment_date),
          collection_method,
          status: "Pending" // Starts as pending for Nurse review
        }
      }),

      // B. Update the Member's profile to hold the active ticket
      prisma.member_Profiles.update({
        where: { tracking_no: cleanMtn },
        data: {
          dtn: generatedDtn,
          dtn_status: "Pending"
        }
      })
    ]);

    return NextResponse.json({ 
      message: "Appointment scheduled! Waiting for clinical review.",
      dtn: generatedDtn
    }, { status: 201 });

  } catch (error) {
    console.error("DONATION SCHEDULING ERROR:", error);
    return NextResponse.json({ error: "Failed to schedule appointment." }, { status: 500 });
  }
}