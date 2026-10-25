// Cloudflare Pages Functions Authentication Middleware

interface Env {
  DB?: D1Database;
  API_SECRET_KEY?: string;
  ENVIRONMENT?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // 認証チェックをスキップするパス（ヘルスチェックやログイン用エンドポイント）
  if (url.pathname === '/api/health' || url.pathname === '/api/auth/login') {
    return context.next();
  }

  // 1. Cloudflare Access (Zero Trust) ヘッダーの確認
  const cfAccessEmail = request.headers.get('Cf-Access-Authenticated-User-Email');
  const cfAccessJwt = request.headers.get('Cf-Access-Jwt-Assertion');

  if (cfAccessEmail || cfAccessJwt) {
    // Cloudflare Accessによって認証されている
    return context.next();
  }

  // 2. Bearer Token (セッショントークン / APIキー) の検証
  const authHeader = request.headers.get('Authorization');
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  // サーバー側の期待するシークレット（環境変数または開発時初期値）
  const expectedSecret = env.API_SECRET_KEY || 'tomori-cmd-secure-dev-key-2026';

  if (token && token === expectedSecret) {
    return context.next();
  }

  // 認証失敗: 業務データを一切返さず401 Unauthorizedで遮断
  return new Response(
    JSON.stringify({
      error: 'Unauthorized',
      code: 'AUTH_REQUIRED',
      message: '認証が必要です。有効なセッショントークンまたはCloudflare Access認証を提供してください。',
      authenticated: false,
    }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'WWW-Authenticate': 'Bearer error="invalid_token"',
      },
    }
  );
};
