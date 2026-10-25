// Cloudflare Pages Functions Authentication Middleware (Hardened Security)
import { isSecretKeyValid, verifyCfAccessJwt, verifySessionToken } from './_auth-utils';

interface Env {
  DB?: D1Database;
  API_SECRET_KEY?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // 認証チェックをスキップする公開エンドポイント（ヘルスチェックとログインAPI）
  if (url.pathname === '/api/health' || url.pathname === '/api/auth/login') {
    return context.next();
  }

  // 1. Cloudflare Access JWT の厳格な検証
  // ※ 単なる「Cf-Access-Authenticated-User-Email」ヘッダーの存在は信用しない（偽装防止）
  const cfAccessJwt = request.headers.get('Cf-Access-Jwt-Assertion');
  if (cfAccessJwt) {
    const cfResult = verifyCfAccessJwt(
      cfAccessJwt,
      env.CF_ACCESS_TEAM_DOMAIN,
      env.CF_ACCESS_AUD
    );

    if (cfResult.valid) {
      // 有効なCloudflare Access JWTが確認された場合のみ通過
      return context.next();
    }
    // JWTが渡されているが無効（改ざん・期限切れ）な場合は直ちに拒否
    return new Response(
      JSON.stringify({
        error: 'Unauthorized',
        code: 'CF_ACCESS_INVALID',
        message: `Cloudflare Access認証トークンが無効または期限切れです: ${cfResult.error}`,
      }),
      { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  // 2. Bearer Session Token の検証
  // ※ サーバー側の秘密鍵が未設定、または安全でない固定値の場合は直ちに拒絶（Fail-closed）
  const serverSecret = env.API_SECRET_KEY;
  if (!isSecretKeyValid(serverSecret)) {
    return new Response(
      JSON.stringify({
        error: 'ServerMisconfigured',
        code: 'SECRET_KEY_NOT_CONFIGURED',
        message: 'サーバー側の認証鍵が正しく設定されていません。管理者は wrangler secret put API_SECRET_KEY を実行してください。',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const tokenPayload = await verifySessionToken(token, serverSecret!);

    if (tokenPayload) {
      // 正当な署名を持つセッショントークン
      return context.next();
    }
  }

  // 3. 認証失敗: 業務データを一切返さず401 Unauthorizedで完全遮断
  return new Response(
    JSON.stringify({
      error: 'Unauthorized',
      code: 'AUTH_REQUIRED',
      message: '認証が必要です。有効なセッショントークンまたはCloudflare Access認証が必要です。',
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
