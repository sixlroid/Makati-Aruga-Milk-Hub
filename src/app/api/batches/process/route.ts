import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getToken } from 'next-auth/jwt';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { batch_id, temp, time, mbt_result } = body;

    if (!batch_id) return NextResponse.json({ error: "Batch ID missing." }, { status: 400 });

    const numTemp = parseFloat(temp);
    const numTime = parseInt(time);
    const token = await getToken({ req: request as any });
    const staffId = token?.sub ? Number(token.sub) : 2; 

    // THE FIX: Every single batch goes to the QA Desk now.
    let safetyFlags = null;

    // If temp is too low, time is too short, or MBT fails -> Trigger the Safety Lock!
    if (numTemp < 62.5 || numTime < 30 || mbt_result === 'Failed') {
      safetyFlags = `System Auto-Flag: Temp(${numTemp}°C), Time(${numTime}m), MBT(${mbt_result})`;
    }

    await prisma.$transaction([
      prisma.milk_Batches.update({
        where: { batch_id: Number(batch_id) },
        data: {
          lab_status: 'QA Review', // Everything waits for manual sign-off
          pasteurization_temp: numTemp,
          pasteurization_time: numTime,
          safety_flags: safetyFlags,
          tested_by: staffId
        }
      }),
      prisma.audit_Logs.create({
        data: {
          staff_id: staffId,
          action_type: "Process Batch",
          record_affected: `Batch #${batch_id} sent to QA Desk.`
        }
      })
    ]);

    return NextResponse.json({ message: `Batch #${batch_id} sent to QA.` }, { status: 200 });
  } catch (error) {
    console.error("BATCH PROCESS ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error processing batch." }, { status: 500 });
  }
}