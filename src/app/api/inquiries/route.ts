import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
// Import your authOptions if necessary depending on your setup: import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    // 1. DYNAMIC SESSION GRABBER (Who is the nurse logging this?)
    const session = await getServerSession(); 
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized session. Please log in." }, { status: 401 });
    }

    // Find the physical staff profile attached to the logged-in user's email
    const staffProfile = await prisma.staff_Profiles.findUnique({
      where: { email: session.user.email }
    });

    if (!staffProfile) {
      return NextResponse.json({ error: "Staff profile not found for this session." }, { status: 404 });
    }

    const body = await request.json();
    const { 
      requester_name, 
      contact_info, 
      member_mtn, 
      inquiry_type, 
      priority, 
      required_volume, 
      infant_gender, 
      dispensing_program 
    } = body;

    let finalMtn = member_mtn || null;

    // SMART LINKING LOGIC: Search the database!
    if (!finalMtn && contact_info) {
      const foundMember = await prisma.member_Profiles.findFirst({
        where: {
          OR: [
            { phone_number: contact_info }, 
            { email: contact_info }         
          ]
        },
        select: { tracking_no: true }
      });

      if (foundMember) {
        finalMtn = foundMember.tracking_no; 
      }
    }

    // Save the inquiry to the database WITH the staff relationship
    const newInquiry = await prisma.inquiries.create({
      data: {
        requester_name,
        contact_info,
        member_mtn: finalMtn,
        inquiry_type,
        priority,
        required_volume: required_volume ? Number(required_volume) : null,
        infant_gender,
        dispensing_program,
        status: 'Pending',
        logged_by: staffProfile.staff_id
      }
    });

    return NextResponse.json({ 
      message: "Inquiry logged successfully.", 
      inquiry: newInquiry 
    }, { status: 201 });

  } catch (error) {
    console.error("TRIAGE LOGGING ERROR:", error);
    return NextResponse.json({ error: "Failed to log triage inquiry." }, { status: 500 });
  }
}

// GET: Fetch inquiries for the Nurse Dashboard
export async function GET() {
  try {
    const inquiries = await prisma.inquiries.findMany({
      orderBy: { created_at: 'desc' },
      take: 15 
    });
    return NextResponse.json(inquiries, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load triage board." }, { status: 500 });
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