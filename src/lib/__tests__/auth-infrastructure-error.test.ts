import {
  isAuthInfrastructureError,
  isSupabaseInfrastructureError,
} from '../supabase-infrastructure-error';

describe('isAuthInfrastructureError', () => {
  it('detects AuthRetryableFetchError with 504', () => {
    expect(
      isAuthInfrastructureError({ name: 'AuthRetryableFetchError', status: 504, message: '{}' })
    ).toBe(true);
  });

  it('detects generic 5xx', () => {
    expect(isAuthInfrastructureError({ status: 503, message: 'Service Unavailable' })).toBe(true);
  });

  it('ignores missing session', () => {
    expect(isAuthInfrastructureError({ status: 400, message: 'Auth session missing!' })).toBe(
      false
    );
  });
});

describe('isSupabaseInfrastructureError', () => {
  it('detects REST timeouts', () => {
    expect(isSupabaseInfrastructureError({ message: 'Gateway Timeout' })).toBe(true);
  });
});
