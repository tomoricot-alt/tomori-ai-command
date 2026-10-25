interface Env {
  DB?: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  if (env.DB) {
    try {
      const { results } = await env.DB.prepare(
        'SELECT * FROM ai_usage ORDER BY service_name ASC'
      ).all();

      if (results && results.length > 0) {
        const entries = results.map((row: any) => ({
          service: row.service_name,
          scope: row.scope,
          plan: row.plan || '',
          used_percent: row.used_percent,
          remaining_percent: row.remaining_percent,
          measured: row.measured || 'remaining',
          credit_text: row.credit_text,
          reset_at_jst: row.reset_at_jst,
          note: row.note,
          source_url: row.source_url,
          status: row.status,
          stale: Boolean(row.stale),
          fetched_at_jst: row.fetched_at_jst,
          last_attempt_jst: row.last_attempt_jst,
          last_attempt_status: row.last_attempt_status,
        }));

        return new Response(
          JSON.stringify({
            generated_at_jst: entries[0]?.fetched_at_jst || '未取得',
            entries,
            source: 'cloudflare_d1',
          }),
          { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
        );
      }
    } catch (e: any) {
      console.warn('D1 query failed:', e.message);
    }
  }

  // デフォルト（PCからの最新同期待ち）
  return new Response(
    JSON.stringify({
      generated_at_jst: '未同期（ローカルPCからの同期待ち）',
      entries: [],
      source: 'uninitialized',
      notice: 'PCの常時監視スクリプトが停止中、または初回データが未送信です。',
    }),
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const data = await request.json() as { generated_at_jst: string; entries: any[] };

    if (!data.entries || !Array.isArray(data.entries)) {
      return new Response(
        JSON.stringify({ error: 'InvalidPayload', message: 'entries配列が必要です。' }),
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    if (env.DB) {
      for (const e of data.entries) {
        const serviceKey = `${e.service}|${e.scope}`;
        await env.DB.prepare(`
          INSERT INTO ai_usage (
            service_key, service_name, scope, plan, used_percent, remaining_percent,
            measured, credit_text, reset_at_jst, note, source_url, status,
            stale, fetched_at_jst, last_attempt_jst, last_attempt_status, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(service_key) DO UPDATE SET
            plan = excluded.plan,
            used_percent = excluded.used_percent,
            remaining_percent = excluded.remaining_percent,
            measured = excluded.measured,
            credit_text = excluded.credit_text,
            reset_at_jst = excluded.reset_at_jst,
            note = excluded.note,
            source_url = excluded.source_url,
            status = excluded.status,
            stale = excluded.stale,
            fetched_at_jst = excluded.fetched_at_jst,
            last_attempt_jst = excluded.last_attempt_jst,
            last_attempt_status = excluded.last_attempt_status,
            updated_at = excluded.updated_at
        `).bind(
          serviceKey,
          e.service,
          e.scope,
          e.plan || '',
          e.used_percent ?? null,
          e.remaining_percent ?? null,
          e.measured || 'remaining',
          e.credit_text || null,
          e.reset_at_jst || null,
          e.note || null,
          e.source_url || '',
          e.status || 'ok',
          e.stale ? 1 : 0,
          e.fetched_at_jst || data.generated_at_jst,
          e.last_attempt_jst || data.generated_at_jst,
          e.last_attempt_status || 'ok',
          new Date().toISOString()
        ).run();
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: data.entries.length,
        message: 'AI利用状況をCloudflare D1に更新しました。',
      }),
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: 'UpdateFailed', message: e.message }),
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
};
