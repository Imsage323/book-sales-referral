export function getCorsOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const configured = (env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (configured.length > 0) return configured;
  if (env.NODE_ENV === 'production') return [];
  return ['http://localhost:5173', 'http://127.0.0.1:5173'];
}
