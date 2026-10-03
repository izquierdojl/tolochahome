import { z } from "zod";

/** Acepta "15m", "2h", "30d", "60s" o milisegundos en número. Devuelve ms. */
export function parseDuration(value: string): number {
  const plain = Number(value);
  if (value.trim() !== "" && Number.isFinite(plain) && plain >= 0) return plain;
  const match = /^(\d+)\s*(ms|s|m|h|d)$/.exec(value.trim());
  if (!match) throw new Error(`Duración inválida: "${value}" (usa 15m, 2h, 30d, 60000…)`);
  const amount = Number(match[1]);
  const factor: Record<string, number> = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * (factor[match[2]] ?? 1);
}

const boolSchema = z
  .string()
  .optional()
  .transform((v) => (v === undefined || v === "" ? true : v.toLowerCase() === "true"));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_PATH: z.string().min(1).default("./data/tolochahome.db"),
  JWT_ACCESS_SECRET: z.string().min(1).default("dev-access-secret-solo-para-desarrollo"),
  JWT_REFRESH_SECRET: z.string().min(1).default("dev-refresh-secret-solo-para-desarrollo"),
  JWT_ACCESS_TTL: z.string().min(1).default("15m"),
  JWT_REFRESH_TTL: z.string().min(1).default("30d"),
  REFRESH_ROTATE_THRESHOLD: z.string().min(1).default("24h"),
  REFRESH_GRACE_MS: z.coerce.number().int().min(0).default(60000),
  REGISTRATION_ENABLED: boolSchema,
  STATIC_DIR: z.string().min(1).optional(),
});

export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  port: number;
  databasePath: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessTtlMs: number;
  jwtRefreshTtlMs: number;
  refreshRotateThresholdMs: number;
  refreshGraceMs: number;
  registrationEnabled: boolean;
  staticDir?: string;
  isProduction: boolean;
}

/** Valida el entorno y falla rápido si la configuración es insegura en producción. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse({
    NODE_ENV: source.NODE_ENV,
    PORT: source.PORT,
    DATABASE_PATH: source.DATABASE_PATH,
    JWT_ACCESS_SECRET: source.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: source.JWT_REFRESH_SECRET,
    JWT_ACCESS_TTL: source.JWT_ACCESS_TTL,
    JWT_REFRESH_TTL: source.JWT_REFRESH_TTL,
    REFRESH_ROTATE_THRESHOLD: source.REFRESH_ROTATE_THRESHOLD,
    REFRESH_GRACE_MS: source.REFRESH_GRACE_MS,
    REGISTRATION_ENABLED: source.REGISTRATION_ENABLED,
    STATIC_DIR: source.STATIC_DIR,
  });
  const isProduction = parsed.NODE_ENV === "production";
  if (isProduction) {
    for (const [name, value] of [
      ["JWT_ACCESS_SECRET", parsed.JWT_ACCESS_SECRET],
      ["JWT_REFRESH_SECRET", parsed.JWT_REFRESH_SECRET],
    ] as const) {
      if (value.length < 32 || value.startsWith("dev-")) {
        throw new Error(`${name} debe tener al menos 32 caracteres en producción`);
      }
    }
  }
  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    databasePath: parsed.DATABASE_PATH,
    jwtAccessSecret: parsed.JWT_ACCESS_SECRET,
    jwtRefreshSecret: parsed.JWT_REFRESH_SECRET,
    jwtAccessTtlMs: parseDuration(parsed.JWT_ACCESS_TTL),
    jwtRefreshTtlMs: parseDuration(parsed.JWT_REFRESH_TTL),
    refreshRotateThresholdMs: parseDuration(parsed.REFRESH_ROTATE_THRESHOLD),
    refreshGraceMs: parsed.REFRESH_GRACE_MS,
    registrationEnabled: parsed.REGISTRATION_ENABLED ?? true,
    staticDir: parsed.STATIC_DIR,
    isProduction,
  };
}
