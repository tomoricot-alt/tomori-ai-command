interface Env {
  DB?: D1Database;
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { params, env } = context;
  const taskId = params.id as string;

  if (!env.DB) {
    return new Response(
      JSON.stringify({
        error: 'DatabaseNotBound',
        message: 'Cloudflare D1データベースが接続されていません。削除できません。',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  if (taskId) {
    await env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(taskId).run();
  }

  return new Response(
    JSON.stringify({ success: true, id: taskId, message: 'タスクを削除しました。' }),
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
};
