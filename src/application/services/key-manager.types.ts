export interface ApiKeyLease {
  keyId: string;
  tokenDecrypted: string;
  leaseId: string;
  expiresAt: number;
}

export interface CallResult {
  statusCode: number;
  headers?: Record<string, string | number>;
  error?: any;
}
