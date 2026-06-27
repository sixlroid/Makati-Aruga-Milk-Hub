import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getToken } from 'next-auth/jwt';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { batch_id, temp, time, mbt_result } = body;

    if (!batch_id) {
      return NextResponse.json({ error: "Batch ID is missing." }, { status: 400 });
    }

    // Get the securely logged-in Nurse's ID (Defaults to 2 if testing without auth)
    const token = await getToken({ req: request as any });
    const staffId = token?.sub ? Number(token.sub) : 2; 

    // Determine lab status based on MBT (Microbiological Test) result
    const isPassed = mbt_result === 'Passed';
    const finalLabStatus = isPassed ? "Passed" : "Contaminated / Failed";

    // Auto-calculate expiry date: 6 months from now (Current year: 2026)
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 6);

    await prisma.$transaction([
      // A. Update batch processing metrics and status
      prisma.milk_Batches.update({
        where: { batch_id: Number(batch_id) },
        data: {
          lab_status: finalLabStatus,
          pasteurization_temp: temp ? Number(temp) : null,
          pasteurization_time: time ? Number(time) : null,
          expiry_date: isPassed ? expiry : null,
          tested_by: staffId
        }
      }),

      // B. Create an audit log for accountability
      prisma.audit_Logs.create({
        data: {
          staff_id: staffId,
          action_type: "Process Batch",
          record_affected: `Batch #${batch_id} - ${finalLabStatus}`
        }
      })
    ]);

    return NextResponse.json({ 
      message: `Batch #${batch_id} marked as ${finalLabStatus}.` 
    }, { status: 200 });

  } catch (error) {
    console.error("BATCH PROCESS ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error processing batch." }, { status: 500 });
  }
}