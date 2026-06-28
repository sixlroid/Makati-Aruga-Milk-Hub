import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(); 
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized session. Please log in." }, { status: 401 });
    }

    const staffProfile = await prisma.staff_Profiles.findUnique({
      where: { email: session.user.email }
    });

    if (!staffProfile) return NextResponse.json({ error: "Staff profile not found." }, { status: 404 });

    const body = await request.json();
    const { requester_name, contact_info, member_mtn, inquiry_type, priority, required_volume, infant_gender, dispensing_program } = body;

    // 1. DATABASE DETECTIVE: Search for the Member
    let foundMember = null;

    if (member_mtn) {
      foundMember = await prisma.member_Profiles.findUnique({ where: { tracking_no: member_mtn } });
    } else if (contact_info) {
      foundMember = await prisma.member_Profiles.findFirst({
        where: { OR: [{ phone_number: contact_info }, { email: contact_info }] }
      });
    }

    // 2. THE FAST-LANE (Recognized Members Bypass the Board!)
    if (foundMember) {
      // SCENARIO A: Requesting Milk
      if (inquiry_type === 'Request Milk') {
        const rtn = `RTN-${Math.floor(100000 + Math.random() * 900000)}`;
        const volume = required_volume ? Number(required_volume) : 0;
        
        await prisma.member_Profiles.update({
          where: { tracking_no: foundMember.tracking_no },
          data: {
            rtn: rtn,
            rtn_status: 'pending', // <--- Pushes directly to Nurse Medical Reviews
            rtn_volume: volume,
            rtn_fee: volume * 2.0, // Base processing fee assumption for walk-ins
            rtn_infant_gender: infant_gender || 'M',
            rtn_dispensing_program: dispensing_program || 'In House'
          }
        });
        return NextResponse.json({ message: `Smart Dispatch: ${foundMember.first_name} recognized! Request routed to Medical Reviews.\n\nReceipt Ticket: ${rtn}` }, { status: 201 });
      } 
      
      // SCENARIO B: Donating Milk
      else if (inquiry_type === 'Donate') {
        const dtn = `DTN-${Math.floor(100000 + Math.random() * 900000)}`;
        
        await prisma.member_Profiles.update({
          where: { tracking_no: foundMember.tracking_no },
          data: { dtn: dtn, dtn_status: 'approved' }
        });

        await prisma.donation_Appointments.create({
          data: {
            dtn: dtn,
            donor_id: foundMember.member_id,
            appointment_date: new Date(),
            collection_method: 'Walk-In Triage',
            status: 'Approved' // <--- Pushes directly to Clinical Intake
          }
        });
        return NextResponse.json({ message: `Smart Dispatch: ${foundMember.first_name} recognized! Walk-in donor routed to Clinical Intake.\n\nDonation Ticket: ${dtn}` }, { status: 201 });
      }
    }

    // 3. THE HOLDING PEN (Unregistered Guests & General Questions)
    const newInquiry = await prisma.inquiries.create({
      data: {
        requester_name,
        contact_info,
        member_mtn: foundMember ? foundMember.tracking_no : null,
        inquiry_type,
        priority,
        required_volume: required_volume ? Number(required_volume) : null,
        infant_gender,
        dispensing_program,
        status: 'Pending',
        logged_by: staffProfile.staff_id 
      }
    });

    return NextResponse.json({ message: "Guest logged to Triage Board.", inquiry: newInquiry }, { status: 201 });

  } catch (error) {
    console.error("TRIAGE LOGGING ERROR:", error);
    return NextResponse.json({ error: "Failed to log triage inquiry." }, { status: 500 });
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