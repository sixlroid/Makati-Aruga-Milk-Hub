import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Safely extract the checkbox no matter what the frontend named it
    const confirmRisk = body.confirm_no_new_risks || body.confirmRisks; 

    if (!confirmRisk) {
      return NextResponse.json({ error: "Nurse must confirm no new health risks." }, { status: 400 });
    }

    const appointment = await prisma.donation_Appointments.findUnique({
      where: { dtn: body.dtn }
    });

    if (!appointment) return NextResponse.json({ error: "DTN not found" }, { status: 404 });

    // Auto-Approve the ticket if it's still pending
    if (appointment.status !== 'Approved') {
      await prisma.donation_Appointments.update({
        where: { dtn: body.dtn },
        data: { status: 'Approved' }
      });
    }

    const volNum = parseInt(body.volume);

    // Find any ghost milk
    const ghostMilk = await prisma.raw_Collections.aggregate({
      _sum: { raw_volume_ml: true },
      where: { batch_id: null }
    });
    const ghostVol = ghostMilk._sum.raw_volume_ml || 0;
    
    // Combine the newly logged milk with the ghost milk
    const totalPooledVol = volNum + ghostVol;

    // Execute the database transaction
    await prisma.$transaction(async (tx) => {
      // 1. Create the single Lab Batch with the combined volume
      const newBatch = await tx.milk_Batches.create({
        data: {
          pooled_volume: totalPooledVol,
          current_volume: totalPooledVol,
          lab_status: 'Pending' // pasteurization_temp is null by default
        }
      });

      // 2. Create the raw collection for the current bottle and attach it to the batch
      await tx.raw_Collections.create({
        data: {
          dtn_reference: body.dtn,
          donor_id: appointment.donor_id,
          program_source: body.source,
          raw_volume_ml: volNum,
          batch_id: newBatch.batch_id
        }
      });

      // 3. VACUUM THE GHOST MILK: Attach all unassigned milk to this new batch!
      if (ghostVol > 0) {
        await tx.raw_Collections.updateMany({
          where: { batch_id: null },
          data: { batch_id: newBatch.batch_id }
        });
      }

      // 4. Mark appointment as Completed
      await tx.donation_Appointments.update({
        where: { dtn: body.dtn },
        data: { status: 'Completed' }
      });

      // 5. THE FIX: Update the Member's Profile status so their dashboard resets!
      await tx.member_Profiles.update({
        where: { member_id: appointment.donor_id },
        data: { dtn_status: 'Completed', dtn: null }
      });
    });

    return NextResponse.json({ message: "Milk logged and automatically batched for the lab!" }, { status: 200 });

  } catch (error) {
    console.error("COLLECTION ERROR:", error);
    return NextResponse.json({ error: "Failed to process collection." }, { status: 500 });
  }
}