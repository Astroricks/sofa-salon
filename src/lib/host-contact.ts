const SUBJECT_MIN = 1;
export const SUBJECT_MAX = 200;
export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 5000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type HostContactPayload = {
  subject: string;
  message: string;
  replyEmail: string;
};

export type HostContactParseError =
  | 'invalid_subject'
  | 'invalid_message'
  | 'invalid_reply_email';

/** Parse and validate POST body for host contact. */
export function parseHostContactBody(
  body: unknown
): { ok: true; data: HostContactPayload } | { ok: false; code: HostContactParseError } {
  if (!body || typeof body !== 'object') {
    return { ok: false, code: 'invalid_subject' };
  }
  const o = body as Record<string, unknown>;
  const subject = typeof o.subject === 'string' ? o.subject.trim() : '';
  const message = typeof o.message === 'string' ? o.message.trim() : '';
  const replyEmail = typeof o.replyEmail === 'string' ? o.replyEmail.trim() : '';

  if (subject.length < SUBJECT_MIN || subject.length > SUBJECT_MAX) {
    return { ok: false, code: 'invalid_subject' };
  }
  if (message.length < MESSAGE_MIN || message.length > MESSAGE_MAX) {
    return { ok: false, code: 'invalid_message' };
  }
  if (!EMAIL_RE.test(replyEmail) || replyEmail.length > 254) {
    return { ok: false, code: 'invalid_reply_email' };
  }

  return { ok: true, data: { subject, message, replyEmail } };
}

export type HostContactSendError = 'resend_testing_recipient_only' | 'send_failed';

/** Map Resend throw payload to a user-facing error code. */
export function hostContactSendErrorCode(e: unknown): HostContactSendError {
  const msg =
    typeof e === 'object' && e !== null && 'message' in e
      ? String((e as { message: unknown }).message)
      : e instanceof Error
        ? e.message
        : '';
  if (msg.includes('only send testing emails')) {
    return 'resend_testing_recipient_only';
  }
  return 'send_failed';
}
