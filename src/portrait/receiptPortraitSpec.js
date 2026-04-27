/**
 * Receipt portrait — canonical output and crop rules (single source of truth).
 * Vertical 4:5 hero frame (taller than wide); all saved portrait rasters are normalized
 * to these pixel dimensions for the receipt card (see `normalizePortraitRasterToReceiptHero` in `pipeline.js`).
 *
 * Placement / UX live in ReceiptCard + App.css (upper-middle zone, rounded-rect
 * inset panel, spacing above headline). Crop math here targets chest-up framing
 * with eyes near ~38–45% from frame top when the image has vertical slack; wide
 * landscape shots use full-height crop (centered) with less vertical control.
 */

/** Standardized raster output (identity anchor + all styled variants). */
export const PORTRAIT_OUTPUT = Object.freeze({
  width: 400,
  height: 500,
  /** width / height — chest-up hero frame */
  aspect: 4 / 5,
});

/** Rounded corners on encoded portrait (matches ReceiptCard frame ratio). */
export const PORTRAIT_ENCODE_CORNER_RADIUS = 20;

/**
 * Target vertical position of the eye line in the output frame (ratio from top).
 * Spec: eyes ~38–45% from top; slight headroom above hair.
 */
export const EYE_LINE_IN_FRAME_MIN = 0.38;
export const EYE_LINE_IN_FRAME_MAX = 0.45;
export const EYE_LINE_IN_FRAME_TARGET = (EYE_LINE_IN_FRAME_MIN + EYE_LINE_IN_FRAME_MAX) / 2;

/**
 * Heuristic: estimated eye-line Y on the source image (ratio from top).
 * Biased for typical phone selfies / upper-body shots (chest-up intent).
 */
export function estimateEyeAnchorSourceYRatio(imgW, imgH) {
  const r = imgW / imgH;
  if (r < 0.78) return 0.33;
  if (r > 1.15) return 0.37;
  return 0.35;
}

/**
 * Largest 4:5 crop inside the image, horizontally centered, vertically anchored
 * so the estimated eye line lands near EYE_LINE_IN_FRAME_TARGET (when slack allows).
 *
 * @returns {{ sx: number, sy: number, sw: number, sh: number }}
 */
export function computeChestUpCropRect(imgW, imgH) {
  const AR = PORTRAIT_OUTPUT.aspect;
  let cropW;
  let cropH;
  if (imgW / imgH >= AR) {
    cropH = imgH;
    cropW = cropH * AR;
  } else {
    cropW = imgW;
    cropH = cropW / AR;
  }

  const eyeSrcY = imgH * estimateEyeAnchorSourceYRatio(imgW, imgH);
  let sy = eyeSrcY - EYE_LINE_IN_FRAME_TARGET * cropH;
  sy = Math.max(0, Math.min(sy, imgH - cropH));

  let sx = (imgW - cropW) / 2;
  sx = Math.max(0, Math.min(sx, imgW - cropW));

  return { sx, sy, sw: cropW, sh: cropH };
}
