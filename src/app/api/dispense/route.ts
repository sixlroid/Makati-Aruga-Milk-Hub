import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    // 1. Parse the incoming request from the Member Dashboard
    const { 
      mtn, 
      volume, 
      hospital, 
      infant_gender, 
      dispensing_program, 
      bottle_type, 
      cost 
    } = await request.json();

    // 2. Generate a new Receipt Tracking Number (RTN)
    const uniqueSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const generatedRtn = `RTN-${Date.now().toString().slice(-5)}${uniqueSuffix}`;

    // 3. Update the member's profile to hold this active, pending request
    await prisma.member_Profiles.update({
      where: { tracking_no: mtn },
      data: {
        rtn: generatedRtn,
        rtn_status: 'pending',          // Forces the frontend into STATE 2
        rtn_volume: Number(volume),
        rtn_hospital: hospital,
        rtn_infant_gender: infant_gender,
        rtn_dispensing_program: dispensing_program,
        rtn_bottle_type: bottle_type,
        rtn_fee: Number(cost),
        // Note: Abstract and prescription file paths would ideally be saved here too 
        // if you implement a cloud storage bucket upload (like AWS S3 or Supabase Storage).
      }
    });

    // 4. Return success and the new RTN to the frontend
    return NextResponse.json({ 
      message: "Milk request logged. Pending medical verification.", 
      rtn: generatedRtn 
    }, { status: 200 });

  } catch (error) {
    console.error("DISPENSE REQUEST ERROR:", error);
    return NextResponse.json({ error: "Failed to submit request to the network." }, { status: 500 });
  }
}