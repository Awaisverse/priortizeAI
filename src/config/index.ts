import * as dotenv from 'dotenv';
dotenv.config();

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

export const config = {
  env: optionalEnv('NODE_ENV', 'development') as 'development' | 'staging' | 'production',
  logLevel: optionalEnv('LOG_LEVEL', 'info'),
  port: parseInt(optionalEnv('PORT', '3000'), 10),

  hubspot: {
    apiKey: optionalEnv('HUBSPOT_API_KEY', ''),
    apiEndpoint: optionalEnv('HUBSPOT_API_ENDPOINT', 'https://api.hubapi.com'),
    rateLimit: {
      requestsPerWindow: 100,
      windowMs: 10_000,
    },
    pageSize: 100,
  },

  google: {
    clientId: optionalEnv('GOOGLE_CLIENT_ID', ''),
    clientSecret: optionalEnv('GOOGLE_CLIENT_SECRET', ''),
    redirectUri: optionalEnv('GOOGLE_REDIRECT_URI', 'http://localhost:3000/auth/google/callback'),
    calendarFetchDays: 7,
  },

  gemini: {
    apiKey: optionalEnv('GEMINI_API_KEY', ''),
    model: optionalEnv('GEMINI_MODEL', 'gemini-2.0-flash'),
    maxTokens: 4096,
  },

  slack: {
    botToken: optionalEnv('SLACK_BOT_TOKEN', ''),
    workspaceId: optionalEnv('SLACK_WORKSPACE_ID', ''),
  },

  cache: {
    enabled: optionalEnv('ENABLE_CACHE', 'true') === 'true',
    ttlSeconds: parseInt(optionalEnv('CACHE_TTL_SECONDS', '3600'), 10),
    checkPeriodSeconds: 600,
  },

  api: {
    timeoutMs: parseInt(optionalEnv('API_TIMEOUT_MS', '30000'), 10),
    retryAttempts: 3,
    retryBaseDelayMs: 500,
  },

  features: {
    aiEnabled: optionalEnv('ENABLE_AI', 'true') === 'true',
    slackDelivery: optionalEnv('ENABLE_SLACK_DELIVERY', 'false') === 'true',
  },
} as const;

export type Config = typeof config;
