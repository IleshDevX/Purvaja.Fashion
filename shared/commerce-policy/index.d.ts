export const commercePolicy: Readonly<{
  country: 'IN'; returnWindowDays: number; standardShippingPaise: number;
  expressShippingPaise: number; freeShippingThresholdPaise: number;
  doorstepExchangeAvailable: boolean; guaranteedDeliveryDays: number | null;
}>;
export function isWithinReturnWindow(deliveredAt: Date | string | null | undefined, now?: number): boolean;
