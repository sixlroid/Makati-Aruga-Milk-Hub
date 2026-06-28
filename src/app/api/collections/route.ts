import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { dtn, volume, source, confirm_no_new_risks } = data;

    // 1. Safety Check
    if (!confirm_no_new_risks) {
      return NextResponse.json({ error: "Nurse must confirm no new health risks." }, { status: 400 });
    }

    const cleanDtn = dtn.replace(/['"]/g, '').trim().toUpperCase();

    // 2. Find the Approved Appointment
    const appointment = await prisma.donation_Appointments.findUnique({
      where: { dtn: dtn }
    });

    if (!appointment) return NextResponse.json({ error: "DTN not found" }, { status: 404 });

    // THE FIX: Automatically clear 'Pending' status if the Nurse checked the amber box
    if (appointment.status !== 'Approved') {
      if (confirm_no_new_risks) {
        // Auto-approve the appointment right now
        await prisma.donation_Appointments.update({
          where: { dtn: dtn },
          data: { status: 'Approved' }
        });
      } else {
        // If the box is unchecked, then block it
        return NextResponse.json({ error: `Cannot intake milk. Ticket status is: ${appointment.status}` }, { status: 400 });
      }
    }

    // 3. The Intake Transaction (Log milk, close ticket)
    await prisma.$transaction([
      // A. Create the Raw Collection in the freezer
      prisma.raw_Collections.create({
        data: {
          dtn_reference: cleanDtn,
          donor_id: appointment.donor_id,
          program_source: source,
          raw_volume_ml: Number(volume),
        }
      }),
      
      // B. Mark the Appointment as Completed
      prisma.donation_Appointments.update({
        where: { dtn: cleanDtn },
        data: { status: 'Completed' }
      }),

      // C. Update Member Profile to free them up for future donations
      prisma.member_Profiles.update({
        where: { member_id: appointment.donor_id },
        data: { 
          dtn: null,   
          dtn_status: null 
        }
      })
    ]);

    return NextResponse.json({ message: "Raw milk successfully logged to cold storage." }, { status: 201 });

  } catch (error) {
    console.error("COLLECTION INTAKE ERROR:", error);
    return NextResponse.json({ error: "Failed to log raw milk intake." }, { status: 500 });
  }
}