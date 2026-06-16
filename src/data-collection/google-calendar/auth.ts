import { google } from 'googleapis';
import { config } from '../../config';
import { createLogger } from '../../utils/logger';

const logger = createLogger('GoogleAuth');

// Derive the OAuth2Client type from googleapis itself — avoids dual google-auth-library conflict
export type GoogleOAuth2Client = InstanceType<typeof google.auth.OAuth2>;

export function createOAuth2Client(): GoogleOAuth2Client {
  return new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri,
  );
}

export function setTokens(
  client: GoogleOAuth2Client,
  tokens: { access_token?: string | null; refresh_token?: string | null },
): void {
  client.setCredentials(tokens);
}

export async function getAuthenticatedClient(): Promise<GoogleOAuth2Client> {
  // Option 1: Service account JSON (production / CI)
  const serviceAccountJson = process.env['GOOGLE_SERVICE_ACCOUNT_JSON'];
  if (serviceAccountJson) {
    try {
      const credentials = JSON.parse(serviceAccountJson) as Record<string, unknown>;
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      });
      const saClient = await auth.getClient();
      logger.info('Using service account authentication');
      return saClient as unknown as GoogleOAuth2Client;
    } catch (err) {
      logger.error('Failed to parse service account JSON', { error: (err as Error).message });
      throw err;
    }
  }

  // Option 2: Pre-obtained OAuth2 tokens via env vars (dev / quick testing)
  const accessToken = process.env['GOOGLE_ACCESS_TOKEN'];
  const refreshToken = process.env['GOOGLE_REFRESH_TOKEN'];
  if (accessToken || refreshToken) {
    const client = createOAuth2Client();
    client.setCredentials({
      access_token: accessToken ?? null,
      refresh_token: refreshToken ?? null,
    });
    logger.info('Using OAuth2 tokens from environment variables');
    return client;
  }

  // Option 3: OAuth2 client with no tokens — caller must complete the auth flow
  logger.debug('Returning bare OAuth2 client — complete auth flow or set GOOGLE_ACCESS_TOKEN');
  return createOAuth2Client();
}

export function generateAuthUrl(client: GoogleOAuth2Client, state?: string): string {
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.readonly'],
    state,
  });
}

export async function exchangeCode(
  client: GoogleOAuth2Client,
  code: string,
): Promise<{ access_token: string; refresh_token?: string }> {
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  return {
    access_token: tokens.access_token ?? '',
    refresh_token: tokens.refresh_token ?? undefined,
  };
}
