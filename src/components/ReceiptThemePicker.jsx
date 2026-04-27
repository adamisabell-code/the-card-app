import { RECEIPT_THEMES } from "../receiptThemes.js";

/**
 * @param {{
 *   value: string
 *   onChange: (themeId: string) => void
 *   className?: string
 * }} props
 */
export function ReceiptThemePicker({ value, onChange, className = "" }) {
  const rootClass = `receipt-theme-picker ${className}`.trim();
  return (
    <div className={rootClass}>
      <span className="receipt-theme-picker__label">Theme</span>
      <div className="receipt-theme-picker__group" role="radiogroup" aria-label="Receipt theme">
        {RECEIPT_THEMES.map((theme) => {
          const active = value === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              role="radio"
              aria-checked={active}
              className={`receipt-theme-picker__btn${active ? " receipt-theme-picker__btn--active" : ""}`}
              onClick={() => onChange(theme.id)}
            >
              {theme.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
