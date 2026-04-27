import fs from "node:fs/promises";
import path from "node:path";
import type { StorageAdapter } from "../storage/storageAdapter.js";

/**
 * Dev-friendly disk storage. Replace with S3/R2 in production — implement `StorageAdapter`
 * and inject into `generatePlayerAvatars`.
 */
export function createLocalDiskStorage(rootDir: string): StorageAdapter {
  return {
    async putObject(key, body, _contentType) {
      const abs = path.join(rootDir, key);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, body);
      return { publicUrl: `/avatars-static/${key.replace(/\\/g, "/")}` };
    },
  };
}
