interface Env {
  DB?: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  // D1バインディングが存在する場合
  if (env.DB) {
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
  }

  // D1未バインド時のレスポンス（本番初期またはローカル）
  return new Response(
    JSON.stringify({
      success: true,
      tasks: [],
      source: 'memory_empty',
      notice: 'D1データベースが未接続です。CloudflareダッシュボードでD1を作成・バインドしてください。',
    }),
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const task = await request.json() as any;
    if (!task.id || !task.title || !task.project || !task.assignedAI) {
      return new Response(
        JSON.stringify({ error: 'ValidationError', message: '必須項目が不足しています。' }),
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    if (env.DB) {
      await env.DB.prepare(`
        INSERT INTO tasks (
          id, title, description, project, assigned_ai, model_name, status,
          is_status_confirmed, last_confirmed_at, created_at, updated_at,
          source_url, instruction_prompt, result_summary, next_actions,
          artifacts_json, history_json, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        task.createdAt || new Date().toISOString(),
        task.updatedAt || new Date().toISOString(),
        task.sourceUrl || null,
        task.instructionPrompt || '',
        task.resultSummary || '',
        task.nextActions || '',
        JSON.stringify(task.artifacts || []),
        JSON.stringify(task.history || []),
        task.createdBy || 'Web UI',
        task.updatedBy || 'User'
      ).run();
    }

    return new Response(
      JSON.stringify({ success: true, task, message: 'タスクを保存しました。' }),
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: 'SaveFailed', message: e.message }),
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
};
