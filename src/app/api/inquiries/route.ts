import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const inquiries = await prisma.inquiries.findMany({
      orderBy: { inquiry_id: 'desc' },
      take: 10,
    });

    return NextResponse.json(inquiries, { status: 200 });
  } catch (error) {
    console.error('INQUIRIES GET ERROR:', error);
    return NextResponse.json({ error: 'Unable to load inquiries.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const requesterName = (data.requester_name || '').toString().trim();
    const contactInfo = (data.contact_info || '').toString().trim();
    const requiredVolume = Number(data.required_volume || 0);

    if (!requesterName || !contactInfo || !requiredVolume || requiredVolume <= 0) {
      return NextResponse.json({ error: 'Requester name, contact details, and target volume are required.' }, { status: 400 });
    }

    const inquiry = await prisma.inquiries.create({
      data: {
        requester_name: requesterName,
        contact_info: contactInfo,
        required_volume: requiredVolume,
        status: 'Pending',
        logged_by: 2,
      },
    });

    return NextResponse.json({ message: 'Inquiry saved successfully.', inquiry }, { status: 201 });
  } catch (error) {
    console.error('INQUIRIES POST ERROR:', error);
    return NextResponse.json({ error: 'Unable to save inquiry.' }, { status: 500 });
  }
}
