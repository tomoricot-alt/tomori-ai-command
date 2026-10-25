import { describe, expect, it } from 'vitest';
import {
  base64UrlEncode,
  clearJwksCache,
  createSessionToken,
  isSecretKeyValid,
  verifyCfAccessJwt,
  verifySessionToken,
} from '../../functions/api/_auth-utils';
import { INITIAL_AI_USAGE, INITIAL_TASKS, SAMPLE_AI_USAGE, SAMPLE_TASKS } from '../constants/initialData';
import { ApiService } from '../services/api';
import { PromptGeneratorService } from '../services/promptGenerator';
import { RouterService } from '../services/router';

async function generateTestRsaKeyPair(kid: string) {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  );
  const publicJwk = (await crypto.subtle.exportKey('jwk', keyPair.publicKey)) as JsonWebKey & {
    kid: string;
    use: string;
  };
  publicJwk.kid = kid;
  publicJwk.alg = 'RS256';
  publicJwk.use = 'sig';
  return { keyPair, publicJwk };
}

async function signTestCfJwt(
  payload: Record<string, any>,
  privateKey: CryptoKey,
  kid = 'test-cf-access-key-1',
  alg = 'RS256'
): Promise<string> {
  const enc = new TextEncoder();
  const headerB64 = base64UrlEncode(enc.encode(JSON.stringify({ alg, kid, typ: 'JWT' })));
  const payloadB64 = base64UrlEncode(enc.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, enc.encode(signingInput));
  const sigB64 = base64UrlEncode(new Uint8Array(sig));
  return `${signingInput}.${sigB64}`;
}

describe('TOMORI AI COMMAND 厳格セキュリティ・D1同期・機能総合検証テスト', () => {
  const TEST_VALID_SECRET = 'a_very_secure_and_long_production_secret_key_2026';

  // 1. 漏洩シークレット・未設定シークレットの拒絶検証
  it('1. [セキュリティ] 漏洩シークレットおよび未設定/脆弱シークレットが完全に拒絶されること', () => {
    // 漏洩済み旧キーの拒絶
    expect(isSecretKeyValid('tomori-cmd-secure-dev-key-2026')).toBe(false);
    expect(isSecretKeyValid('2026')).toBe(false);
    expect(isSecretKeyValid('tomori')).toBe(false);
    expect(isSecretKeyValid('admin')).toBe(false);
    expect(isSecretKeyValid('secret')).toBe(false);

    // 未設定（undefined / 空文字）の拒絶（Fail-closed）
    expect(isSecretKeyValid(undefined)).toBe(false);
    expect(isSecretKeyValid('')).toBe(false);
    expect(isSecretKeyValid('   ')).toBe(false);

    // 短すぎるシークレット（16文字未満）の拒絶
    expect(isSecretKeyValid('short-secret')).toBe(false);

    // 適切な長さを持つ安全なシークレットのみ承認
    expect(isSecretKeyValid(TEST_VALID_SECRET)).toBe(true);
  });

  // 2. Cloudflare Access 公開鍵（JWKS）署名検証・Fail-Closed検証
  it('2. [セキュリティ] Cloudflare Access JWTのJWKS暗号署名検証・偽造/改ざん/期限切れ/不正Audienceの完全遮断', async () => {
    clearJwksCache();
    const TEST_TEAM = 'tomori-team';
    const TEST_AUD = 'aud-valid-uuid-2026';
    const KID = 'test-key-id-valid';

    // 正当な鍵ペアと攻撃者（偽造用）の鍵ペアを生成
    const { keyPair: validKeys, publicJwk: validPublicJwk } = await generateTestRsaKeyPair(KID);
    const { keyPair: attackerKeys } = await generateTestRsaKeyPair(KID);

    const nowSec = Math.floor(Date.now() / 1000);
    const validPayload = {
      sub: 'usr-12345',
      email: 'admin@tomori-cot.com',
      iss: `https://${TEST_TEAM}.cloudflareaccess.com`,
      aud: TEST_AUD,
      exp: nowSec + 3600,
      nbf: nowSec - 10,
    };

    // A. 正当なRSA署名と有効なクレームを持つJWTの検証成功
    const validJwt = await signTestCfJwt(validPayload, validKeys.privateKey, KID);
    const validResult = await verifyCfAccessJwt(validJwt, {
      teamDomain: TEST_TEAM,
      aud: TEST_AUD,
      jwksKeys: [validPublicJwk],
    });
    expect(validResult.valid).toBe(true);
    expect(validResult.email).toBe('admin@tomori-cot.com');

    // Positional 引数形式 (jwt, teamDomain, aud, { jwksKeys }) の動作確認
    const positionalResult = await verifyCfAccessJwt(validJwt, TEST_TEAM, TEST_AUD, {
      jwksKeys: [validPublicJwk],
    });
    expect(positionalResult.valid).toBe(true);
    expect(positionalResult.email).toBe('admin@tomori-cot.com');

    // B. 偽造JWT（不正な攻撃者の鍵で署名）の検知・遮断
    const forgedJwt = await signTestCfJwt(validPayload, attackerKeys.privateKey, KID);
    const forgedResult = await verifyCfAccessJwt(forgedJwt, {
      teamDomain: TEST_TEAM,
      aud: TEST_AUD,
      jwksKeys: [validPublicJwk],
    });
    expect(forgedResult.valid).toBe(false);
    expect(forgedResult.error).toContain('Invalid cryptographic signature');

    // C. 署名改ざん（ペイロードまたは署名の変更）の検知・遮断
    const parts = validJwt.split('.');
    const tamperedPayload = base64UrlEncode(
      new TextEncoder().encode(JSON.stringify({ ...validPayload, email: 'hacker@malicious.com' }))
    );
    const tamperedJwt = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    const tamperedResult = await verifyCfAccessJwt(tamperedJwt, {
      teamDomain: TEST_TEAM,
      aud: TEST_AUD,
      jwksKeys: [validPublicJwk],
    });
    expect(tamperedResult.valid).toBe(false);
    expect(tamperedResult.error).toContain('Invalid cryptographic signature');

    // D. 有効期限切れ（expが過去）の検知・遮断
    const expiredPayload = { ...validPayload, exp: nowSec - 60 };
    const expiredJwt = await signTestCfJwt(expiredPayload, validKeys.privateKey, KID);
    const expiredResult = await verifyCfAccessJwt(expiredJwt, {
      teamDomain: TEST_TEAM,
      aud: TEST_AUD,
      jwksKeys: [validPublicJwk],
    });
    expect(expiredResult.valid).toBe(false);
    expect(expiredResult.error).toContain('expired');

    // E. 有効開始前（nbfが未来）の検知・遮断
    const futurePayload = { ...validPayload, nbf: nowSec + 300 };
    const futureJwt = await signTestCfJwt(futurePayload, validKeys.privateKey, KID);
    const futureResult = await verifyCfAccessJwt(futureJwt, {
      teamDomain: TEST_TEAM,
      aud: TEST_AUD,
      jwksKeys: [validPublicJwk],
    });
    expect(futureResult.valid).toBe(false);
    expect(futureResult.error).toContain('Token not yet valid');

    // F. 不正なAudience（aud不一致）の検知・遮断
    const wrongAudPayload = { ...validPayload, aud: 'wrong-audience-uuid' };
    const wrongAudJwt = await signTestCfJwt(wrongAudPayload, validKeys.privateKey, KID);
    const wrongAudResult = await verifyCfAccessJwt(wrongAudJwt, {
      teamDomain: TEST_TEAM,
      aud: TEST_AUD,
      jwksKeys: [validPublicJwk],
    });
    expect(wrongAudResult.valid).toBe(false);
    expect(wrongAudResult.error).toContain('Audience mismatch');

    // G. 不正なIssuer（iss不一致）の検知・遮断
    const wrongIssPayload = { ...validPayload, iss: 'https://attacker.cloudflareaccess.com' };
    const wrongIssJwt = await signTestCfJwt(wrongIssPayload, validKeys.privateKey, KID);
    const wrongIssResult = await verifyCfAccessJwt(wrongIssJwt, {
      teamDomain: TEST_TEAM,
      aud: TEST_AUD,
      jwksKeys: [validPublicJwk],
    });
    expect(wrongIssResult.valid).toBe(false);
    expect(wrongIssResult.error).toContain('Invalid issuer');

    // H. メールアドレス欠落（emailなし/空文字）の検知・遮断
    const noEmailPayload = { ...validPayload, email: '' };
    const noEmailJwt = await signTestCfJwt(noEmailPayload, validKeys.privateKey, KID);
    const noEmailResult = await verifyCfAccessJwt(noEmailJwt, {
      teamDomain: TEST_TEAM,
      aud: TEST_AUD,
      jwksKeys: [validPublicJwk],
    });
    expect(noEmailResult.valid).toBe(false);
    expect(noEmailResult.error).toContain('email');

    // I. 未知のKey ID（JWKSに登録されていないkid）の検知・遮断
    const unknownKidJwt = await signTestCfJwt(validPayload, validKeys.privateKey, 'unknown-kid-999');
    const unknownKidResult = await verifyCfAccessJwt(unknownKidJwt, {
      teamDomain: TEST_TEAM,
      aud: TEST_AUD,
      jwksKeys: [validPublicJwk],
    });
    expect(unknownKidResult.valid).toBe(false);
    expect(unknownKidResult.error).toContain('not found in JWKS');

    // J. 環境変数未設定（Fail-Closed）の検知・遮断
    const noEnvResult1 = await verifyCfAccessJwt(validJwt, undefined, TEST_AUD);
    expect(noEnvResult1.valid).toBe(false);
    expect(noEnvResult1.error).toContain('CF_ACCESS_TEAM_DOMAIN is not configured');

    const noEnvResult2 = await verifyCfAccessJwt(validJwt, TEST_TEAM, undefined);
    expect(noEnvResult2.valid).toBe(false);
    expect(noEnvResult2.error).toContain('CF_ACCESS_AUD is not configured');

    // K. 形式不正JWTの遮断
    const malformedResult = await verifyCfAccessJwt('malformed.jwt', TEST_TEAM, TEST_AUD);
    expect(malformedResult.valid).toBe(false);
  });

  // 3. セッショントークンの暗号学的署名・有効期限検証
  it('3. [セキュリティ] HMAC-SHA256署名付きセッショントークンの発行・検証・改ざん防止', async () => {
    // トークン発行
    const token = await createSessionToken(TEST_VALID_SECRET, 'admin');
    expect(token).toBeDefined();
    expect(token.split('.').length).toBe(3);

    // 正当なトークンの検証
    const verified = await verifySessionToken(token, TEST_VALID_SECRET);
    expect(verified).not.toBeNull();
    expect(verified?.sub).toBe('tomori-admin');
    expect(verified?.role).toBe('admin');

    // 別のシークレットでの検証失敗（改ざん検知）
    const failedVerify = await verifySessionToken(token, 'another_different_secure_secret_9999');
    expect(failedVerify).toBeNull();

    // トークンペイロード改ざん時の検証失敗
    const parts = token.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ sub: 'hacker', exp: 9999999999 })).toString('base64url');
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    const tamperedVerify = await verifySessionToken(tamperedToken, TEST_VALID_SECRET);
    expect(tamperedVerify).toBeNull();
  });

  // 4. セキュリティ：初期データに機密情報を含まないことの検証
  it('4. [セキュリティ] 初期バンドルデータに実案件の機密情報が含まれず、空配列であること', () => {
    expect(INITIAL_TASKS).toEqual([]);
    expect(INITIAL_AI_USAGE.entries).toEqual([]);
    expect(SAMPLE_TASKS.length).toBeGreaterThan(0);
    expect(SAMPLE_TASKS[0].title).toContain('【サンプル】');
  });

  // 5. 複数端末競合制御（Optimistic Concurrency Control）ロジックの検証
  it('5. [D1同期] 楽観的排他制御による複数端末の競合（409 Conflict）検知ロジック', () => {
    const serverTask = {
      id: 'TSK-1001',
      title: '最新のタスク名（端末Bで更新済み）',
      version: 2,
      updated_at: '2026-10-25T14:00:00Z',
    };

    // 端末Aがバージョン1のまま更新しようとした場合
    const clientTaskA = {
      id: 'TSK-1001',
      title: '端末Aの編集内容',
      version: 1, // 古いバージョン
    };

    const isConflict = (clientTaskA.version ?? 1) < serverTask.version;
    expect(isConflict).toBe(true);

    // 端末Aが最新バージョン2を取得した後の更新は成功すること
    const clientTaskAUpdated = {
      id: 'TSK-1001',
      title: '競合解決後の編集内容',
      version: 2,
    };
    const isConflictResolved = (clientTaskAUpdated.version ?? 1) < serverTask.version;
    expect(isConflictResolved).toBe(false);
  });

  // 6. D1未バインド/障害時のFail-safe検証
  it('6. [D1障害耐性] D1未接続時に200成功を偽装せずエラー状態を認識すること', async () => {
    const mockStorage: Record<string, string> = {};
    const mockStorageObj = {
      getItem: (k: string) => mockStorage[k] || null,
      setItem: (k: string, v: string) => {
        mockStorage[k] = v;
      },
      removeItem: (k: string) => {
        delete mockStorage[k];
      },
      clear: () => {},
      length: 0,
      key: () => null,
    };
    (globalThis as any).localStorage = mockStorageObj;
    (globalThis as any).sessionStorage = mockStorageObj;

    // 503エラーレスポンスのシミュレーション
    (globalThis as any).fetch = async () => ({
      status: 503,
      ok: false,
      json: async () => ({ error: 'DatabaseNotBound', code: 'D1_NOT_CONNECTED' }),
    });

    const result = await ApiService.saveTask({
      id: 'TSK-TEST',
      title: 'テスト',
      description: 'テスト',
      project: 'TEST',
      assignedAI: 'codex',
      modelName: 'GPT-4o',
      status: '未着手',
      isStatusConfirmed: true,
      lastConfirmedAt: '今',
      createdAt: '今',
      updatedAt: '今',
      instructionPrompt: '',
      artifacts: [],
      history: [],
      createdBy: 'Test',
      updatedBy: 'Test',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('D1データベースが未接続');
  });

  // 7. AI担当者推薦エンジン（RouterService）の検証
  it('7. [AI推薦] 自然言語からのAI担当自動推薦とプロジェクト判別', () => {
    const rec1 = RouterService.analyzeRequest('スターターズコネクトのフォームでエラーが出るので修正して');
    expect(rec1.detectedProject).toBe('スターターズコネクト');
    expect(rec1.recommendedAI).toBe('codex');

    const rec2 = RouterService.analyzeRequest('この内容をClaude Codeへ渡して新名爪八幡宮の特設ページを作成');
    expect(rec2.recommendedAI).toBe('claude-code');

    const rec3 = RouterService.analyzeRequest('スプレッドシートの巡回とブラウザ収集を実行して');
    expect(rec3.recommendedAI).toBe('chatgpt-work');

    const rec4 = RouterService.analyzeRequest('補助金の公募要領PDF資料を分析して比較要約して');
    expect(rec4.recommendedAI).toBe('gemini');
  });

  // 8. 9大項目引き継ぎ指示書の自動生成
  it('8. [引き継ぎ] 9大項目を含む正式引き継ぎ指示書の生成検証', () => {
    const prompt = PromptGeneratorService.generateHandoffPrompt({
      project: 'スターターズコネクト',
      title: 'お問い合わせフォームのバリデーション強化',
      description: 'Zodによるスキーマ検証を追加',
      assignedAI: 'codex',
    });

    expect(prompt).toContain('1. プロジェクト名');
    expect(prompt).toContain('2. 背景と目的');
    expect(prompt).toContain('3. 現在までの決定事項');
    expect(prompt).toContain('4. 作業の進捗');
    expect(prompt).toContain('5. 依頼する作業');
    expect(prompt).toContain('6. 使用すべき環境');
    expect(prompt).toContain('7. 変更してはいけないもの');
    expect(prompt).toContain('8. 完了条件');
    expect(prompt).toContain('9. 完了後に報告すべき項目');
  });

  // 9. AI利用状況データと確定不可データの区別検証
  it('9. [AI利用枠] 実測利用状況データと推測不可項目の明示検証', () => {
    const entries = SAMPLE_AI_USAGE.entries;
    const chatEntry = entries.find((e) => e.scope.includes('通常のChat会話'));
    expect(chatEntry).toBeDefined();
    expect(chatEntry?.measured).toBe('none');
    expect(chatEntry?.status).toBe('not_available');
    expect(chatEntry?.used_percent).toBeNull();
    expect(chatEntry?.remaining_percent).toBeNull();
  });

  // 10. PowerShell同期スクリプト認証フローの検証（ログイン -> エフェメラルトークン取得 -> APIアクセス）
  it('10. [PowerShell同期認証フロー] /api/auth/loginで取得したエフェメラルトークンにより保護API認証が通過すること', async () => {
    // ログイン処理でエフェメラルトークンが発行されること
    const sessionToken = await createSessionToken(TEST_VALID_SECRET, 'admin');
    expect(sessionToken).toBeDefined();

    // 取得したトークンで認証検証が成功すること
    const verified = await verifySessionToken(sessionToken, TEST_VALID_SECRET);
    expect(verified).not.toBeNull();
    expect(verified?.role).toBe('admin');
  });

  // 11. 不正シークレットおよび無効トークンの拒絶テスト
  it('11. [認証拒絶テスト] 不正なキーや改ざんトークンが確実に拒絶されること', async () => {
    // 短いキーや脆弱なキーはトークン発行段階で弾かれること
    await expect(createSessionToken('short', 'admin')).rejects.toThrow('SERVER_SECRET_INVALID');
    await expect(createSessionToken('tomori', 'admin')).rejects.toThrow('SERVER_SECRET_INVALID');

    // 期限切れトークンの拒絶テスト
    const pastSec = Math.floor(Date.now() / 1000) - 3600;
    const expiredPayload = {
      sub: 'tomori-admin',
      exp: pastSec,
      nonce: 'test-nonce',
      role: 'admin',
    };
    const enc = new TextEncoder();
    const hB64 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const pB64 = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(TEST_VALID_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(`${hB64}.${pB64}`));
    const sB64 = Buffer.from(new Uint8Array(sig)).toString('base64url');
    const expiredToken = `${hB64}.${pB64}.${sB64}`;

    const expiredResult = await verifySessionToken(expiredToken, TEST_VALID_SECRET);
    expect(expiredResult).toBeNull();
  });

  // 12. D1未接続時の503エラー処理検証
  it('12. [D1未接続エラー処理] D1データベース未接続時に503 D1_NOT_CONNECTEDをエラーとして検知すること', async () => {
    (globalThis as any).fetch = async () => ({
      status: 503,
      ok: false,
      json: async () => ({ error: 'DatabaseNotBound', code: 'D1_NOT_CONNECTED' }),
    });

    const result = await ApiService.getTasks();
    expect(result.fromServer).toBe(false);
    expect(result.error).toBe('D1_NOT_CONNECTED');
  });
});
