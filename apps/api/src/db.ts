import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

/**
 * Returns the single household for the MVP (creates a default one on first run).
 * Modelled as a function so multi-household support slots in later.
 */
export async function getDefaultHousehold() {
  const existing = await prisma.household.findFirst();
  if (existing) return existing;
  return prisma.household.create({ data: { name: 'My Household' } });
}
