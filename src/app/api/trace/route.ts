import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) return NextResponse.json({ error: "No volume provided." }, { status: 400 });

  try {
    const searchNum = parseInt(q);
    if (isNaN(searchNum)) {
      return NextResponse.json({ error: "Please enter a valid number." }, { status: 400 });
    }

    // Fetch ALL batches that match this exact volume
    const batches = await prisma.milk_Batches.findMany({
      where: {
        pooled_volume: searchNum
      },
      include: {
        Raw_Collections: {
          include: { donor: true }
        },
        Transactions: {
          include: { receiver: true }
        }
      },
      orderBy: { batch_id: 'desc' } // Shows the newest ones first
    });

    if (batches.length === 0) {
      return NextResponse.json({ error: `No inventory batches found with a volume of ${searchNum} mL.` }, { status: 404 });
    }

    return NextResponse.json({ batches }, { status: 200 });
  } catch (error) {
    console.error("TRACE ERROR:", error);
    return NextResponse.json({ error: "Database error during trace." }, { status: 500 });
  }
}