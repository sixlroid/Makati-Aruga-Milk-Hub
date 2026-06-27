import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mtn, volume, hospital, clinical_abstract, prescription, infant_gender, bottle_type, dispensing_program } = body;

    // Generate a unique RTN ticket
    const rtn = `RTN-${Math.floor(100000 + Math.random() * 900000)}`;

    // TYPESCRIPT FIX: Strongly type the dictionary to prevent indexing errors
    const BOTTLE_PRICES: Record<string, number> = { ameda: 85, korea: 65, red_cap: 40 };
    const calculatedFee = (Number(volume) * 2.0) + (BOTTLE_PRICES[String(bottle_type)] || 0);

    // Update the member profile to store the request details and mark it 'pending'
    await prisma.member_Profiles.update({
      where: { tracking_no: mtn },
      data: {
        rtn: rtn,
        rtn_status: 'pending', // <--- Triggers the nurse Medical Reviews tab
        rtn_volume: Number(volume),
        rtn_fee: calculatedFee, // <--- Plugs in the safely calculated fee
        rtn_hospital: hospital,
        rtn_abstract: clinical_abstract,
        rtn_prescription: prescription,
        rtn_bottle_type: bottle_type,
        rtn_infant_gender: infant_gender,
        rtn_dispensing_program: dispensing_program
      }
    });

    return NextResponse.json({ message: "Milk request submitted successfully." }, { status: 201 });
  } catch (error) {
    console.error("MEMBER REQUEST CREATION ERROR:", error);
    return NextResponse.json({ error: "Failed to create request." }, { status: 500 });
  }
}