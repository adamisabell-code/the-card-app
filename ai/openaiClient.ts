import OpenAI from "openai";

/**
 * Server-only OpenAI client. Never instantiate this in browser code.
 * Reads `OPENAI_API_KEY` from the environment.
 */
export function createOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set (server environment).");
  }
  return new OpenAI({ apiKey });
}
