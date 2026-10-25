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

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
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
}

export function verifyCfAccessJwt(
  jwtString: string,
  expectedTeamDomain?: string,
  expectedAud?: string
): { valid: boolean; email?: string; error?: string } {
  try {
    const parts = jwtString.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Malformed JWT structure' };
    }

    const payloadJson = new TextDecoder().decode(base64UrlDecode(parts[1]));
    const payload = JSON.parse(payloadJson) as CfAccessPayload;

    const nowSec = Math.floor(Date.now() / 1000);

    // 1. 有効期限検証
    if (payload.exp <= nowSec) {
      return { valid: false, error: 'Token has expired' };
    }

    // 2. nbf検証
    if (payload.nbf && payload.nbf > nowSec) {
      return { valid: false, error: 'Token not yet valid' };
    }

    // 3. Issuer（発行元）検証
    if (expectedTeamDomain) {
      const expectedIss = `https://${expectedTeamDomain}.cloudflareaccess.com`;
      if (payload.iss !== expectedIss) {
        return { valid: false, error: `Invalid issuer: ${payload.iss} !== ${expectedIss}` };
      }
    }

    // 4. Audience検証
    if (expectedAud) {
      const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
      if (!auds.includes(expectedAud)) {
        return { valid: false, error: 'Audience mismatch' };
      }
    }

    if (!payload.email) {
      return { valid: false, error: 'Missing email claim in token' };
    }

    return { valid: true, email: payload.email };
  } catch (e: any) {
    return { valid: false, error: e.message };
  }
}
