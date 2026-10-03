import bcrypt from "bcryptjs";

const COST = 12;

/**
 * Hash ficticio con el mismo coste para comparar cuando el email no existe:
 * evita revelar por tiempos si una cuenta existe.
 */
let dummyHash: string | undefined;

async function getDummyHash(): Promise<string> {
  if (!dummyHash) dummyHash = await bcrypt.hash(`inexistente-${Math.random()}`, COST);
  return dummyHash;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

/** Compara siempre contra un hash bcrypt (real o ficticio) para no filtrar existencia. */
export async function verifyPassword(password: string, storedHash?: string): Promise<boolean> {
  const hash = storedHash ?? (await getDummyHash());
  const ok = await bcrypt.compare(password, hash);
  return storedHash !== undefined && ok;
}
