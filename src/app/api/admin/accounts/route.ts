import { NextResponse } from 'next/server';
import { prisma } from "../../../../lib/prisma"; // Adjust this path if needed (e.g., '@/lib/prisma')
import { formatTrackingNumberForRole } from '@/lib/identifiers';
import { getToken } from 'next-auth/jwt'; // 👈 NEW: Imports the secure token reader

function getDisplayRole(role: string) {
  if (role === 'admin') return 'Administrator';
  if (role === 'nurse') return 'Nurse';
  if (role === 'lab') return 'Lab Staff';
  return 'Member';
}

function getAccountStatus(status?: string | null) {
  return status === 'Inactive' ? 'Inactive' : 'Active';
}

function normalizeEmail(email?: string | null) {
  if (!email) return 'N/A';
  const trimmed = email.trim();
  if (!trimmed) return 'N/A';
  if (trimmed.startsWith('temp-') || trimmed.includes('@placeholder.com') || trimmed.includes('placeholder')) {
    return 'N/A';
  }
  return trimmed;
}

async function getAccounts(search = '') {
  const users = await prisma.users.findMany({
    select: {
      user_id: true,
      email: true,
      role: true,
      Member_Profile: {
        select: {
          first_name: true,
          last_name: true,
          tracking_no: true,
          status: true
        }
      },
      Staff_Profile: {
        select: {
          first_name: true,
          last_name: true,
          tracking_no: true,
          status: true
        }
      }
    }
  });

  const normalizedSearch = search.toLowerCase();

  return users
    .map((user) => {
      const member = user.Member_Profile;
      const staff = user.Staff_Profile;
      const profile = member ?? staff;
      const fullName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Unnamed account';

      return {
        id: user.user_id,
        name: fullName,
        email: normalizeEmail(user.email),
        role: getDisplayRole(user.role),
        status: getAccountStatus(profile?.status),
        type: member ? 'member' : 'staff',
        trackingNo: formatTrackingNumberForRole(user.role, profile?.tracking_no) ?? null
      };
    })
    .filter((account) => {
      if (!normalizedSearch) return true;
      return [account.name, account.email, account.role, account.trackingNo ?? '']
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') ?? '';
    return NextResponse.json({ accounts: await getAccounts(search) }, { status: 200 });
  } catch (error) {
    console.error('ADMIN ACCOUNTS LIST ERROR:', error);
    return NextResponse.json({ error: 'Failed to load accounts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // 👈 NEW: Read the secure session token to find out WHICH Admin is clicking the button
    const token = await getToken({ req: request as any });
    
    // Security check: Make sure they are actually logged in
    if (!token || !token.sub) {
      return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 });
    }
    
    // The "sub" property of a JWT token holds the user's ID!
    const adminStaffId = Number(token.sub);

    const data = await request.json();
    const { action, userId } = data;

    if (!userId || !['deactivate', 'delete'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
    }

    // ==========================================
    // WORKFLOW 1: DEACTIVATE ACCOUNT
    // ==========================================
    if (action === 'deactivate') {
      const user = await prisma.users.findUnique({
        where: { user_id: Number(userId) },
        include: { Member_Profile: true, Staff_Profile: true }
      });

      if (!user) {
        return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
      }

      if (user.Member_Profile) {
        await prisma.member_Profiles.update({
          where: { member_id: user.user_id },
          data: { status: 'Inactive' }
        });
      }

      if (user.Staff_Profile) {
        await prisma.staff_Profiles.update({
          where: { staff_id: user.user_id },
          data: { status: 'Inactive' }
        });
      }

      // 👈 NEW: Log the Deactivation to the Database dynamically!
      await prisma.audit_Logs.create({
        data: {
          staff_id: adminStaffId,
          action_type: "Account Deactivation",
          record_affected: `User ID: ${userId}`
        }
      });

      return NextResponse.json({ message: 'Account deactivated.' }, { status: 200 });
    }

    // ==========================================
    // WORKFLOW 2: DELETE ACCOUNT
    // ==========================================
    await prisma.member_Profiles.deleteMany({ where: { member_id: Number(userId) } });
    await prisma.staff_Profiles.deleteMany({ where: { staff_id: Number(userId) } });
    await prisma.users.delete({ where: { user_id: Number(userId) } });

    // 👈 NEW: Log the Deletion to the Database dynamically!
    await prisma.audit_Logs.create({
      data: {
        staff_id: adminStaffId,
        action_type: "Account Deletion",
        record_affected: `User ID: ${userId}`
      }
    });

    return NextResponse.json({ message: 'Account deleted.' }, { status: 200 });
  } catch (error) {
    console.error('ADMIN ACCOUNT ACTION ERROR:', error);
    return NextResponse.json({ error: 'Unable to complete account action.' }, { status: 500 });
  }
}