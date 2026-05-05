import { useState } from "react";
import { uploadAndGenerateProfilePortraits } from "../receipts/services/profilePortraitService.js";
import { generateCalloutReceipt, generateEndRoundReceiptForPlayer } from "../receipts/services/receiptSystemService.js";
import { primePortraitLayers } from "../receipts/services/portraitService.js";

const DEV_STAKES = {
  preset: 5,
  customValue: "",
  loneWolf2x: true,
  blindWolf3x: true,
  hideDollarAmounts: false,
};

const DEV_PLAYERS = [
  { id: "p-0", slotIndex: 0, name: "Dylan H." },
  { id: "p-1", slotIndex: 1, name: "Marcus J." },
  { id: "p-2", slotIndex: 2, name: "Noah K." },
  { id: "p-3", slotIndex: 3, name: "Eli W." },
];

const DEV_HOLE_RECORDS = Array.from({ length: 18 }, (_, idx) => ({
  holeNumber: idx + 1,
  wolfPlayerId: idx % 4 === 0 ? "p-0" : "p-1",
  holeMode: idx % 5 === 0 ? "blind" : idx % 3 === 0 ? "lone" : "normal",
  partnerPlayerId: idx % 5 === 0 || idx % 3 === 0 ? null : "p-2",
  winningSide: idx % 4 === 0 ? "wolf_side" : "opponent_side",
  pointsAwardedByPlayerId: idx % 4 === 0
    ? { "p-0": 3, "p-1": 0, "p-2": 0, "p-3": 0 }
    : { "p-0": 0, "p-1": 1, "p-2": 1, "p-3": 1 },
  winningPlayerIds: idx % 4 === 0 ? ["p-0"] : ["p-1", "p-2", "p-3"],
}));

export function ReceiptPipelineDevTools({ portraitBundle }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const onTestPortraitGeneration = async () => {
    if (!file) {
      setStatus("Choose a profile image first.");
      return;
    }
    setStatus("Generating happy/neutral/sad portraits...");
    try {
      await uploadAndGenerateProfilePortraits({ file, playerId: "p-0", playerName: "Dylan H." });
      setStatus("Portrait variants generated and stored.");
    } catch (error) {
      setStatus(`Portrait generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const onTestCalloutReceipt = async () => {
    const profilePhotoPath =
      portraitBundle?.styledPortraits?.winner ||
      portraitBundle?.styledPortraits?.neutral ||
      portraitBundle?.rawImageUrl ||
      null;
    setStatus("Rendering callout receipt PNG...");
    try {
      const rendered = await generateCalloutReceipt({
        playerName: "Dylan H.",
        profilePhotoPath,
      });
      setImageUrl(rendered.receiptImageUrl);
      setStatus("Callout receipt ready.");
    } catch (error) {
      setStatus(`Callout render failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const onTestEndRoundReceipt = async () => {
    if (!portraitBundle) {
      setStatus("No portrait bundle loaded. Generate portraits first.");
      return;
    }
    setStatus("Rendering end-round MVP receipt PNG...");
    try {
      const rendered = await generateEndRoundReceiptForPlayer({
        gamePlayers: DEV_PLAYERS,
        holeRecords: DEV_HOLE_RECORDS,
        stakesConfig: DEV_STAKES,
        portraitByPlayerId: { "p-0": portraitBundle },
        receiptNumber: "RECEIPT #MVP-0001",
      });
      setImageUrl(rendered.receiptImageUrl);
      setStatus("End-round receipt ready.");
    } catch (error) {
      setStatus(`End-round render failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const onGenerateAllAiMoodLayers = async () => {
    const profilePhotoPath =
      portraitBundle?.rawImageUrl ||
      portraitBundle?.styledPortraits?.neutral ||
      null;
    setStatus("Generating AI portrait layers: winner, neutral, sadMad, callout...");
    try {
      const out = await primePortraitLayers({
        profileId: "p-0",
        profilePhotoPath,
        playerName: "Dylan H.",
      });
      setStatus(`AI layers ready: ${Object.keys(out).join(", ")}`);
    } catch (error) {
      setStatus(`AI layer generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <section className="card settings-screen__section">
      <h2 className="card__title card__title--sm">Receipt Pipeline Dev Tools (temporary)</h2>
      <label className="field field--solo">
        <span className="field__label">Profile photo source</span>
        <input className="field__input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <div className="settings-screen__dev-actions">
        <button type="button" className="btn btn--outline btn--compact" onClick={onTestPortraitGeneration}>Test Portrait Generation</button>
        <button type="button" className="btn btn--outline btn--compact" onClick={onGenerateAllAiMoodLayers}>Generate 4 AI Mood Layers</button>
        <button type="button" className="btn btn--outline btn--compact" onClick={onTestCalloutReceipt}>Test Callout Receipt</button>
        <button type="button" className="btn btn--outline btn--compact" onClick={onTestEndRoundReceipt}>Test End Round Receipt</button>
      </div>
      {status ? <p className="card__lede">{status}</p> : null}
      {imageUrl ? <img className="settings-screen__dev-preview" src={imageUrl} alt="Generated receipt preview" /> : null}
    </section>
  );
}
