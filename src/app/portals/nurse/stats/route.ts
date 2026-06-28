import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 1. Raw Collections (Awaiting Pooling)
    // Sums all milk that hasn't been assigned to a batch yet
    const rawResult = await prisma.raw_Collections.aggregate({
      _sum: { raw_volume_ml: true },
      where: { batch_id: null }
    });
    const raw_volume = rawResult._sum.raw_volume_ml || 0;

    // 2. Active Donors
    // Counts all members who have passed their health screening
    const activeDonors = await prisma.member_Profiles.count({
      where: { eligible_to_donate: true }
    });

    // 3. Dispensed Volume (This Month)
    // Grabs the 1st day of the current month to filter transactions
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const dispensedResult = await prisma.transactions.aggregate({
      _sum: { dispensed_vol: true },
      where: { timestamp: { gte: startOfMonth } }
    });
    const dispensed_volume = dispensedResult._sum.dispensed_vol || 0;

    // 4. THE NEW STAT: Pasteurized Vault
    // Sums the current volume of all batches that safely passed QA
    const vaultResult = await prisma.milk_Batches.aggregate({
      _sum: { current_volume: true },
      where: { lab_status: 'Cleared' }
    });
    const pasteurized_volume = vaultResult._sum.current_volume || 0;

    // Send all 4 numbers back to the dashboard
    return NextResponse.json({
      raw_volume,
      active_donors: activeDonors,
      dispensed_volume,
      pasteurized_volume
    }, { status: 200 });

  } catch (error) {
    console.error("Stats Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}