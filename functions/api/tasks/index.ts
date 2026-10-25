interface Env {
  DB?: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  // D1未接続の場合は成功を偽装せず、明確なエラー（503 Service Unavailable）を返す
  if (!env.DB) {
    return new Response(
      JSON.stringify({
        error: 'DatabaseNotBound',
        code: 'D1_NOT_CONNECTED',
        message: 'Cloudflare D1データベースが接続されていません。Cloudflare Pagesの設定でD1データベース「DB」をバインドしてください。',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM tasks ORDER BY updated_at DESC'
    ).all();

    const tasks = results.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description || '',
      project: row.project,
      assignedAI: row.assigned_ai,
      modelName: row.model_name || '',
      status: row.status,
      isStatusConfirmed: Boolean(row.is_status_confirmed),
      lastConfirmedAt: row.last_confirmed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      version: row.version ?? 1,
      sourceUrl: row.source_url,
      instructionPrompt: row.instruction_prompt || '',
      resultSummary: row.result_summary || '',
      nextActions: row.next_actions || '',
      artifacts: JSON.parse(row.artifacts_json || '[]'),
      history: JSON.parse(row.history_json || '[]'),
      createdBy: row.created_by || 'Web UI',
      updatedBy: row.updated_by || 'User',
    }));

    return new Response(JSON.stringify({ success: true, tasks, source: 'cloudflare_d1' }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: 'DatabaseError', message: e.message }),
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // D1未接続の場合は保存成功を偽装せず、明確なエラーを返す！
  if (!env.DB) {
    return new Response(
      JSON.stringify({
        error: 'DatabaseNotBound',
        code: 'D1_NOT_CONNECTED',
        message: 'Cloudflare D1データベースが接続されていません。保存できません。',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  try {
    const task = await request.json() as any;
    if (!task.id || !task.title || !task.project || !task.assignedAI) {
      return new Response(
        JSON.stringify({ error: 'ValidationError', message: '必須項目が不足しています。' }),
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // 楽観的排他制御（Optimistic Concurrency Control）
    // 既存タスクが存在する場合、バージョンまたは更新日時をチェックして競合を防止
    const existing = await env.DB.prepare('SELECT version, updated_at FROM tasks WHERE id = ?')
      .bind(task.id)
      .first<{ version: number; updated_at: string }>();

    let nextVersion = 1;

    if (existing) {
      const clientVersion = task.version ?? 1;
      // 端末側の保持バージョンがDBの最新バージョンより古い場合は競合（409 Conflict）
      if (clientVersion < existing.version) {
        return new Response(
          JSON.stringify({
            error: 'Conflict',
            code: 'CONCURRENT_MODIFICATION',
            message: '別の端末で既に更新されています。最新データを再読み込みしてください。',
            serverVersion: existing.version,
            serverUpdatedAt: existing.updated_at,
          }),
          { status: 409, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
        );
      }
      nextVersion = existing.version + 1;
    }

    const nowIso = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO tasks (
        id, title, description, project, assigned_ai, model_name, status,
        is_status_confirmed, last_confirmed_at, created_at, updated_at, version,
        source_url, instruction_prompt, result_summary, next_actions,
        artifacts_json, history_json, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        project = excluded.project,
        assigned_ai = excluded.assigned_ai,
        model_name = excluded.model_name,
        status = excluded.status,
        is_status_confirmed = excluded.is_status_confirmed,
        last_confirmed_at = excluded.last_confirmed_at,
        updated_at = excluded.updated_at,
        version = excluded.version,
        source_url = excluded.source_url,
        instruction_prompt = excluded.instruction_prompt,
        result_summary = excluded.result_summary,
        next_actions = excluded.next_actions,
        artifacts_json = excluded.artifacts_json,
        history_json = excluded.history_json,
        updated_by = excluded.updated_by
    `).bind(
      task.id,
      task.title,
      task.description || '',
      task.project,
      task.assignedAI,
      task.modelName || '',
      task.status || '未着手',
      task.isStatusConfirmed ? 1 : 0,
      task.lastConfirmedAt || '',
      task.createdAt || nowIso,
      task.updatedAt || nowIso,
      nextVersion,
      task.sourceUrl || null,
      task.instructionPrompt || '',
      task.resultSummary || '',
      task.nextActions || '',
      JSON.stringify(task.artifacts || []),
      JSON.stringify(task.history || []),
      task.createdBy || 'Web UI',
      task.updatedBy || 'User'
    ).run();

    return new Response(
      JSON.stringify({
        success: true,
        task: { ...task, version: nextVersion },
        version: nextVersion,
        message: 'タスクをD1に保存しました。',
      }),
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: 'SaveFailed', message: e.message }),
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
};
