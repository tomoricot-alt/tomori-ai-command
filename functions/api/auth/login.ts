import { createSessionToken, isSecretKeyValid } from '../_auth-utils';

interface Env {
  API_SECRET_KEY?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // サーバー側のシークレット設定チェック（Fail-closed）
  const serverSecret = env.API_SECRET_KEY;
  if (!isSecretKeyValid(serverSecret)) {
    return new Response(
      JSON.stringify({
        error: 'ServerMisconfigured',
        message: 'サーバー側の認証鍵が正しく設定されていません。管理者は wrangler secret put API_SECRET_KEY を実行してください。',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  try {
    const body = await request.json() as { secretKey?: string };
    const clientKey = body.secretKey?.trim();

    if (!clientKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'MissingKey', message: 'シークレットキーが入力されていません。' }),
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // クライアントから提供されたキーとサーバーシークレットを照合
    if (clientKey === serverSecret) {
      // 共通シークレットそのものを返すのではなく、短命セッショントークン（2時間）を発行！
      const sessionToken = await createSessionToken(serverSecret, 'admin');

      return new Response(
        JSON.stringify({
          success: true,
          token: sessionToken,
          expiresIn: 7200, // 2時間
          message: '認証に成功しました。セッショントークンを発行しました。',
        }),
        {
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    // 認証失敗
    return new Response(
      JSON.stringify({
        success: false,
        error: 'InvalidCredentials',
        message: 'アクセスキーが無効です。',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'BadRequest', message: '不正なリクエスト形式です。' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
};
