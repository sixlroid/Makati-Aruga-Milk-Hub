import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
