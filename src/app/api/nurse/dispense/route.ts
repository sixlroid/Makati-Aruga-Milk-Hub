import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { mtn, volume, rtn, cost } = await request.json();
    const requiredVol = Number(volume);

    // 1. Check the Safe Vault for available milk (FIFO sorting by expiry date)
    const availableBatches = await prisma.milk_Batches.findMany({
      where: { lab_status: 'Cleared', current_volume: { gt: 0 } },
      orderBy: { expiry_date: 'asc' } 
    });

    const totalAvailable = availableBatches.reduce((sum, b) => sum + b.current_volume, 0);

    if (totalAvailable < requiredVol) {
      return NextResponse.json({ error: `Insufficient safe milk. Vault has ${totalAvailable}mL, but ${requiredVol}mL is requested.` }, { status: 400 });
    }

    // 2. Process the transaction and deduct volume
    await prisma.$transaction(async (tx) => {
      let remainingToFulfill = requiredVol;
      const member = await tx.member_Profiles.findUnique({ where: { tracking_no: mtn }});
      
      // Grab a staff ID to log the transaction
      const activeStaff = await tx.staff_Profiles.findFirst();

      for (const batch of availableBatches) {
        if (remainingToFulfill <= 0) break;

        const deduct = Math.min(batch.current_volume, remainingToFulfill);
        remainingToFulfill -= deduct;

        // Deduct milk from the batch
        await tx.milk_Batches.update({
          where: { batch_id: batch.batch_id },
          data: { current_volume: batch.current_volume - deduct }
        });

        // Log the official transaction ledger
        await tx.transactions.create({
          data: {
            rtn_reference: rtn,
            receiver_id: member!.member_id,
            batch_id: batch.batch_id,
            dispensed_vol: deduct,
            base_fee: deduct * 2.0,
            deposit_fee: Number(cost) - (deduct * 2.0),
            total_fee: Number(cost),
            processed_by: activeStaff!.staff_id
          }
        });
      }

      // 3. WIPE THE TICKET: Clear the RTN from the Profile so it leaves the queue completely
      await tx.member_Profiles.update({
        where: { tracking_no: mtn },
        data: {
          rtn: null, rtn_status: null, rtn_volume: null, rtn_fee: null,
          rtn_hospital: null, rtn_abstract: null, rtn_prescription: null,
          rtn_remarks: null, rtn_bottle_type: null, rtn_infant_gender: null,
          rtn_dispensing_program: null
        }
      });
    });

    return NextResponse.json({ message: "Dispense complete!" }, { status: 200 });

  } catch (error) {
    console.error("DISPENSE ERROR:", error);
    return NextResponse.json({ error: "Failed to dispense milk." }, { status: 500 });
  }
}