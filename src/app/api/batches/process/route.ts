import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { batch_id, temp, time, mbt_result } = await request.json();

    let finalStatus = "Cleared";
    let safetyFlags = "Passed all QA metrics";
    let expiryDate = new Date();
    
    // Human Milk Bank Standard: Pasteurized milk expires 6 months from processing date
    expiryDate.setMonth(expiryDate.getMonth() + 6);

    // If the bacterial culture failed, the batch is destroyed
    if (mbt_result === "Failed") {
      finalStatus = "Discarded";
      safetyFlags = "FAILED MICROBIOLOGICAL TEST - CONTAMINATED";
      expiryDate = new Date(0); // Void the expiry
    }

    // Update the Master Batch
    await prisma.milk_Batches.update({
      where: { batch_id: Number(batch_id) },
      data: {
        pasteurization_temp: parseFloat(temp),
        pasteurization_time: parseInt(time),
        lab_status: finalStatus,
        safety_flags: safetyFlags,
        expiry_date: expiryDate
      }
    });

    return NextResponse.json({ 
      message: finalStatus === "Cleared" 
        ? "Batch cleared for NICU distribution." 
        : "Batch flagged and discarded." 
    }, { status: 200 });

  } catch (error) {
    console.error("PASTEURIZATION ERROR:", error);
    return NextResponse.json({ error: "Failed to process batch." }, { status: 500 });
  }
}