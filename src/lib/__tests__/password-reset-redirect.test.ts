import { buildPasswordResetCallbackUrl } from '../password-reset-redirect';

describe('buildPasswordResetCallbackUrl', () => {
  it('embeds update-password path in callback next param', () => {
    const url = buildPasswordResetCallbackUrl('https://example.com', '/profile');
    expect(url).toBe(
      'https://example.com/auth/callback?next=%2Fauth%2Fupdate-password%3Fredirect%3D%252Fprofile'
    );
  });

  it('omits redirect query when post-update path is default home', () => {
    const url = buildPasswordResetCallbackUrl('https://example.com', '/');
    expect(url).toBe('https://example.com/auth/callback?next=%2Fauth%2Fupdate-password');
  });

  it('strips trailing slash on origin', () => {
    const url = buildPasswordResetCallbackUrl('https://example.com/', '/');
    expect(url.startsWith('https://example.com/auth/callback')).toBe(true);
  });
});
