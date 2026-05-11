import { isSignupEmailTakenError } from '../auth-errors';

describe('isSignupEmailTakenError', () => {
  it('detects lowercase code already_registered substring', () => {
    expect(isSignupEmailTakenError({ message: 'x', code: 'already_registered_xyz' })).toBe(true);
  });

  it('detects user_already_registered-style code', () => {
    expect(isSignupEmailTakenError({ message: 'x', code: 'USER_ALREADY_REGISTERED' })).toBe(true);
  });

  it('detects message "User already registered"', () => {
    expect(isSignupEmailTakenError({ message: 'User already registered', code: '' })).toBe(true);
  });

  it('detects lowercase message variants', () => {
    expect(isSignupEmailTakenError({ message: 'Something already registered here', code: '' })).toBe(
      true
    );
    expect(isSignupEmailTakenError({ message: 'Email already exists', code: '' })).toBe(true);
  });

  it('returns false for unrelated auth failures', () => {
    expect(isSignupEmailTakenError({ message: 'Invalid login credentials', code: '' })).toBe(
      false
    );
    expect(isSignupEmailTakenError({ message: 'Password too weak', code: '' })).toBe(false);
  });
});
