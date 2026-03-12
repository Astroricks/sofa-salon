import { Resend } from 'resend';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}
const FROM = process.env.EMAIL_FROM ?? 'onboarding@resend.dev';

export async function sendConfirmation(params: {
  to: string;
  screeningTitle: string;
  seatKey: string;
  displayName: string;
  wechatId: string;
  screeningAt: string;
}) {
  const { to, screeningTitle, seatKey, displayName, wechatId, screeningAt } =
    params;
  const resend = getResend();
  if (!resend) return null;
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [to],
    subject: `Seat confirmed — ${screeningTitle}`,
    html: `
      <p>Your seat is confirmed for <strong>${screeningTitle}</strong>.</p>
      <p><strong>Seat:</strong> ${seatKey}</p>
      <p><strong>When:</strong> ${screeningAt}</p>
      <p><strong>Your name:</strong> ${displayName}</p>
      <p><strong>Your WeChat ID (for host):</strong> ${wechatId}</p>
      <p>See you there!</p>
    `,
  });
  if (error) throw error;
  return data;
}

export async function sendReminder(params: {
  to: string;
  screeningTitle: string;
  screeningAt: string;
}) {
  const { to, screeningTitle, screeningAt } = params;
  const resend = getResend();
  if (!resend) return null;
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [to],
    subject: `Reminder — ${screeningTitle} tomorrow`,
    html: `
      <p>Reminder: <strong>${screeningTitle}</strong> is coming up.</p>
      <p><strong>When:</strong> ${screeningAt}</p>
      <p>See you there!</p>
    `,
  });
  if (error) throw error;
  return data;
}

export async function sendWaitlistPromotion(params: {
  to: string;
  screeningTitle: string;
  seatKey: string;
  screeningAt: string;
}) {
  const { to, screeningTitle, seatKey, screeningAt } = params;
  const resend = getResend();
  if (!resend) return null;
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [to],
    subject: `You're in! — ${screeningTitle}`,
    html: `
      <p>A spot opened up. You've been moved off the waitlist.</p>
      <p><strong>${screeningTitle}</strong></p>
      <p><strong>Your seat:</strong> ${seatKey}</p>
      <p><strong>When:</strong> ${screeningAt}</p>
      <p>See you there!</p>
    `,
  });
  if (error) throw error;
  return data;
}
