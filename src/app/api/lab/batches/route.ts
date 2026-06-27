import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
// Import your auth options if they live elsewhere: import { authOptions } from "@/lib/auth";

// GET: Feed the "Incoming Raw Storage Matrix"
export async function GET() {
  try {
    const pendingBottles = await prisma.raw_Collections.findMany({
      where: { batch_id: null },
      include: { donor: { select: { tracking_no: true } } },
      orderBy: { date_collected: 'asc' }
    });
    return NextResponse.json(pendingBottles, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load matrix" }, { status: 500 });
  }
}

// POST: Handle the "Pasteurize Selected" Button
export async function POST(request: Request) {
  try {
    // 1. DYNAMIC SESSION GRABBER
    const session = await getServerSession(); // Pass your auth options here if needed: (request, authOptions)
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized session." }, { status: 401 });
    }

    // Find the physical staff profile attached to the logged-in user's email
    const staffProfile = await prisma.staff_Profiles.findUnique({
      where: { email: session.user.email }
    });

    if (!staffProfile) {
      return NextResponse.json({ error: "Staff profile not found for this session." }, { status: 404 });
    }

    const { ids, temperature, duration } = await request.json();

    const bottles = await prisma.raw_Collections.findMany({
      where: { collection_id: { in: ids } }
    });
    const totalVolume = bottles.reduce((sum, b) => sum + b.raw_volume_ml, 0);

    const isSubOptimal = parseFloat(temperature) < 62.5 || parseInt(duration) < 30;

    const newBatch = await prisma.$transaction(async (tx) => {
      const batch = await tx.milk_Batches.create({
        data: {
          pooled_volume: totalVolume,
          current_volume: totalVolume,
          pasteurization_temp: parseFloat(temperature),
          pasteurization_time: parseInt(duration),
          lab_status: "Pending",
          safety_flags: isSubOptimal ? "Sub-optimal thermal process" : null
        }
      });

      await tx.raw_Collections.updateMany({
        where: { collection_id: { in: ids } },
        data: { batch_id: batch.batch_id }
      });

      // --- DYNAMIC AUDIT LOG ---
      await tx.audit_Logs.create({
        data: {
          staff_id: staffProfile.staff_id, // <--- Uses the dynamically fetched ID!
          action_type: "CREATE_BATCH",
          record_affected: `BATCH-${batch.batch_id}`
        }
      });
      // -------------------------

      return batch;
    });

    return NextResponse.json({ 
      message: isSubOptimal ? "Discard Recommended." : "Batch pasteurized and sent to QA Desk.",
      results: {
        batchId: newBatch.batch_id,
        volume: newBatch.pooled_volume,
        temperature: newBatch.pasteurization_temp,
        duration: newBatch.pasteurization_time
      }
    }, { status: 201 });

  } catch (error) {
    console.error("BATCH PROCESSING ERROR:", error);
    return NextResponse.json({ error: "Failed to process cycle" }, { status: 500 });
  }
}