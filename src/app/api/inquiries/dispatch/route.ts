import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { inquiry_id, first_name, last_name, dob } = await request.json();

    // --- Fetch Original Inquiry ---
    const inquiry = await prisma.inquiries.findUnique({ where: { inquiry_id: Number(inquiry_id) } });
    if (!inquiry) return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });

    // --- Generate Safe Email ---
    const safeEmail = `walkin_${Date.now()}_${Math.floor(Math.random() * 10000)}@local.hospital`;

    // --- Execute Upgrade Transaction ---
    const ticketResult = await prisma.$transaction(async (tx) => {
      
      const newUser = await tx.users.create({
        data: { email: safeEmail, role: 'member', password: 'Welcome123!' }
      });

      const mtn = `MID-${Math.floor(100000 + Math.random() * 900000)}`;

      const newMember = await tx.member_Profiles.create({
        data: {
          member_id: newUser.user_id,
          tracking_no: mtn,
          first_name,
          last_name,
          email: safeEmail,
          phone_number: inquiry.contact_info, 
          date_of_birth: new Date(dob),
          job: 'Walk-in',
          ethnicity: 'Unspecified',
          status: 'Pending',
          info_source: 'Clinic Walk-in',
          rtn_bottle_type: inquiry.bottle_type,
        }
      });

      let generatedTicket = mtn; 

      // --- Dispatch to Queue ---
      if (inquiry.inquiry_type === 'Request Milk') {
        const rtn = `RTN-${Math.floor(100000 + Math.random() * 900000)}`;
        generatedTicket = rtn; 

        const volume = inquiry.required_volume || 0;
        const safeBottle = inquiry.bottle_type || 'ameda';
        const bottleFee = safeBottle === 'ameda' ? 85 : safeBottle === 'korea' ? 65 : 40;

        await tx.member_Profiles.update({
          where: { tracking_no: mtn },
          data: {
            rtn: rtn,
            rtn_status: 'pending',
            rtn_volume: volume,
            rtn_fee: (volume * 2.0) + bottleFee,
            rtn_infant_gender: inquiry.infant_gender || 'M',
            rtn_dispensing_program: inquiry.dispensing_program || 'In House'
          }
        });
      } else if (inquiry.inquiry_type === 'Donate') {
        const dtn = `DTN-${Math.floor(100000 + Math.random() * 900000)}`;
        generatedTicket = dtn; 

        await tx.member_Profiles.update({
          where: { tracking_no: mtn },
          data: { dtn: dtn, dtn_status: 'approved' }
        });
        await tx.donation_Appointments.create({
          data: {
            dtn: dtn,
            donor_id: newMember.member_id,
            appointment_date: new Date(),
            collection_method: 'Walk-In Triage',
            status: 'Approved' 
          }
        });
      }

      // --- Resolve Triage Inquiry ---
      await tx.inquiries.update({
        where: { inquiry_id: inquiry.inquiry_id },
        data: { status: 'Resolved' }
      });

      return generatedTicket;
    });

    return NextResponse.json({ 
      message: "Dispatched successfully", 
      ticket: ticketResult 
    }, { status: 200 });

  } catch (error) {
    console.error("DISPATCH ERROR:", error);
    return NextResponse.json({ error: "Failed to dispatch guest." }, { status: 500 });
  }
}