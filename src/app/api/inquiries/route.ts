import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getToken } from 'next-auth/jwt';

export async function GET() {
  try {
    const inquiries = await prisma.inquiries.findMany({
      orderBy: { created_at: 'desc' },
      take: 15 // Pull the 15 most recent
    });
    return NextResponse.json(inquiries, { status: 200 });
  } catch (error) {
    console.error("INQUIRY FETCH ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch inquiries" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Grab the logged-in nurse (default to 2 if testing without auth)
    const token = await getToken({ req: request as any });
    const nurseId = token?.sub ? Number(token.sub) : 2;

    const newInquiry = await prisma.inquiries.create({
      data: {
        requester_name: data.requester_name,
        contact_info: data.contact_info,
        member_mtn: data.member_mtn || null, // Optional MTN link
        inquiry_type: data.inquiry_type,
        priority: data.priority,
        // Only save volume and program details if they are actually requesting milk
        required_volume: data.inquiry_type === 'Request Milk' && data.required_volume ? Number(data.required_volume) : null,
        infant_gender: data.inquiry_type === 'Request Milk' ? data.infant_gender : null,
        dispensing_program: data.inquiry_type === 'Request Milk' ? data.dispensing_program : null,
        status: 'Pending',
        logged_by: nurseId
      }
    });

    return NextResponse.json({ inquiry: newInquiry }, { status: 201 });
  } catch (error) {
    console.error("INQUIRY SUBMIT ERROR:", error);
    return NextResponse.json({ error: "Failed to save inquiry" }, { status: 500 });
  }
}

// Added a PATCH route so the Nurse can mark inquiries as "Resolved"
export async function PATCH(request: Request) {
  try {
    const { inquiry_id, status } = await request.json();
    const updatedInquiry = await prisma.inquiries.update({
      where: { inquiry_id: Number(inquiry_id) },
      data: { status }
    });
    return NextResponse.json({ inquiry: updatedInquiry }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update inquiry status" }, { status: 500 });
  }
}