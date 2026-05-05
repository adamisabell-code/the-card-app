export function receiptLog(event, payload = null) {
  const line = payload ? { event, ...payload } : { event };
  console.log(`[receipt-pipeline] ${event}`, line);
}
