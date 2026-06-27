import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma"; // Adjust path if needed

export async function POST(request: Request) {
  try {
    const { mtn } = await request.json();
    
    // Change the status from 'approved' to 'arriving'
    await prisma.member_Profiles.update({
      where: { tracking_no: mtn },
      data: { rtn_status: 'arriving' } 
    });

    return NextResponse.json({ message: "Status updated to arriving." }, { status: 200 });
  } catch (error) {
    console.error("ACKNOWLEDGE ERROR:", error);
    return NextResponse.json({ error: "Failed to update status." }, { status: 500 });
  }
}