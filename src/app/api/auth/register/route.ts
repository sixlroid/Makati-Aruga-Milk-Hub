import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { assignMissingMemberIdentifiers, ensureTrackingNumber, normalizeTrackingNumber } from '@/lib/identifiers';

const prisma = new PrismaClient();

function isValidPhoneNumber(value?: string | null) {
  return typeof value === 'string' && /^\d{11}$/.test(value.trim());
}

function isValidMiddleInitial(value?: string | null) {
  if (!value) return true;
  return /^[A-Za-z]{1,2}$/.test(value.trim());
}

function isValidEmail(value?: string | null) {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const trimmedFirstName = typeof data.firstName === 'string' ? data.firstName.trim() : '';
    const trimmedLastName = typeof data.lastName === 'string' ? data.lastName.trim() : '';
    const trimmedMiddleInitial = typeof data.middleInitial === 'string' ? data.middleInitial.trim() : '';
    const trimmedDob = typeof data.dob === 'string' ? data.dob.trim() : '';
    const trimmedEthnicity = typeof data.ethnicity === 'string' ? data.ethnicity.trim() : '';
    const trimmedPhone = typeof data.phone === 'string' ? data.phone.trim() : '';
    const trimmedStatus = typeof data.status === 'string' ? data.status.trim() : '';
    const trimmedPassword = typeof data.password === 'string' ? data.password.trim() : '';
    const trimmedEmail = typeof data.email === 'string' ? data.email.trim() : '';
    const trimmedInfoSource = typeof data.infoSource === 'string' ? data.infoSource.trim() : '';
    const trimmedProvidedTrackingId = typeof data.providedTrackingId === 'string' ? data.providedTrackingId.trim() : '';

    if (!trimmedFirstName || !trimmedLastName || !trimmedDob || !trimmedStatus || !trimmedEthnicity || !trimmedPhone || !trimmedPassword) {
      return NextResponse.json({ error: 'Please complete all required fields.' }, { status: 400 });
    }

    if (!isValidPhoneNumber(trimmedPhone)) {
      return NextResponse.json({ error: 'Phone number must be exactly 11 digits.' }, { status: 400 });
    }

    if (!isValidMiddleInitial(trimmedMiddleInitial)) {
      return NextResponse.json({ error: 'Middle initial may only contain letters.' }, { status: 400 });
    }

    const parsedDob = new Date(trimmedDob);
    if (Number.isNaN(parsedDob.getTime())) {
      return NextResponse.json({ error: 'Please provide a valid date of birth.' }, { status: 400 });
    }

    const hashedPassword = trimmedPassword; // Replace with bcrypt later

    // 1. IF REGISTERING A MEMBER
    if (data.role === 'member_donor_receiver') {
      if (!trimmedInfoSource) {
        return NextResponse.json({ error: 'How did you hear about us is required.' }, { status: 400 });
      }

      const generatedMTN = await ensureTrackingNumber('member_donor_receiver', prisma);

      const newUser = await prisma.users.create({
        data: {
          email: trimmedEmail || `temp-${Date.now()}@placeholder.com`,
          password: hashedPassword,
          role: data.role,
          Member_Profile: {
            create: {
              tracking_no: generatedMTN,
              first_name: trimmedFirstName,
              last_name: trimmedLastName,
              middle_initial: trimmedMiddleInitial || null,
              email: trimmedEmail || null,
              phone_number: trimmedPhone,
              job: data.job || "Unspecified",
              ethnicity: trimmedEthnicity,
              date_of_birth: parsedDob,
              status: trimmedStatus,
              info_source: trimmedInfoSource
            }
          }
        }
      });

      const memberProfile = await prisma.member_Profiles.findUnique({
        where: { member_id: newUser.user_id }
      });

      if (memberProfile) {
        await assignMissingMemberIdentifiers(memberProfile.member_id, prisma);
      }

      return NextResponse.json({ message: "Member registered!", user: newUser }, { status: 201 });
    } 
    
    // 2. IF REGISTERING STAFF
    else {
      if (!trimmedEmail || !trimmedProvidedTrackingId) {
        return NextResponse.json({ error: 'Email and staff ID are required for staff registration.' }, { status: 400 });
      }

      if (!isValidEmail(trimmedEmail)) {
        return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
      }

      const normalizedTrackingId = await normalizeTrackingNumber(data.role, trimmedProvidedTrackingId, prisma);

      const newUser = await prisma.users.create({
        data: {
          email: trimmedEmail,
          password: hashedPassword,
          role: data.role,
          Staff_Profile: {
            create: {
              tracking_no: normalizedTrackingId,
              first_name: trimmedFirstName,
              last_name: trimmedLastName,
              middle_initial: trimmedMiddleInitial || null,
              email: trimmedEmail,
              phone_number: trimmedPhone,
              ethnicity: trimmedEthnicity,
              date_of_birth: parsedDob,
              status: trimmedStatus
            }
          }
        }
      });
      return NextResponse.json({ message: "Staff registered!", user: newUser }, { status: 201 });
    }

  } catch (error: any) {
    console.error("REGISTRATION ERROR:", error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Email or Tracking ID already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}