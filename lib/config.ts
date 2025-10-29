export const config = {
  database: {
    url: process.env.DATABASE_URL!,
    postgresUrl: process.env.POSTGRES_URL!,
    prismaUrl: process.env.POSTGRES_PRISMA_URL!,
    unpooledUrl: process.env.DATABASE_URL_UNPOOLED!,
    host: process.env.PGHOST!,
    user: process.env.PGUSER!,
    password: process.env.PGPASSWORD!,
    database: process.env.PGDATABASE!,
    projectId: process.env.NEON_PROJECT_ID!,
  },
  auth: {
    secret: process.env.NEXTAUTH_SECRET!,
    authSecret: process.env.AUTH_SECRET!,
    url: process.env.NEXTAUTH_URL!,
  },
  cloudflare: {
    r2: {
      accountId: process.env.CF_R2_ACCOUNT_ID!,
      accessKeyId: process.env.CF_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY!,
      bucketName: process.env.CF_R2_BUCKET_NAME!,
      endpoint: process.env.CF_R2_ENDPOINT!,
      publicUrl: process.env.CF_R2_PUBLIC_URL!,
    },
  },
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    defaultLocale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'vi',
    devRedirectUrl: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL!,
    mockApiDelay: parseInt(process.env.NEXT_PUBLIC_MOCK_API_DELAY || '300'),
    enableMsw: process.env.NEXT_PUBLIC_ENABLE_MSW === 'true',
  },
} as const;

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'AUTH_SECRET',
  'CF_R2_ACCESS_KEY_ID',
  'CF_R2_SECRET_ACCESS_KEY',
  'CF_R2_BUCKET_NAME',
] as const;

export function validateConfig() {
  const missing = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}