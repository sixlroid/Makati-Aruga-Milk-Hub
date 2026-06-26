import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function getRoleTrackingPrefix(role: string) {
  switch (role) {
    case 'admin':
      return 'AID';
    case 'nurse':
      return 'NID';
    case 'lab':
      return 'LID';
    case 'member':
    case 'member_donor_receiver':
    default:
      return 'MID';
  }
}

export function formatTrackingNumberForRole(role: string, value?: string | null) {
  if (!value) return null;

  const trimmed = value.trim().toUpperCase();
  if (!trimmed) return null;

  if (trimmed.startsWith('DTN-') || trimmed.startsWith('RTN-')) {
    return trimmed;
  }

  const prefix = getRoleTrackingPrefix(role);
  if (trimmed.startsWith(`${prefix}-`)) return trimmed;

  const legacyPrefixes = ['MTN-', 'NMTN-', 'AMTN-', 'LMTN-', 'MID-', 'NID-', 'LID-', 'AID-'];
  const matchedLegacyPrefix = legacyPrefixes.find((legacyPrefix) => trimmed.startsWith(legacyPrefix));

  if (matchedLegacyPrefix) {
    const rest = trimmed.slice(matchedLegacyPrefix.length);
    return `${prefix}-${rest}`;
  }

  return `${prefix}-${trimmed}`;
}

export async function ensureTrackingNumber(role: string, prismaClient: PrismaClient = prisma) {
  const prefix = getRoleTrackingPrefix(role);
  let attempts = 0;

  while (attempts < 20) {
    const numeric = Math.floor(100000 + Math.random() * 900000);
    const value = `${prefix}-${numeric}`;

    const memberExists = await prismaClient.member_Profiles.findFirst({
      where: { tracking_no: value }
    });
    const staffExists = await prismaClient.staff_Profiles.findFirst({
      where: { tracking_no: value }
    });

    if (!memberExists && !staffExists) {
      return value;
    }

    attempts += 1;
  }

  throw new Error(`Unable to generate a unique ${prefix} tracking number`);
}

export async function normalizeTrackingNumber(role: string, value?: string | null, prismaClient: PrismaClient = prisma) {
  const formatted = formatTrackingNumberForRole(role, value);

  if (!formatted) {
    return ensureTrackingNumber(role, prismaClient);
  }

  const memberExists = await prismaClient.member_Profiles.findFirst({
    where: { tracking_no: formatted }
  });
  const staffExists = await prismaClient.staff_Profiles.findFirst({
    where: { tracking_no: formatted }
  });

  if (!memberExists && !staffExists) {
    return formatted;
  }

  return ensureTrackingNumber(role, prismaClient);
}

export async function ensureMemberIdentifier(
  type: 'dtn' | 'rtn',
  prismaClient: PrismaClient = prisma
) {
  const prefix = type.toUpperCase();
  let value = '';
  let attempts = 0;

  while (attempts < 20) {
    const numeric = Math.floor(100000 + Math.random() * 900000);
    value = `${prefix}-${numeric}`;
    const existing = await prismaClient.member_Profiles.findFirst({
      where: { [type]: value } as Record<string, string>
    });

    if (!existing) {
      return value;
    }

    attempts += 1;
  }

  throw new Error(`Unable to generate a unique ${type}`);
}

export async function assignMissingMemberIdentifiers(
  memberId: number,
  prismaClient: PrismaClient = prisma
) {
  const member = await prismaClient.member_Profiles.findUnique({
    where: { member_id: memberId }
  });

  if (!member) {
    throw new Error('Member profile not found');
  }

  const updates: Record<string, string> = {};

  if (!member.dtn) {
    updates.dtn = await ensureMemberIdentifier('dtn', prismaClient);
  }

  if (!member.rtn) {
    updates.rtn = await ensureMemberIdentifier('rtn', prismaClient);
  }

  if (Object.keys(updates).length > 0) {
    await prismaClient.member_Profiles.update({
      where: { member_id: memberId },
      data: updates
    });
  }

  return { ...member, ...updates };
}

export async function seedMissingIdentifiersForAllMembers(
  prismaClient: PrismaClient = prisma
) {
  const members = await prismaClient.member_Profiles.findMany({
    select: { member_id: true, dtn: true, rtn: true }
  });

  let assigned = 0;

  for (const member of members) {
    const updates: Record<string, string> = {};

    if (!member.dtn) {
      updates.dtn = await ensureMemberIdentifier('dtn', prismaClient);
    }

    if (!member.rtn) {
      updates.rtn = await ensureMemberIdentifier('rtn', prismaClient);
    }

    if (Object.keys(updates).length > 0) {
      await prismaClient.member_Profiles.update({
        where: { member_id: member.member_id },
        data: updates
      });
      assigned += 1;
    }
  }

  return assigned;
}
