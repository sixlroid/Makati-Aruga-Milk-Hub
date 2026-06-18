import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const hashedPassword = data.password; // Replace with bcrypt later

    // 1. IF REGISTERING A MEMBER
    if (data.role === 'member_donor_receiver') {
      const generatedMTN = `MTN-${Math.floor(100000 + Math.random() * 900000)}`;

      const newUser = await prisma.users.create({
        data: {
          email: data.email || `temp-${Date.now()}@placeholder.com`,
          password: hashedPassword,
          role: data.role,
          Member_Profile: {
            create: {
              tracking_no: generatedMTN,
              first_name: data.firstName,
              last_name: data.lastName,
              middle_initial: data.middleInitial || null,
              email: data.email || null,
              phone_number: data.phone,
              job: data.job || "Unspecified",
              ethnicity: data.ethnicity,
              date_of_birth: new Date(data.dob), 
              status: data.status,
              info_source: data.infoSource
            }
          }
        }
      });
      return NextResponse.json({ message: "Member registered!", user: newUser }, { status: 201 });
    } 
    
    // 2. IF REGISTERING STAFF
    else {
      if (!data.providedTrackingId) {
        return NextResponse.json({ error: "Staff ID is required" }, { status: 400 });
      }

      const newUser = await prisma.users.create({
        data: {
          email: data.email,
          password: hashedPassword,
          role: data.role,
          Staff_Profile: {
            create: {
              tracking_no: data.providedTrackingId,
              first_name: data.firstName,
              last_name: data.lastName,
              middle_initial: data.middleInitial || null,
              email: data.email,
              phone_number: data.phone,
              ethnicity: data.ethnicity,
              date_of_birth: new Date(data.dob),
              status: data.status
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