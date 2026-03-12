// ALL app-name references must import from here. Never write the app name as a literal.

export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME ?? 'Sofa Salon';
export const APP_TAGLINE =
  process.env.NEXT_PUBLIC_APP_TAGLINE ?? "Your host's living room";

export const APP_NAME_PARTS = APP_NAME.split(' ');
