import {
  hostContactSendErrorCode,
  MESSAGE_MAX,
  MESSAGE_MIN,
  parseHostContactBody,
  SUBJECT_MAX,
} from '../host-contact';

describe('parseHostContactBody', () => {
  const valid = {
    subject: 'Hello',
    message: 'a'.repeat(MESSAGE_MIN),
    replyEmail: 'guest@example.com',
  };

  it('accepts valid payload', () => {
    const r = parseHostContactBody(valid);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.subject).toBe('Hello');
      expect(r.data.replyEmail).toBe('guest@example.com');
    }
  });

  it('trims fields', () => {
    const r = parseHostContactBody({
      subject: '  Hi  ',
      message: `  ${'x'.repeat(MESSAGE_MIN)}  `,
      replyEmail: '  a@b.co  ',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.subject).toBe('Hi');
      expect(r.data.message).toHaveLength(MESSAGE_MIN);
      expect(r.data.replyEmail).toBe('a@b.co');
    }
  });

  it('rejects empty subject', () => {
    expect(parseHostContactBody({ ...valid, subject: '' }).ok).toBe(false);
    expect(parseHostContactBody({ ...valid, subject: 'x'.repeat(SUBJECT_MAX + 1) }).ok).toBe(
      false
    );
  });

  it('rejects short or long message', () => {
    expect(parseHostContactBody({ ...valid, message: 'short' }).ok).toBe(false);
    expect(
      parseHostContactBody({ ...valid, message: 'x'.repeat(MESSAGE_MAX + 1) }).ok
    ).toBe(false);
  });

  it('rejects invalid reply email', () => {
    expect(parseHostContactBody({ ...valid, replyEmail: 'not-an-email' }).ok).toBe(false);
  });
});

describe('hostContactSendErrorCode', () => {
  it('maps Resend sandbox recipient error', () => {
    expect(
      hostContactSendErrorCode({
        message:
          'You can only send testing emails to your own email address (a@b.com). To send emails to other recipients, please verify a domain',
      })
    ).toBe('resend_testing_recipient_only');
  });

  it('defaults to send_failed', () => {
    expect(hostContactSendErrorCode(new Error('network'))).toBe('send_failed');
  });
});
