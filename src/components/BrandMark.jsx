/**
 * Premium league marks — receipt universe (no cartoon wolf).
 * TPG = master / utility mark · The Card = product wordmark.
 */

/** @param {{ className?: string }} props */
export function TpgMonogram({ className = "" }) {
  return (
    <span className={`brand-tpg ${className}`.trim()} aria-hidden="true">
      <span className="brand-tpg__frame" />
      <span className="brand-tpg__text">TPG</span>
    </span>
  );
}

/** Large splash / seal moment */
export function TpgMonogramSplash({ className = "" }) {
  return <TpgMonogram className={`brand-tpg--splash ${className}`.trim()} />;
}

/** Header: monogram + “The Card” title stack */
export function AppHeaderBrand({ title = "The Card" }) {
  return (
    <div className="app-header__brand-lockup app-header__brand-lockup--premium">
      <TpgMonogram className="brand-tpg--header" />
      <h1 className="app-header__name app-header__name--home app-header__name--premium">{title}</h1>
    </div>
  );
}
