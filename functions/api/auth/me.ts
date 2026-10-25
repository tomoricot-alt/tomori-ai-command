export const onRequestGet: PagesFunction = async (context) => {
  const { request } = context;

  const cfAccessEmail = request.headers.get('Cf-Access-Authenticated-User-Email');
  const authHeader = request.headers.get('Authorization');

  return new Response(
    JSON.stringify({
      authenticated: true,
      authMethod: cfAccessEmail ? 'cloudflare_access' : 'bearer_token',
      userEmail: cfAccessEmail || 'authorized-user',
      timestamp: new Date().toISOString(),
    }),
    {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }
  );
};
