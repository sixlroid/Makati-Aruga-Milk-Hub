import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { inquiry_id, first_name, last_name, email, dob } = await request.json();

    // 1. Fetch the original inquiry details
    const inquiry = await prisma.inquiries.findUnique({ where: { inquiry_id: Number(inquiry_id) } });
    if (!inquiry) return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });

    // 2. Execute the Atomic Upgrade Transaction
    const result = await prisma.$transaction(async (tx) => {
      
      // A. Create the base User account (Default password for walk-ins)
      const newUser = await tx.users.create({
        data: { email: email, role: 'member', password: 'Welcome123!' }
      });

      // B. Generate the new Member Tracking Number (MID)
      const mtn = `MID-${Math.floor(100000 + Math.random() * 900000)}`;

      // C. Create the Member Profile with required defaults
      const newMember = await tx.member_Profiles.create({
        data: {
          member_id: newUser.user_id,
          tracking_no: mtn,
          first_name,
          last_name,
          email,
          phone_number: inquiry.contact_info, // Pulled straight from the triage board!
          date_of_birth: new Date(dob),
          job: 'Walk-in',
          ethnicity: 'Unspecified',
          status: 'Pending',
          info_source: 'Clinic Walk-in'
        }
      });

      // D. Dispatch them to the correct Queue (DTN or RTN)
      if (inquiry.inquiry_type === 'Request Milk') {
        const rtn = `RTN-${Math.floor(100000 + Math.random() * 900000)}`;
        const volume = inquiry.required_volume || 0;
        await tx.member_Profiles.update({
          where: { tracking_no: mtn },
          data: {
            rtn: rtn,
            rtn_status: 'pending',
            rtn_volume: volume,
            rtn_fee: volume * 2.0,
            rtn_infant_gender: inquiry.infant_gender || 'M',
            rtn_dispensing_program: inquiry.dispensing_program || 'In House'
          }
        });
      } else if (inquiry.inquiry_type === 'Donate') {
        const dtn = `DTN-${Math.floor(100000 + Math.random() * 900000)}`;
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
            status: 'Approved' // Skips scheduling and goes straight to Clinical Intake
          }
        });
      }

      // E. Mark the Triage Inquiry as Resolved and officially link their new MTN
      await tx.inquiries.update({
        where: { inquiry_id: inquiry.inquiry_id },
        data: { status: 'Resolved', member_mtn: mtn }
      });

      return newMember;
    });

    return NextResponse.json({ message: "Guest successfully registered and dispatched!", member: result }, { status: 200 });

  } catch (error) {
    console.error("DISPATCH ERROR:", error);
    return NextResponse.json({ error: "Failed to dispatch guest. Ensure email is unique." }, { status: 500 });
  }
}