import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    // 1. Verify Member Profile exists via Tracking Number
    const member = await prisma.member_Profiles.findUnique({
      where: { tracking_no: mtn }
    });

    if (!member) {
      return NextResponse.json({ error: "No donor profile found matching that Tracking Number (MTN)." }, { status: 404 });
    }

    // 2. Insert the complete Health Screening row
    await prisma.health_Screenings.create({
      data: {
        member_id: member.member_id,
        donor_classification: donor_classification,
        classification_specifics: classification_specifics,
        traveled_abroad: traveled_abroad,
        travel_country: travel_country,
        travel_reason: travel_reason,
        donation_reason: donation_reason,
        spouse_consent: spouse_consent,
        health_history_answers: answers || {},
      }
    });

    // 3. Flip the donor's actual clearance status
    await prisma.member_Profiles.update({
      where: { member_id: member.member_id },
      data: { status: final_status }
    });

    return NextResponse.json({ message: "Full health screening committed & clearance updated successfully!" }, { status: 201 });

  } catch (error) {
    console.error("FULL SCREENING API ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error while saving clinical records." }, { status: 500 });
  }
}