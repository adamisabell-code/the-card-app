/* eslint-disable @typescript-eslint/no-explicit-any */
import { handleGenerateProfilePortraits } from "../server/handlers/generateProfilePortraits";

export default async function handler(req: any, res: any) {
  return handleGenerateProfilePortraits(req, res);
}
