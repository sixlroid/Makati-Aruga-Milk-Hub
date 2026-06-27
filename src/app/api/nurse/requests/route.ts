import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma"; 

export async function GET() {
  try {
    const activeRequests = await prisma.member_Profiles.findMany({
      where: { rtn: { not: null } },
      select: {
        rtn: true,
        tracking_no: true,
        rtn_status: true,
        rtn_volume: true,
        rtn_fee: true,
        rtn_hospital: true,
        rtn_abstract: true,       
        rtn_prescription: true,   
        rtn_infant_gender: true,
        rtn_bottle_type: true,
        rtn_dispensing_program: true,
        // --- FINAL FIX: Peek into the Transactions table! ---
        Transactions: {
          select: { trans_id: true },
          take: 1 // We only need to find 1 to know they are an "Old" recipient
        }
      }
    });

    const formattedRequests = activeRequests.map(req => {
      // Logic: If they have 1 or more past transactions, they are 'Old'. Otherwise 'New'.
      const isOldRecipient = req.Transactions && req.Transactions.length > 0;

      return {
        rtn: req.rtn,
        mtn: req.tracking_no,
        requested_volume: req.rtn_volume || 0,
        hospital: req.rtn_hospital || 'Unknown',
        status: req.rtn_status || 'pending',
        computed_fee: req.rtn_fee || 0,
        created_at: new Date().toISOString(),
        rtn_abstract: req.rtn_abstract,           
        rtn_prescription: req.rtn_prescription,   
        infant_gender: req.rtn_infant_gender,
        bottle_type: req.rtn_bottle_type,
        dispensing_program: req.rtn_dispensing_program,
        recipient_type: isOldRecipient ? 'Old' : 'New', // <-- Automatically tagged for Appendix K!
      };
    });

    return NextResponse.json(formattedRequests, { status: 200 });
  } catch (error) {
    console.error("NURSE REQUESTS FETCH ERROR:", error);
    return NextResponse.json({ error: "Failed to load requests." }, { status: 500 });
  }
}