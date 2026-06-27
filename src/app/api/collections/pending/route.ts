import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Find all raw collections that haven't been assigned to a batch yet
    const pending = await prisma.raw_Collections.findMany({
      where: { batch_id: null },
      include: { donor: { select: { tracking_no: true } } },
      orderBy: { date_collected: 'asc' } // Oldest milk first (FIFO)
    });

    const formatted = pending.map(p => ({
      collection_id: p.collection_id,
      mtn: p.donor.tracking_no,
      volume: p.raw_volume_ml,
      source: p.program_source,
      date: p.date_collected
    }));

    return NextResponse.json(formatted, { status: 200 });
  } catch (error) {
    console.error("FETCH PENDING BOTTLES ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch pending bottles." }, { status: 500 });
  }
}