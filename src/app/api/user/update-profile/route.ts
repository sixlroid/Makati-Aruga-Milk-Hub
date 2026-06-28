import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma"; 
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Double-check your exact authOptions import path

export async function PUT(request: Request) {
  try {
    // 1. Authenticate the incoming request session
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    // 2. Extract incoming payload parameters from client request
    const body = await request.json();
    const { firstName, lastName, middleInitial, email, phoneNumber } = body;

    const currentEmail = session.user.email!;

    // 3. Find the Users row plus whichever profile (staff or member) it owns.
    //    Profile fields (first_name/last_name/email/phone_number) live on
    //    Staff_Profiles or Member_Profiles, NOT on Users directly.
    const existingUser = await prisma.users.findUnique({
      where: { email: currentEmail },
      include: { Staff_Profile: true, Member_Profile: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const profileUpdateData = {
      first_name: firstName,
      last_name: lastName,
      middle_initial: middleInitial,
      email: email,
      phone_number: phoneNumber,
    };

    // 4. Update Users.email and the role-specific profile email together so
    //    they never drift out of sync. $transaction rolls both back if either fails.
    let updatedUser;
    if (existingUser.Staff_Profile) {
      const [updatedUsers, updatedStaffProfile] = await prisma.$transaction([
        prisma.users.update({
          where: { user_id: existingUser.user_id },
          data: { email },
        }),
        prisma.staff_Profiles.update({
          where: { staff_id: existingUser.user_id },
          data: profileUpdateData,
        }),
      ]);
      updatedUser = { ...updatedUsers, profile: updatedStaffProfile };
    } else if (existingUser.Member_Profile) {
      const [updatedUsers, updatedMemberProfile] = await prisma.$transaction([
        prisma.users.update({
          where: { user_id: existingUser.user_id },
          data: { email },
        }),
        prisma.member_Profiles.update({
          where: { member_id: existingUser.user_id },
          data: profileUpdateData,
        }),
      ]);
      updatedUser = { ...updatedUsers, profile: updatedMemberProfile };
    } else {
      return NextResponse.json(
        { error: "User has no associated staff or member profile" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error("Database update error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}