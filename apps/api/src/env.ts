import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  databaseUrl: required('DATABASE_URL', 'file:./dev.db'),
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  openaiTextModel: process.env.OPENAI_TEXT_MODEL ?? 'gpt-4o-mini',
  openaiVisionModel: process.env.OPENAI_VISION_MODEL ?? 'gpt-4o',
  get hasOpenAI(): boolean {
    return Boolean(this.openaiApiKey && this.openaiApiKey.startsWith('sk-'));
  },
};
