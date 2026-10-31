export const CODEATTACK_URL = "https://codeattack.io";

export function codeAttackLinks(locale: string): { home: string; contact: string } {
  return locale === "de"
    ? { home: `${CODEATTACK_URL}/`, contact: `${CODEATTACK_URL}/contact` }
    : { home: `${CODEATTACK_URL}/en`, contact: `${CODEATTACK_URL}/en/contact` };
}
