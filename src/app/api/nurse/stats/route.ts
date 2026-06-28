import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 🚨 FIX: Removed the "batch_id: null" filter. 
    // Now it counts ALL milk collected today, period.
    const rawCollections = await prisma.raw_Collections.aggregate({
      _sum: { raw_volume_ml: true },
      where: {
        date_collected: { gte: today }
      }
    });

    const activeDonors = await prisma.member_Profiles.count({
      where: { status: 'Approved' }
    });

    const dispensed = await prisma.transactions.aggregate({
      _sum: { dispensed_vol: true },
      where: { timestamp: { gte: firstDayOfMonth } }
    });

    const vaultResult = await prisma.milk_Batches.aggregate({
      _sum: { current_volume: true },
      where: { lab_status: 'Cleared' }
    });

    return NextResponse.json({
      raw_volume: rawCollections._sum.raw_volume_ml || 0,
      active_donors: activeDonors || 0,
      dispensed_volume: dispensed._sum.dispensed_vol || 0,
      pasteurized_volume: vaultResult._sum.current_volume || 0
    }, { status: 200 });

  } catch (error) {
    console.error("STATS API ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}