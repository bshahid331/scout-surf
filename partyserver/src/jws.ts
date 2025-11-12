import { JWTVerifyResult, jwtVerify, importJWK } from 'jose';

export type CognitoJWKS = {
  keys: Array<{
    alg: string;
    e: string;
    kid: string;
    kty: string;
    n: string;
    use: string;
  }>;
};

// Functions to validate JWT tokens
export async function fetchJWKS(issuer: string): Promise<CognitoJWKS> {
  const jwksUrl = `${issuer}/.well-known/jwks.json`;
  try {
    const response = await fetch(jwksUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch JWKS: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching JWKS:', error);
    throw error;
  }
}

export async function verifyToken(token: string, jwks: CognitoJWKS): Promise<JWTVerifyResult> {
  const { keys } = jwks;
  if (!Array.isArray(keys) || keys.length === 0) {
    throw new Error('No keys found in JWKS');
  }

  // Get the JWT header to extract the key ID (kid)
  const base64Url = token.split('.')[0];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = atob(base64);
  const decodedHeader = JSON.parse(jsonPayload);

  const kid = decodedHeader.kid;

  // Find the key that matches the kid
  const key = keys.find((k) => k.kid === kid);
  if (!key) {
    throw new Error(`No matching key found for kid: ${kid}`);
  }

  try {
    const publicKey = await importJWK(key);
    const result = await jwtVerify(token, publicKey, {
      algorithms: [key.alg],
    });
    return result;
  } catch (error) {
    console.log(`Verification failed with key ${key.kid}:`, error);
    throw new Error('Token contains an invalid signature or is expired');
  }
}
