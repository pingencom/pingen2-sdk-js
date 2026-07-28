/**
 * OAuth integration test for the Pingen JS SDK against the staging environment.
 *
 * Verifies the stateful `OAuth` token source end to end: a client-credentials token can be
 * obtained and used, it is reused while still valid, and after invalidation the next call
 * transparently fetches a fresh, working token. Also covers the `PingenClient` wiring, which
 * refreshes the token behind the scenes on a 401.
 */

import { ApiRequestor, OAuth, Organisations } from '../../src';
import { createClient, loadCredentials, missingCredentials, useStaging } from './support';

const credentials = loadCredentials();
const describeIntegration = describe.skipIf(missingCredentials(credentials));

describeIntegration('OAuth (staging)', () => {
  const staging = useStaging(credentials);

  const buildOAuth = (): OAuth =>
    new OAuth({
      clientId: credentials.PINGEN2_CLIENT_ID,
      clientSecret: credentials.PINGEN2_CLIENT_SECRET,
      useStaging: staging,
    });

  const organisationsWith = (token: string): Organisations =>
    new Organisations(new ApiRequestor(token, { useStaging: staging }));

  test('token can be obtained and used', async () => {
    const token = await buildOAuth().getAccessToken();

    expect(token).toBeTruthy();

    const response = await organisationsWith(token).getCollection();

    expect(response.statusCode).toBe(200);
    expect(response.toCollection().data.length).toBeGreaterThan(0);
  });

  test('token is reused while valid', async () => {
    const oauth = buildOAuth();

    const first = await oauth.getAccessToken();
    const second = await oauth.getAccessToken();

    expect(second).toBe(first);
  });

  test('concurrent calls share a single token request', async () => {
    const oauth = buildOAuth();

    const [first, second, third] = await Promise.all([
      oauth.getAccessToken(),
      oauth.getAccessToken(),
      oauth.getAccessToken(),
    ]);

    expect(second).toBe(first);
    expect(third).toBe(first);
  });

  test('an invalidated token is replaced by a fresh, working one', async () => {
    const oauth = buildOAuth();

    const first = await oauth.getAccessToken();
    expect((await organisationsWith(first).getCollection()).statusCode).toBe(200);

    oauth.invalidate();

    const second = await oauth.getAccessToken();
    expect(second).not.toBe(first);
    expect((await organisationsWith(second).getCollection()).statusCode).toBe(200);
  });

  test('PingenClient authenticates itself', async () => {
    const client = await createClient(credentials);

    expect((await client.organisations().getCollection()).statusCode).toBe(200);
  });
});
