import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getToken } from 'next-auth/jwt'; // Use this if you are verifying staff auth

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Get the securely logged-in Nurse's ID (Defaults to 2 if testing)
    const token = await getToken({ req: request as any });
    const staffId = token?.sub ? Number(token.sub) : 2;

    const newInquiry = await prisma.inquiries.create({
      data: {
        requester_name: body.requester_name,
        contact_info: body.contact_info,
        member_mtn: body.member_mtn || null,
        inquiry_type: body.inquiry_type,
        priority: body.priority,
        
        // Data casting
        required_volume: body.required_volume ? parseInt(body.required_volume) : null,
        infant_gender: body.infant_gender || null,
        dispensing_program: body.dispensing_program || null,
        
        // THE FIX: Explicitly save the bottle type!
        bottle_type: body.bottle_type || 'ameda', 
        
        logged_by: staffId
      }
    });

    return NextResponse.json({ inquiry: newInquiry, message: "Triage logged successfully." }, { status: 200 });
  } catch (error) {
    console.error("INQUIRY LOG ERROR:", error);
    return NextResponse.json({ error: "Failed to save inquiry to database." }, { status: 500 });
  }
}

// PATCH: Resolve an inquiry
export async function PATCH(request: Request) {
  try {
    const { inquiry_id, status } = await request.json();
    await prisma.inquiries.update({
      where: { inquiry_id: Number(inquiry_id) },
      data: { status }
    });
    return NextResponse.json({ message: "Inquiry resolved." }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update inquiry." }, { status: 500 });
  }
}