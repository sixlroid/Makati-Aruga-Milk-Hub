import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Setup our timeframes (Today and This Month)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 1. Calculate Raw Collections (Today & Unbatched)
    const rawCollections = await prisma.raw_Collections.aggregate({
      _sum: { raw_volume_ml: true },
      where: {
        date_collected: { gte: today },
        batch_id: null // Only count milk that hasn't been pasteurized yet
      }
    });

    // 2. Count Active Cleared Donors
    const activeDonors = await prisma.member_Profiles.count({
      where: { status: 'Approved' }
    });

    // 3. Calculate Dispensed Milk (This Month)
    const dispensed = await prisma.transactions.aggregate({
      _sum: { dispensed_vol: true },
      where: { timestamp: { gte: firstDayOfMonth } }
    });

    return NextResponse.json({
      raw_volume: rawCollections._sum.raw_volume_ml || 0,
      active_donors: activeDonors || 0,
      dispensed_volume: dispensed._sum.dispensed_vol || 0
    }, { status: 200 });

  } catch (error) {
    console.error("STATS API ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}