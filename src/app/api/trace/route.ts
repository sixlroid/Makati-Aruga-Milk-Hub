import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma"; // Adjust path based on your folder structure

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  
  if (!q) return NextResponse.json({ error: "No search query provided." }, { status: 400 });

  try {
    // Strip out any text (like "BATCH-") so we just have the number
    const batchId = parseInt(q.replace(/\D/g, '')); 
    if (isNaN(batchId)) return NextResponse.json({ error: "Invalid Batch ID format." }, { status: 400 });

    const batch = await prisma.milk_Batches.findUnique({
      where: { batch_id: batchId },
      include: {
        // Get the donors who contributed to this batch
        Raw_Collections: { 
          include: { donor: { select: { tracking_no: true } } }
        },
        // Get the babies/hospitals who received this batch
        Transactions: { 
          include: { receiver: { select: { tracking_no: true } } }
        }
      }
    });

    if (!batch) return NextResponse.json({ error: "Batch not found in the database." }, { status: 404 });

    // Build the unified timeline
    return NextResponse.json({ batch }, { status: 200 });

  } catch (error) {
    console.error("TRACE API ERROR:", error);
    return NextResponse.json({ error: "Failed to trace asset chain of custody." }, { status: 500 });
  }
}