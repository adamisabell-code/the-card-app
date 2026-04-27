import { PORTRAIT_OUTPUT } from "../receiptPortraitSpec.js";

/**
 * Generic multipart image-to-image endpoint (worker, Replicate proxy, etc.).
 * Contract: POST multipart/form-data with `image` (file/blob), `prompt`, `tone`, optional `playerName`;
 * optional `outputWidth`, `outputHeight`, `outputAspect` for 4:5 receipt hero parity;
 * response body is raw image bytes (`image/*`). Client still normalizes to `PORTRAIT_OUTPUT` pixels.
 *
 * @param {{ endpointUrl: string }} config
 */
export function createHttpImageToImagePortraitProvider({ endpointUrl }) {
  const url = String(endpointUrl).trim();
  return {
    id: "http-image-to-image",
    kind: "http",
    async generatePortrait(req) {
      const baseBlob = await fetch(req.basePortraitObjectUrl).then((r) => r.blob());
      const fd = new FormData();
      fd.append("image", baseBlob, "portrait-base.webp");
      fd.append("prompt", req.fullPrompt);
      fd.append("tone", req.toneMode);
      if (req.playerName?.trim()) {
        fd.append("playerName", req.playerName.trim());
      }
      fd.append("outputWidth", String(PORTRAIT_OUTPUT.width));
      fd.append("outputHeight", String(PORTRAIT_OUTPUT.height));
      fd.append("outputAspect", "4:5");
      const res = await fetch(url, {
        method: "POST",
        body: fd,
        headers: { Accept: "image/*" },
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        throw new Error(errText || `Portrait API ${res.status}`);
      }
      const outBlob = await res.blob();
      if (!outBlob || outBlob.size < 8) {
        throw new Error("Empty response from portrait API.");
      }
      const portraitObjectUrl = URL.createObjectURL(outBlob);
      return { portraitObjectUrl, providerId: "http-image-to-image" };
    },
  };
}
