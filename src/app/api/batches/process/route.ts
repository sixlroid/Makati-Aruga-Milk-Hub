import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { batch_id, temp, time, mbt_result } = await request.json();

    const numTemp = parseFloat(temp);
    const numTime = parseInt(time);

    // Traffic Light 3: The Automated System Check
    let newStatus = 'Cleared'; // Default assumption: The milk is safe for the NICU
    let safetyFlags = null;

    // If the temp is too low, the time is too short, or it fails the bio test...
    if (numTemp < 62.5 || numTime < 30 || mbt_result === 'Failed') {
      newStatus = 'Flagged'; // Throw it to the QA Desk!
      safetyFlags = `System Auto-Flag: Temp(${numTemp}°C), Time(${numTime}m), MBT(${mbt_result})`;
    }

    await prisma.milk_Batches.update({
      where: { batch_id: Number(batch_id) },
      data: {
        pasteurization_temp: numTemp,
        pasteurization_time: numTime,
        lab_status: newStatus,
        safety_flags: safetyFlags
      }
    });

    return NextResponse.json({ message: "Batch processed successfully" }, { status: 200 });
  } catch (error) {
    console.error("Batch Processing Error:", error);
    return NextResponse.json({ error: "Failed to process batch" }, { status: 500 });
  }
}