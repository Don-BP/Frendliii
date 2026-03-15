// frendli-app/lib/calculateAge.ts
export function calculateAge(dob: string | null | undefined): number | undefined {
  if (!dob) return undefined;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}
