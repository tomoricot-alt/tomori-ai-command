interface Env {
  API_SECRET_KEY?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as { secretKey?: string };
    const expectedSecret = env.API_SECRET_KEY || 'tomori-cmd-secure-dev-key-2026';

    if (body.secretKey && body.secretKey === expectedSecret) {
      return new Response(
        JSON.stringify({
          success: true,
          token: expectedSecret,
          message: '認証に成功しました。',
        }),
        {
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

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
