import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { mtn, volume, hospital, bottleType, cost } = data;
    const dispenseVol = parseInt(volume);

    // 1. Verify the Receiver profile exists
    const receiver = await prisma.member_Profiles.findUnique({
      where: { tracking_no: mtn.toUpperCase() }
    });

    if (!receiver) {
      return NextResponse.json({ error: "No profile found matching that Receiver MTN." }, { status: 404 });
    }

    // 2. NEW: Find an available Pasteurized Batch with enough volume! (FIFO Strategy)
    const availableBatch = await prisma.milk_Batches.findFirst({
      where: {
        lab_status: 'Passed',
        current_volume: { gte: dispenseVol } // Must have enough milk to fulfill the request
      },
      orderBy: { expiry_date: 'asc' } // Grab the oldest expiring milk first to prevent waste!
    });

    if (!availableBatch) {
       return NextResponse.json({ 
         error: "Insufficient safe milk. No single batch currently has enough volume for this request." 
       }, { status: 400 });
    }

    // 3. ATOMIC TRANSACTION: Update the Lab Vault AND log the transaction simultaneously
    await prisma.$transaction([
      // A. Deduct the volume from the Lab's active batch
      prisma.milk_Batches.update({
        where: { batch_id: availableBatch.batch_id },
        data: { current_volume: availableBatch.current_volume - dispenseVol }
      }),
      // B. Create the Dispense Transaction using the REAL batch_id
      prisma.transactions.create({
        data: {
          receiver_id: receiver.member_id,
          dispensed_vol: dispenseVol,
          batch_id: availableBatch.batch_id, // NO MORE HARDCODED BATCH ID!
          base_fee: cost,
          deposit_fee: 0,
          total_fee: cost,
          processed_by: 2, // (Note: We keep Nurse ID 2 until we connect the NextAuth login system!)
        }
      })
    ]);

    return NextResponse.json({ 
      message: `Successfully released ${volume}mL from Batch #${availableBatch.batch_id} to ${mtn.toUpperCase()}!` 
    }, { status: 201 });

  } catch (error) {
    console.error("DISPENSE API ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error while processing release." }, { status: 500 });
  }
}