import { prisma } from '../db/prisma';

/**
 * Permanently purge a deleted/inactive user and transfer or remove any owned groups.
 * Cascading database relations automatically clean up memberships, sessions, logs, tokens, etc.
 */
export async function cleanupDeletedUser(userId: string): Promise<boolean> {
  try {
    // 1. Resolve any groups owned by this user
    const ownedGroups = await prisma.group.findMany({
      where: { owner_id: userId },
      include: { memberships: { orderBy: { joined_at: 'asc' } } },
    });

    for (const g of ownedGroups) {
      const otherMembers = g.memberships.filter(m => m.user_id !== userId);
      if (otherMembers.length > 0) {
        // Transfer ownership to the next earliest member
        await prisma.$transaction([
          prisma.group.update({
            where: { id: g.id },
            data: { owner_id: otherMembers[0].user_id },
          }),
          prisma.membership.update({
            where: { id: otherMembers[0].id },
            data: { role: 'owner' },
          }),
        ]);
      } else {
        // User was the sole member; delete the group
        await prisma.group.delete({ where: { id: g.id } });
      }
    }

    // 2. Permanently delete the user record, releasing username and email
    await prisma.user.delete({
      where: { id: userId },
    });

    console.log(`[cleanupDeletedUser] Successfully purged user ${userId} and released credentials.`);
    return true;
  } catch (err: any) {
    console.error(`[cleanupDeletedUser Error] Failed to purge user ${userId}:`, err.message);
    return false;
  }
}
