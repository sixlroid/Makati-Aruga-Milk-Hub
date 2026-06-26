import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { formatTrackingNumberForRole } from '@/lib/identifiers';

const prisma = new PrismaClient();

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

function formatHistoryDate(value?: Date | string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export async function GET() {
  try {
    const rawPending = await prisma.raw_Collections.aggregate({
      _sum: { raw_volume_ml: true },
      where: { batch_id: null }
    });

    const pasteurizedAvailable = await prisma.milk_Batches.aggregate({
      _sum: { current_volume: true },
      where: { current_volume: { gt: 0 }, lab_status: 'Passed' }
    });

    const discardedOrContaminated = await prisma.milk_Batches.aggregate({
      _sum: { current_volume: true },
      where: { lab_status: { in: ['Discarded', 'Contaminated', 'Failed'] } }
    });

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

    const accounts = users.map((user) => {
      const member = user.Member_Profile;
      const staff = user.Staff_Profile;
      const profile = member ?? staff;

      return {
        id: user.user_id,
        name: profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Unnamed account',
        email: normalizeEmail(user.email),
        role: getDisplayRole(user.role),
        status: getAccountStatus(profile?.status),
        type: member ? 'member' : 'staff',
        trackingNo: formatTrackingNumberForRole(user.role, profile?.tracking_no) ?? null
      };
    });

    const donationHistory = await prisma.raw_Collections.findMany({
      take: 200,
      orderBy: { date_collected: 'desc' },
      include: {
        donor: {
          select: {
            first_name: true,
            last_name: true,
            tracking_no: true
          }
        },
        batch: {
          select: {
            batch_id: true,
            lab_status: true
          }
        }
      }
    });

    const releaseHistory = await prisma.transactions.findMany({
      take: 200,
      orderBy: { timestamp: 'desc' },
      include: {
        receiver: {
          select: {
            first_name: true,
            last_name: true,
            tracking_no: true
          }
        },
        batch: {
          select: {
            batch_id: true,
            lab_status: true
          }
        },
        staff: {
          select: {
            first_name: true,
            last_name: true
          }
        }
      }
    });

    const auditLogs = await prisma.audit_Logs.findMany({
      take: 200,
      orderBy: { timestamp: 'desc' },
      include: {
        staff: {
          select: {
            first_name: true,
            last_name: true,
            tracking_no: true
          }
        }
      }
    });

    const activeAccounts = accounts.filter((account) => account.status !== 'Inactive').length;
    const inactiveAccounts = accounts.filter((account) => account.status === 'Inactive').length;

    return NextResponse.json({
      overview: {
        pending_raw_ml: rawPending._sum.raw_volume_ml || 0,
        pasteurized_ml: pasteurizedAvailable._sum.current_volume || 0,
        discarded_ml: discardedOrContaminated._sum.current_volume || 0,
        active_batch_count: await prisma.milk_Batches.count({ where: { current_volume: { gt: 0 }, lab_status: 'Passed' } }),
        total_users: accounts.length,
        active_accounts: activeAccounts,
        inactive_accounts: inactiveAccounts
      },
      accounts,
      donationHistory: donationHistory.map((entry) => ({
        id: entry.collection_id,
        donorName: `${entry.donor.first_name} ${entry.donor.last_name}`.trim(),
        donorTrackingNo: entry.donor.tracking_no,
        volumeMl: entry.raw_volume_ml,
        collectedAt: formatHistoryDate(entry.date_collected),
        programSource: entry.program_source,
        batchId: entry.batch?.batch_id ?? null,
        batchStatus: entry.batch?.lab_status ?? 'Unassigned'
      })),
      releaseHistory: releaseHistory.map((entry) => ({
        id: entry.trans_id,
        receiverName: `${entry.receiver.first_name} ${entry.receiver.last_name}`.trim(),
        receiverTrackingNo: entry.receiver.tracking_no,
        volumeMl: entry.dispensed_vol,
        totalFee: Number(entry.total_fee),
        processedAt: formatHistoryDate(entry.timestamp),
        batchId: entry.batch?.batch_id ?? null,
        batchStatus: entry.batch?.lab_status ?? 'Unknown',
        processedBy: `${entry.staff.first_name} ${entry.staff.last_name}`.trim()
      })),
      auditLogs: auditLogs.map((entry) => ({
        id: entry.log_id,
        actionType: entry.action_type,
        recordAffected: entry.record_affected,
        timestamp: formatHistoryDate(entry.timestamp),
        staffId: entry.staff_id,
        staffName: `${entry.staff?.first_name ?? ''} ${entry.staff?.last_name ?? ''}`.trim(),
        staffTrackingNo: entry.staff?.tracking_no ?? '—'
      }))
    }, { status: 200 });
  } catch (error) {
    console.error('ADMIN OVERVIEW ERROR:', error);
    return NextResponse.json({ error: 'Failed to load admin overview' }, { status: 500 });
  }
}
