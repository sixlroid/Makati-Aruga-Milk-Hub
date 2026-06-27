import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { mtn, volume, hospital, bottleType, cost } = data;
    const dispenseVol = parseInt(volume, 10);
    const RATE_PER_ML = 2.0;
    const BOTTLE_DEPOSIT = 50;
    const baseFee = hospital === 'outside_makati' ? dispenseVol * RATE_PER_ML : 0;
    const depositFee = hospital === 'outside_makati' ? BOTTLE_DEPOSIT : 0;
    const totalFee = baseFee + depositFee;

    // 1. Verify the Receiver profile exists
    const receiver = await prisma.member_Profiles.findUnique({
      where: { tracking_no: mtn.toUpperCase().trim() }
    });

    if (!receiver) {
      return NextResponse.json({ error: "No profile found matching that Receiver MTN." }, { status: 404 });
    }

    if (!receiver.rtn) {
      const randomNumbers = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join('');
      const newRtn = `RTN-${randomNumbers}`;
      
      await prisma.member_Profiles.update({
        where: { member_id: receiver.member_id },
        data: { rtn: newRtn }
      });
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
          base_fee: baseFee,
          deposit_fee: depositFee,
          total_fee: totalFee,
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