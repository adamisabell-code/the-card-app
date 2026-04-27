/**
 * Storage abstraction for generated avatar bytes.
 *
 * Production: implement with S3 / GCS / R2 / Supabase Storage — upload Buffer, return HTTPS URL.
 *
 * Reference implementation: `server/storageLocal.ts` (`createLocalDiskStorage`) writes under
 * `server/public/` and pairs with the static route in `server/index.ts`.
 */

export type PutObjectResult = {
  /** Publicly fetchable URL for the saved object */
  publicUrl: string;
};

export interface StorageAdapter {
  /**
   * @param key stable path-like key, e.g. `avatars/p-0/happy.webp`
   * @param body raw image bytes
   * @param contentType e.g. `image/webp`, `image/png`
   */
  putObject(key: string, body: Buffer, contentType: string): Promise<PutObjectResult>;
}
