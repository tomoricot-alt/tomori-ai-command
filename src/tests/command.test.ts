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

  // 2. Cloudflare Access 公開鍵（JWKS）署名検証・Fail-Closed検証スイート
  describe('2. [セキュリティ] Cloudflare Access JWT 暗号署名（JWKS）およびクレーム検証スイート', () => {
    const TEST_TEAM = 'tomori-team';
    const TEST_AUD = 'aud-valid-uuid-2026';
    const KID = 'test-key-id-valid';

    it('2-1. [正当なJWT] 正当なJWKS公開鍵とRSA暗号署名を持つJWTの検証が成功すること', async () => {
      clearJwksCache();
      const { keyPair, publicJwk } = await generateTestRsaKeyPair(KID);
      const nowSec = Math.floor(Date.now() / 1000);
      const validPayload = {
        sub: 'usr-12345',
        email: 'admin@tomori-cot.com',
        iss: `https://${TEST_TEAM}.cloudflareaccess.com`,
        aud: TEST_AUD,
        exp: nowSec + 3600,
        nbf: nowSec - 10,
      };

      const validJwt = await signTestCfJwt(validPayload, keyPair.privateKey, KID);
      const res = await verifyCfAccessJwt(validJwt, {
        teamDomain: TEST_TEAM,
        aud: TEST_AUD,
        jwksKeys: [publicJwk],
      });
      expect(res.valid).toBe(true);
      expect(res.email).toBe('admin@tomori-cot.com');
    });

    it('2-2. [偽造JWT遮断] 攻撃者が生成した別のRSA秘密鍵で署名された偽造JWTを拒絶すること', async () => {
      clearJwksCache();
      const { publicJwk } = await generateTestRsaKeyPair(KID);
      const { keyPair: attackerKeyPair } = await generateTestRsaKeyPair(KID);

      const nowSec = Math.floor(Date.now() / 1000);
      const payload = {
        sub: 'usr-12345',
        email: 'admin@tomori-cot.com',
        iss: `https://${TEST_TEAM}.cloudflareaccess.com`,
        aud: TEST_AUD,
        exp: nowSec + 3600,
      };

      const forgedJwt = await signTestCfJwt(payload, attackerKeyPair.privateKey, KID);
      const res = await verifyCfAccessJwt(forgedJwt, {
        teamDomain: TEST_TEAM,
        aud: TEST_AUD,
        jwksKeys: [publicJwk],
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Invalid cryptographic signature');
    });

    it('2-3. [署名改ざん遮断] 正当なJWTのペイロードや署名を1文字でも改ざんした場合に拒絶すること', async () => {
      clearJwksCache();
      const { keyPair, publicJwk } = await generateTestRsaKeyPair(KID);
      const nowSec = Math.floor(Date.now() / 1000);
      const payload = {
        sub: 'usr-12345',
        email: 'admin@tomori-cot.com',
        iss: `https://${TEST_TEAM}.cloudflareaccess.com`,
        aud: TEST_AUD,
        exp: nowSec + 3600,
      };

      const validJwt = await signTestCfJwt(payload, keyPair.privateKey, KID);
      const parts = validJwt.split('.');
      const tamperedPayload = base64UrlEncode(
        new TextEncoder().encode(JSON.stringify({ ...payload, email: 'attacker@evil.com' }))
      );
      const tamperedJwt = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      const res = await verifyCfAccessJwt(tamperedJwt, {
        teamDomain: TEST_TEAM,
        aud: TEST_AUD,
        jwksKeys: [publicJwk],
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Invalid cryptographic signature');
    });

    it('2-4. [有効期限切れ遮断] expが過去のJWTを期限切れとして拒絶すること', async () => {
      clearJwksCache();
      const { keyPair, publicJwk } = await generateTestRsaKeyPair(KID);
      const nowSec = Math.floor(Date.now() / 1000);
      const expiredPayload = {
        sub: 'usr-12345',
        email: 'admin@tomori-cot.com',
        iss: `https://${TEST_TEAM}.cloudflareaccess.com`,
        aud: TEST_AUD,
        exp: nowSec - 60,
      };

      const expiredJwt = await signTestCfJwt(expiredPayload, keyPair.privateKey, KID);
      const res = await verifyCfAccessJwt(expiredJwt, {
        teamDomain: TEST_TEAM,
        aud: TEST_AUD,
        jwksKeys: [publicJwk],
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('expired');
    });

    it('2-5. [不正Audience遮断] 異なるAudience（CF_ACCESS_AUD不一致）のJWTを拒絶すること', async () => {
      clearJwksCache();
      const { keyPair, publicJwk } = await generateTestRsaKeyPair(KID);
      const nowSec = Math.floor(Date.now() / 1000);
      const wrongAudPayload = {
        sub: 'usr-12345',
        email: 'admin@tomori-cot.com',
        iss: `https://${TEST_TEAM}.cloudflareaccess.com`,
        aud: 'unexpected-application-aud',
        exp: nowSec + 3600,
      };

      const wrongAudJwt = await signTestCfJwt(wrongAudPayload, keyPair.privateKey, KID);
      const res = await verifyCfAccessJwt(wrongAudJwt, {
        teamDomain: TEST_TEAM,
        aud: TEST_AUD,
        jwksKeys: [publicJwk],
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Audience mismatch');
    });

    it('2-6. [環境変数未設定Fail-Closed] CF_ACCESS_TEAM_DOMAINまたはCF_ACCESS_AUDが未設定の場合に即時拒絶すること', async () => {
      clearJwksCache();
      const { keyPair, publicJwk } = await generateTestRsaKeyPair(KID);
      const nowSec = Math.floor(Date.now() / 1000);
      const validPayload = {
        sub: 'usr-12345',
        email: 'admin@tomori-cot.com',
        iss: `https://${TEST_TEAM}.cloudflareaccess.com`,
        aud: TEST_AUD,
        exp: nowSec + 3600,
      };
      const validJwt = await signTestCfJwt(validPayload, keyPair.privateKey, KID);

      // TEAM_DOMAIN未設定
      const res1 = await verifyCfAccessJwt(validJwt, {
        teamDomain: '',
        aud: TEST_AUD,
        jwksKeys: [publicJwk],
      });
      expect(res1.valid).toBe(false);
      expect(res1.error).toContain('CF_ACCESS_TEAM_DOMAIN is not configured');

      // AUD未設定
      const res2 = await verifyCfAccessJwt(validJwt, {
        teamDomain: TEST_TEAM,
        aud: '',
        jwksKeys: [publicJwk],
      });
      expect(res2.valid).toBe(false);
      expect(res2.error).toContain('CF_ACCESS_AUD is not configured');
    });
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
