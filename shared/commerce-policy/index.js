// Release-controlled operational policy shared by checkout enforcement and copy.
// Unsupported operational promises remain explicitly unavailable.
export const commercePolicy = Object.freeze({
  country: 'IN',
  returnWindowDays: 7,
  standardShippingPaise: 19900,
  expressShippingPaise: 29900,
  freeShippingThresholdPaise: 250000,
  doorstepExchangeAvailable: false,
  guaranteedDeliveryDays: null,
});
for (const key of ['returnWindowDays', 'standardShippingPaise', 'expressShippingPaise', 'freeShippingThresholdPaise']) {
  if (!Number.isSafeInteger(commercePolicy[key]) || commercePolicy[key] <= 0) {
    throw new Error(`Invalid commerce policy: ${key}`);
  }
}
export function isWithinReturnWindow(deliveredAt, now = Date.now()) {
  if (!deliveredAt) return false;
  const elapsed = now - new Date(deliveredAt).getTime();
  return elapsed >= 0 && elapsed <= commercePolicy.returnWindowDays * 86400000;
}
