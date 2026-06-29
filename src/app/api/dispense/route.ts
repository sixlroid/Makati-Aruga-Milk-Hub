import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    // --- Parse Request ---
    const { 
      mtn, 
      volume, 
      hospital, 
      infant_gender, 
      dispensing_program, 
      bottle_type, 
      cost 
    } = await request.json();

    // --- Generate RTN ---
    const uniqueSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const generatedRtn = `RTN-${Date.now().toString().slice(-5)}${uniqueSuffix}`;

    // --- Update Profile ---
    await prisma.member_Profiles.update({
      where: { tracking_no: mtn },
      data: {
        rtn: generatedRtn,
        rtn_status: 'pending',          
        rtn_volume: Number(volume),
        rtn_hospital: hospital,
        rtn_infant_gender: infant_gender,
        rtn_dispensing_program: dispensing_program,
        rtn_bottle_type: bottle_type,
        rtn_fee: Number(cost),
      }
    });

    return NextResponse.json({ 
      message: "Milk request logged. Pending medical verification.", 
      rtn: generatedRtn 
    }, { status: 200 });

  } catch (error) {
    console.error("DISPENSE REQUEST ERROR:", error);
    return NextResponse.json({ error: "Failed to submit request to the network." }, { status: 500 });
  }
}