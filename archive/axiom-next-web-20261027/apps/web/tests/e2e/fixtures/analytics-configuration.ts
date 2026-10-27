/** Only local HTML/RSC response props are changed; production stays disabled. */
export const MOCK_GA_MEASUREMENT_ID = "G-PRIVACYTEST01";

export function withMockAnalyticsConfiguration(body: string) {
  return body
    .replace(/"analytics_mode":"(?:disabled|ga4_only|axiom_only|axiom_and_ga4)"/gu, '"analytics_mode":"ga4_only"')
    .replace(/\\"analytics_mode\\":\\"(?:disabled|ga4_only|axiom_only|axiom_and_ga4)\\"/gu, String.raw`\"analytics_mode\":\"ga4_only\"`)
    .replace(/"ga4_measurement_id":(?:null|"G-[A-Z0-9]+")/gu, `"ga4_measurement_id":"${MOCK_GA_MEASUREMENT_ID}"`)
    .replace(/\\"ga4_measurement_id\\":(?:null|\\"G-[A-Z0-9]+\\")/gu, String.raw`\"ga4_measurement_id\":\"${MOCK_GA_MEASUREMENT_ID}\"`);
}
