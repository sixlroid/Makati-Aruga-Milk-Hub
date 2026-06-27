import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.trim();

    if (!query) {
      return NextResponse.json({ error: "Missing tracking identifier." }, { status: 400 });
    }

    // 1. Trace by Batch ID (e.g., "17" or "BATCH-17")
    const cleanBatchId = query.replace('BATCH-', '').trim();
    if (!isNaN(Number(cleanBatchId))) {
      const batch = await prisma.milk_Batches.findUnique({
        where: { batch_id: Number(cleanBatchId) },
        include: {
          Raw_Collections: {
            include: { donor: { select: { tracking_no: true, dtn: true } } }
          },
          Transactions: {
            include: { receiver: { select: { tracking_no: true, rtn: true } } }
          }
        }
      });

      if (batch) {
        return NextResponse.json({
          type: "batch",
          data: {
            batch_id: batch.batch_id,
            status: batch.lab_status,
            pooled_volume: batch.pooled_volume,
            pasteurized_temp: batch.pasteurization_temp,
            pasteurization_time: batch.pasteurization_time,
            expiry_date: batch.expiry_date,
            donors: batch.Raw_Collections.map(rc => ({ dtn: rc.dtn_reference, mtn: rc.donor.tracking_no, volume: rc.raw_volume_ml })),
            recipients: batch.Transactions.map(t => ({ rtn: t.rtn_reference, mtn: t.receiver.tracking_no, volume: t.dispensed_vol }))
          }
        });
      }
    }

    // 2. Trace by DTN (Donor Ticket)
    if (query.toUpperCase().startsWith('DTN-')) {
      const collection = await prisma.raw_Collections.findFirst({
        where: { dtn_reference: query.toUpperCase() },
        include: { batch: true, donor: { select: { tracking_no: true } } }
      });

      if (collection) {
        return NextResponse.json({
          type: "dtn",
          data: {
            dtn: collection.dtn_reference,
            mtn: collection.donor.tracking_no,
            volume: collection.raw_volume_ml,
            date_collected: collection.date_collected,
            batch_id: collection.batch_id,
            batch_status: collection.batch?.lab_status
          }
        });
      }
    }

    // 3. Trace by RTN (Receiver Ticket)
    if (query.toUpperCase().startsWith('RTN-')) {
      const transaction = await prisma.transactions.findFirst({
        where: { rtn_reference: query.toUpperCase() },
        include: { 
          batch: { select: { batch_id: true, lab_status: true, expiry_date: true } },
          receiver: { select: { tracking_no: true } }
        }
      });

      if (transaction) {
        return NextResponse.json({
          type: "rtn",
          data: {
            rtn: transaction.rtn_reference,
            mtn: transaction.receiver.tracking_no,
            volume: transaction.dispensed_vol,
            timestamp: transaction.timestamp,
            batch_id: transaction.batch_id,
            batch_status: transaction.batch?.lab_status
          }
        });
      }
    }

    return NextResponse.json({ error: "No asset found matching this identifier." }, { status: 404 });

  } catch (error) {
    console.error("TRACEABILITY ENGINE ERROR:", error);
    return NextResponse.json({ error: "Traceability engine failure." }, { status: 500 });
  }
}