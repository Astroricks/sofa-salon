/**
 * App display name and tagline. All app-name references must import from here; never hardcode elsewhere.
 */
// ALL app-name references must import from here. Never write the app name as a literal.

/** Display name (e.g. "Sofa Salon" or "ZiggyGraph"). From env or default. */
export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME ?? 'Sofa Salon';

/** Short tagline shown in UI (e.g. "Your host's living room"). */
export const APP_TAGLINE =
  process.env.NEXT_PUBLIC_APP_TAGLINE ?? "Your host's living room";

/** APP_NAME split by space; used for styling or header (e.g. first word in one colour). */
export const APP_NAME_PARTS = APP_NAME.split(' ');
