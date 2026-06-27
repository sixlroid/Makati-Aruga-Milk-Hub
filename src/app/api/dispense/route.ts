import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma"; // <-- Safe global connection
import { getToken } from 'next-auth/jwt';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // FIX 1: Extracted BOTH bottle_type (from Member) and bottleType (from Nurse)
    const { mtn, volume, hospital, clinical_abstract, prescription, cost, rtn, infant_gender, bottle_type, bottleType, dispensing_program } = data;
    const dispenseVol = parseInt(volume, 10);

    // 1. Verify the Receiver profile exists
    const receiver = await prisma.member_Profiles.findUnique({
      where: { tracking_no: mtn.toUpperCase().trim() }
    });

    if (!receiver) {
      return NextResponse.json({ error: "No profile found matching that Receiver MTN." }, { status: 404 });
    }

    // =====================================================================
    // BRANCH 1: MEMBER INITIATING A MILK REQUEST (From Member Dashboard)
    // =====================================================================
    if (clinical_abstract !== undefined) {
      // Generate a new RTN Ticket
      const randomNumbers = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join('');
      const newRtn = `RTN-${randomNumbers}`;
      
      await prisma.member_Profiles.update({
        where: { member_id: receiver.member_id },
        data: { 
          rtn: newRtn,
          rtn_status: 'pending', 
          rtn_volume: dispenseVol,
          rtn_hospital: hospital,
          rtn_abstract: clinical_abstract,
          rtn_prescription: prescription,
          rtn_infant_gender: infant_gender,
          rtn_bottle_type: bottle_type,
          rtn_dispensing_program: dispensing_program
        }
      });

      return NextResponse.json({ message: `Request submitted successfully. Your RTN is ${newRtn}.` }, { status: 201 });
    }

    // =====================================================================
    // BRANCH 2: NURSE FINALIZING THE DISPENSE (From Nurse Dashboard)
    // =====================================================================
    // Checks for either spelling of the bottle variable
    if ((bottle_type !== undefined || bottleType !== undefined) && rtn !== undefined) {
      
      const token = await getToken({ req: request as any });
      const nurseId = token?.sub ? Number(token.sub) : 2; 

      const totalFee = cost ? Number(cost) : 0; 
      const RATE_PER_ML = 2.0;
      const BOTTLE_DEPOSIT = 50;
      const baseFee = hospital === 'outside_makati' ? dispenseVol * RATE_PER_ML : 0;
      const depositFee = hospital === 'outside_makati' ? BOTTLE_DEPOSIT : 0;

      const availableBatch = await prisma.milk_Batches.findFirst({
        where: {
          lab_status: 'Passed',
          current_volume: { gte: dispenseVol } 
        },
        orderBy: { expiry_date: 'asc' } 
      });

      if (!availableBatch) {
         return NextResponse.json({ 
           error: "Insufficient safe milk. No single batch currently has enough volume for this request." 
         }, { status: 400 });
      }

      await prisma.$transaction([
        
        // A. Deduct the volume from the Lab's active batch
        prisma.milk_Batches.update({
          where: { batch_id: availableBatch.batch_id },
          data: { current_volume: availableBatch.current_volume - dispenseVol }
        }),
        
        // B. Create the Dispense Transaction Log (Phase 4 completed!)
        prisma.transactions.create({
          data: {
            receiver_id: receiver.member_id,
            dispensed_vol: dispenseVol,
            batch_id: availableBatch.batch_id, 
            base_fee: baseFee,
            deposit_fee: depositFee,
            total_fee: totalFee,
            processed_by: nurseId,
            rtn_reference: rtn, 
          }
        }),

        // C. Clear ALL RTN data from the member (FIX 2: Wiping the new fields too!)
        prisma.member_Profiles.update({
          where: { member_id: receiver.member_id },
          data: {
            rtn: null,
            rtn_status: null,
            rtn_volume: null,
            rtn_fee: null,
            rtn_hospital: null,
            rtn_abstract: null,
            rtn_prescription: null,
            rtn_infant_gender: null,
            rtn_bottle_type: null,
            rtn_dispensing_program: null
          }
        })
      ]);

      return NextResponse.json({ 
        message: `Successfully released ${volume}mL from Batch #${availableBatch.batch_id} to ${mtn.toUpperCase()}! Queue cleared.` 
      }, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid request format." }, { status: 400 });

  } catch (error) {
    console.error("DISPENSE API ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error while processing request." }, { status: 500 });
  }
}