/** Confirmed sales are internal records, not public listings.
 * Use the existing CommercialClosing relation: no schema migration or duplicate status field.
 */
export const CONFIRMED_SALE={kind:"venta",status:"confirmado"} as const;
export const AVAILABLE_PROPERTY={published:true,closings:{none:CONFIRMED_SALE}} as const;
export const SOLD_PROPERTY={closings:{some:CONFIRMED_SALE}} as const;
