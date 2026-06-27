import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { 
      mtn, 
      final_status, 
      donor_classification, 
      classification_specifics, 
      traveled_abroad, 
      travel_country, 
      travel_reason, 
      donation_reason, 
      spouse_consent, 
      answers 
    } = data;

    // 1. Verify the Member exists based on the MTN provided by the Nurse
    const member = await prisma.member_Profiles.findUnique({
      where: { tracking_no: mtn.toUpperCase().trim() }
    });

    if (!member) {
      return NextResponse.json({ error: "No profile found matching that Member ID." }, { status: 404 });
    }

    // 2. Automate the 3-Month Expiry Date (if they are approved)
    const isApproved = final_status === 'Approved';
    let newExpiryDate = null;
    if (isApproved) {
      const today = new Date();
      // Add exactly 3 months to today's date
      today.setMonth(today.getMonth() + 3);
      newExpiryDate = today;
    }

    // 3. ATOMIC TRANSACTION: Save the Screening AND Update the Member
    await prisma.$transaction([
      
      // A. Create the massive Health Screening log
      prisma.health_Screenings.create({
        data: {
          member_id: member.member_id,
          donor_classification,
          classification_specifics,
          traveled_abroad,
          travel_country,
          travel_reason,
          donation_reason,
          spouse_consent,
          health_history_answers: answers // Stores the entire JSON object of questions
        }
      }),

      // B. Automate the Gatekeeper updates on the Member Profile
      prisma.member_Profiles.update({
        where: { member_id: member.member_id },
        data: {
          status: final_status, // "Approved" or "Deferred"
          eligible_to_donate: isApproved, // Boolean toggle
          last_screening_at: new Date(),
          screening_valid_until: newExpiryDate,
          // Custom computed booleans based on the new dates:
          screening_valid: isApproved
        }
      })
    ]);

    return NextResponse.json({ 
      message: `Health screening saved! Member ${mtn} is now ${final_status}.` 
    }, { status: 201 });

  } catch (error) {
    console.error("SCREENING SUBMIT ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error while saving screening." }, { status: 500 });
  }
}