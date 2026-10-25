// Cloudflare Pages Functions用 認証・JWT検証・セッショントークンユーティリティ

export interface TokenPayload {
  sub: string;
  exp: number; // UNIX timestamp in seconds
  nonce: string;
  role: 'admin' | 'user';
}

const FORBIDDEN_SECRETS = new Set([
  'tomori-cmd-secure-dev-key-2026',
  '2026',
  'tomori',
  'admin',
  'password',
  'secret',
]);

/**
 * シークレットが安全かつ有効か検証（漏洩済み固定キーの再利用を拒否）
 */
export function isSecretKeyValid(secret: string | undefined): boolean {
  if (!secret || secret.trim().length < 16) {
    return false;
  }
  if (FORBIDDEN_SECRETS.has(secret.trim().toLowerCase())) {
    return false;
  }
  return true;
}

/**
 * Web Crypto APIを用いたHMAC-SHA256鍵の生成
 */
async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * 安全な短時間セッショントークン（HMAC署名付き）を発行
 * 有効期限: 2時間
 */
export async function createSessionToken(secret: string, role: 'admin' | 'user' = 'admin'): Promise<string> {
  if (!isSecretKeyValid(secret)) {
    throw new Error('SERVER_SECRET_INVALID');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    sub: 'tomori-admin',
    exp: nowSec + 2 * 60 * 60, // 2時間有効
    nonce: crypto.randomUUID(),
    role,
  };

  const enc = new TextEncoder();
  const headerJson = JSON.stringify({ alg: 'HS256', typ: 'JWT' });
  const payloadJson = JSON.stringify(payload);

  const headerB64 = base64UrlEncode(enc.encode(headerJson));
  const payloadB64 = base64UrlEncode(enc.encode(payloadJson));
  const dataToSign = `${headerB64}.${payloadB64}`;

  const cryptoKey = await getCryptoKey(secret);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(dataToSign));
  const signatureB64 = base64UrlEncode(new Uint8Array(signature));

  return `${dataToSign}.${signatureB64}`;
}

/**
 * セッショントークンの署名・有効期限検証
 */
export async function verifySessionToken(token: string, secret: string): Promise<TokenPayload | null> {
  if (!isSecretKeyValid(secret)) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const dataToVerify = `${headerB64}.${payloadB64}`;

  try {
    const enc = new TextEncoder();
    const cryptoKey = await getCryptoKey(secret);
    const signatureBytes = base64UrlDecode(signatureB64);

    const isValid = await crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      signatureBytes as unknown as BufferSource,
      enc.encode(dataToVerify)
    );

    if (!isValid) {
      return null;
    }

    const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
    const payload = JSON.parse(payloadJson) as TokenPayload;

    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp < nowSec) {
      return null; // 有効期限切れ
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Cloudflare Access JWT の暗号・有効期限・Audience・Issuer検証
 */
export interface CfAccessPayload {
  aud: string[] | string;
  email: string;
  exp: number;
  iss: string;
  nbf?: number;
  sub: string;
  [key: string]: any;
}

export interface CloudflareJwk extends JsonWebKey {
  kid?: string;
  use?: string;
}

export interface VerifyCfAccessOptions {
  teamDomain?: string;
  aud?: string;
  jwksKeys?: CloudflareJwk[];
  fetchFn?: typeof fetch;
}

interface JwksCacheEntry {
  keys: CloudflareJwk[];
  fetchedAt: number;
}

const jwksCache = new Map<string, JwksCacheEntry>();
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000; // 1時間キャッシュ

export function clearJwksCache(): void {
  jwksCache.clear();
}

/**
 * Cloudflare Access の公開鍵（JWKS）を取得（キャッシュ付き）
 */
async function getJwksKeys(
  teamDomain: string,
  fetchFn: typeof fetch = fetch,
  forceRefresh = false
): Promise<CloudflareJwk[]> {
  const now = Date.now();
  const cached = jwksCache.get(teamDomain);
  if (!forceRefresh && cached && (now - cached.fetchedAt < JWKS_CACHE_TTL_MS)) {
    return cached.keys;
  }

  const certsUrl = `https://${teamDomain}.cloudflareaccess.com/cdn-cgi/access/certs`;
  const res = await fetchFn(certsUrl);
  if (!res.ok) {
    throw new Error(`JWKS取得に失敗しました (HTTP ${res.status}): ${certsUrl}`);
  }

  const data = (await res.json()) as { keys?: CloudflareJwk[] };
  if (!data || !Array.isArray(data.keys)) {
    throw new Error('JWKSレスポンスの形式が不正です');
  }

  jwksCache.set(teamDomain, { keys: data.keys, fetchedAt: now });
  return data.keys;
}

/**
 * Cloudflare Access JWT の公開鍵署名（RS256）・有効期限・Audience・Issuer・Email検証
 * （Web Crypto API利用・Fail-Closed設計）
 */
export async function verifyCfAccessJwt(
  jwtString: string,
  teamDomainOrOptions?: string | VerifyCfAccessOptions,
  expectedAud?: string,
  extraOptions?: Partial<VerifyCfAccessOptions>
): Promise<{ valid: boolean; email?: string; error?: string }> {
  try {
    if (!jwtString || typeof jwtString !== 'string') {
      return { valid: false, error: 'Invalid JWT string' };
    }

    let teamDomain: string | undefined;
    let aud: string | undefined;
    let jwksKeys: CloudflareJwk[] | undefined;
    let fetchFn: typeof fetch = fetch;

    if (typeof teamDomainOrOptions === 'object' && teamDomainOrOptions !== null) {
      teamDomain = teamDomainOrOptions.teamDomain;
      aud = teamDomainOrOptions.aud;
      jwksKeys = teamDomainOrOptions.jwksKeys;
      if (teamDomainOrOptions.fetchFn) fetchFn = teamDomainOrOptions.fetchFn;
    } else {
      teamDomain = teamDomainOrOptions;
      aud = expectedAud;
      if (extraOptions?.jwksKeys) jwksKeys = extraOptions.jwksKeys;
      if (extraOptions?.fetchFn) fetchFn = extraOptions.fetchFn;
    }

    // 1. 環境変数が未設定の場合は認証を拒否（Fail-Closed）
    if (!teamDomain || !teamDomain.trim()) {
      return { valid: false, error: 'CF_ACCESS_TEAM_DOMAIN is not configured' };
    }
    if (!aud || !aud.trim()) {
      return { valid: false, error: 'CF_ACCESS_AUD is not configured' };
    }

    // 2. JWT構造チェック
    const parts = jwtString.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Malformed JWT structure' };
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // 3. ヘッダー検証 (alg: RS256, kid必須)
    const headerJson = new TextDecoder().decode(base64UrlDecode(headerB64));
    const header = JSON.parse(headerJson) as { alg?: string; kid?: string; typ?: string };

    if (header.alg !== 'RS256') {
      return { valid: false, error: `Unsupported algorithm: ${header.alg} (only RS256 allowed)` };
    }
    if (!header.kid) {
      return { valid: false, error: 'Missing kid in JWT header' };
    }

    // 4. JWKS鍵の取得と該当Key IDの特定
    let keys = jwksKeys;
    if (!keys) {
      keys = await getJwksKeys(teamDomain, fetchFn, false);
      // キャッシュに該当kidが存在しない場合はローテーションを考慮して1度強制リフレッシュ
      if (!keys.some((k) => k.kid === header.kid)) {
        keys = await getJwksKeys(teamDomain, fetchFn, true);
      }
    }

    const matchingJwk = keys.find((k) => k.kid === header.kid);
    if (!matchingJwk) {
      return { valid: false, error: `Matching key ID not found in JWKS: ${header.kid}` };
    }

    // 5. Web Crypto API による公開鍵インポートとRS256署名検証
    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      matchingJwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signatureBytes = base64UrlDecode(signatureB64);

    const isSignatureValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      signatureBytes as unknown as BufferSource,
      signingInput
    );

    if (!isSignatureValid) {
      return { valid: false, error: 'Invalid cryptographic signature' };
    }

    // 6. ペイロードクレームの検証 (exp, nbf, iss, aud, email)
    const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
    const payload = JSON.parse(payloadJson) as CfAccessPayload;

    const nowSec = Math.floor(Date.now() / 1000);

    // 有効期限検証 (exp)
    if (typeof payload.exp !== 'number' || payload.exp <= nowSec) {
      return { valid: false, error: 'Token has expired' };
    }

    // 有効開始前検証 (nbf)
    if (typeof payload.nbf === 'number' && payload.nbf > nowSec) {
      return { valid: false, error: 'Token not yet valid' };
    }

    // 発行元検証 (iss)
    const expectedIss = `https://${teamDomain}.cloudflareaccess.com`;
    if (payload.iss !== expectedIss) {
      return { valid: false, error: `Invalid issuer: ${payload.iss} !== ${expectedIss}` };
    }

    // Audience検証 (aud)
    const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!auds.includes(aud)) {
      return { valid: false, error: 'Audience mismatch' };
    }

    // メールアドレス検証 (email)
    if (!payload.email || typeof payload.email !== 'string' || !payload.email.trim()) {
      return { valid: false, error: 'Missing or empty email claim in token' };
    }

    return { valid: true, email: payload.email };
  } catch (e: any) {
    return { valid: false, error: e.message || 'JWT verification error' };
  }
}
