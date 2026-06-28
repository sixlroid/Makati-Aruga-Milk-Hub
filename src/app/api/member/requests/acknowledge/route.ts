import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  try {
    const { tracking_no } = await request.json();

    if (!tracking_no) {
      return NextResponse.json({ error: 'Tracking number required' }, { status: 400 });
    }

    // Flip the status in the database to 'arriving'
    await prisma.member_Profiles.update({
      where: { tracking_no: tracking_no },
      data: { rtn_status: 'arriving' }
    });

    return NextResponse.json({ message: "Status updated to arriving" }, { status: 200 });
  } catch (error) {
    console.error("ARRIVAL STATUS ERROR:", error);
    return NextResponse.json({ error: "Failed to update status." }, { status: 500 });
  }
}