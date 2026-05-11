import { Resend } from 'resend';
import { seatKeyToDisplayLabel } from '@/lib/furniture';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}
/** Production: set `EMAIL_FROM` to an address on your Resend-verified sending domain. */
const FROM = process.env.EMAIL_FROM ?? 'onboarding@resend.dev';

/** Venue name for all emails (e.g. "Ziggy Graph"). From env so users know who the email is from. */
function getVenueName(): string {
  return process.env.NEXT_PUBLIC_APP_NAME || 'Sofa Salon';
}

/**
 * User-facing seat label for emails: "sofa" or "seat" only. No internal IDs or "squeeze".
 */
function seatLabelForEmail(seatKey: string): string {
  const raw = seatKeyToDisplayLabel(seatKey);
  if (raw === 'sofa' || raw === 'sofa-l') return 'sofa';
  return 'seat';
}

/** Sends seat confirmation email after reservation (Resend). No-op if RESEND_API_KEY is unset. */
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
  const venue = getVenueName();
  const seatLabel = seatLabelForEmail(seatKey);
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [to],
    subject: `Seat confirmed — ${screeningTitle}`,
    html: `
      <p>Your seat is confirmed for <strong>${screeningTitle}</strong> at <strong>${venue}</strong>.</p>
      <p><strong>Seat:</strong> ${seatLabel}</p>
      <p><strong>When:</strong> ${screeningAt}</p>
      <p><strong>Your name:</strong> ${displayName}</p>
      <p><strong>Your WeChat ID (for host):</strong> ${wechatId}</p>
      <p>See you there!</p>
      <p style="color:#888;font-size:12px;">— from ${venue}</p>
    `,
  });
  if (error) throw error;
  return data;
}

/** Cancel confirmation: tell user their reservation was cancelled. */
export async function sendCancelConfirmation(params: {
  to: string;
  screeningTitle: string;
  seatKey: string;
  screeningAt: string;
}) {
  const { to, screeningTitle, seatKey, screeningAt } = params;
  const resend = getResend();
  if (!resend) return null;
  const venue = getVenueName();
  const seatLabel = seatLabelForEmail(seatKey);
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [to],
    subject: `Cancelled — ${screeningTitle}`,
    html: `
      <p>Your reservation at <strong>${venue}</strong> has been cancelled.</p>
      <p><strong>${screeningTitle}</strong></p>
      <p><strong>Seat:</strong> ${seatLabel}</p>
      <p><strong>Was scheduled:</strong> ${screeningAt}</p>
      <p>You can book again anytime.</p>
      <p style="color:#888;font-size:12px;">— from ${venue}</p>
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
  const venue = getVenueName();
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [to],
    subject: `Reminder — ${screeningTitle} tomorrow`,
    html: `
      <p>Reminder: <strong>${screeningTitle}</strong> at <strong>${venue}</strong> is coming up.</p>
      <p><strong>When:</strong> ${screeningAt}</p>
      <p>See you there!</p>
      <p style="color:#888;font-size:12px;">— from ${venue}</p>
    `,
  });
  if (error) throw error;
  return data;
}

/** Notifies user they were promoted from waitlist to a seat. No-op if Resend not configured. */
export async function sendWaitlistPromotion(params: {
  to: string;
  screeningTitle: string;
  seatKey: string;
  screeningAt: string;
}) {
  const { to, screeningTitle, seatKey, screeningAt } = params;
  const resend = getResend();
  if (!resend) return null;
  const venue = getVenueName();
  const seatLabel = seatLabelForEmail(seatKey);
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [to],
    subject: `You're in! — ${screeningTitle}`,
    html: `
      <p>A spot opened up at <strong>${venue}</strong>. You've been moved off the waitlist.</p>
      <p><strong>${screeningTitle}</strong></p>
      <p><strong>Your seat:</strong> ${seatLabel}</p>
      <p><strong>When:</strong> ${screeningAt}</p>
      <p>See you there!</p>
      <p style="color:#888;font-size:12px;">— from ${venue}</p>
    `,
  });
  if (error) throw error;
  return data;
}

/** After signup: thank user, remind to check inbox (including spam) for verification, link to profile for email preferences. */
export async function sendWelcomeEmail(params: {
  to: string;
  profileUrl: string;
  locale: 'en' | 'zh';
}) {
  const { to, profileUrl, locale } = params;
  const resend = getResend();
  if (!resend) return null;
  const venue = getVenueName();
  const isZh = locale === 'zh';
  const subject = isZh ? '感谢注册 — 请查收验证邮件' : 'Thanks for signing up — check your inbox';
  const html = isZh
    ? `
      <p>欢迎加入 <strong>${venue}</strong>！</p>
      <p><strong>请尽量使用真实邮箱地址。</strong></p>
      <p>我们已向您的邮箱发送了一封验证邮件，请查收（包括<strong>垃圾邮件 / Spam</strong>）。</p>
      <p>若未收到验证邮件，请稍后重试或重新注册。</p>
      <p>之后有放映活动时我们会通过邮件通知您（预订成功、取消确认、活动提醒、活动结束后打分提醒等）。</p>
      <p><a href="${profileUrl}" style="color:#e8c84a;">前往个人页 →</a></p>
      <p style="color:#888;font-size:12px;">— 来自 ${venue}</p>
    `
    : `
      <p>Welcome to <strong>${venue}</strong>!</p>
      <p><strong>Please use a real email address.</strong></p>
      <p>We've sent a verification email to your inbox—please check it (including your <strong>Spam / Junk</strong> folder).</p>
      <p>If you don't see it, try again later or sign up again.</p>
      <p>We'll email you about bookings, cancellations, event reminders, and post-event rating.</p>
      <p><a href="${profileUrl}" style="color:#e8c84a;">Go to profile →</a></p>
      <p style="color:#888;font-size:12px;">— from ${venue}</p>
    `;
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [to],
    subject,
    html,
  });
  if (error) throw error;
  return data;
}

/** After screening ends: remind user they can rate the film (e.g. on profile page). */
export async function sendPostEventRatingReminder(params: {
  to: string;
  screeningTitle: string;
  profileUrl: string;
}) {
  const { to, screeningTitle, profileUrl } = params;
  const resend = getResend();
  if (!resend) return null;
  const venue = getVenueName();
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [to],
    subject: `Rate your experience — ${screeningTitle}`,
    html: `
      <p><strong>${screeningTitle}</strong> at <strong>${venue}</strong> has ended. Thanks for coming!</p>
      <p>You can rate the film and see your watch history on your profile.</p>
      <p><a href="${profileUrl}" style="color:#e8c84a;">Go to profile →</a></p>
      <p style="color:#888;font-size:12px;">— from ${venue}</p>
    `,
  });
  if (error) throw error;
  return data;
}

/** Event cancelled by admin: notify a registered user. */
export async function sendEventCancelled(params: {
  to: string;
  screeningTitle: string;
}) {
  const { to, screeningTitle } = params;
  const resend = getResend();
  if (!resend) return null;
  const venue = getVenueName();
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [to],
    subject: `Event cancelled — ${screeningTitle}`,
    html: `
      <p>The event <strong>${screeningTitle}</strong> at <strong>${venue}</strong> has been cancelled.</p>
      <p>Your reservation is no longer valid. You can book other upcoming events.</p>
      <p style="color:#888;font-size:12px;">— from ${venue}</p>
    `,
  });
  if (error) throw error;
  return data;
}

/** Event rescheduled (time/date changed): notify a registered user. */
export async function sendEventRescheduled(params: {
  to: string;
  screeningTitle: string;
  screeningAt: string;
}) {
  const { to, screeningTitle, screeningAt } = params;
  const resend = getResend();
  if (!resend) return null;
  const venue = getVenueName();
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [to],
    subject: `Event rescheduled — ${screeningTitle}`,
    html: `
      <p>The event <strong>${screeningTitle}</strong> at <strong>${venue}</strong> has been rescheduled.</p>
      <p><strong>New time:</strong> ${screeningAt}</p>
      <p>Your reservation is still valid. See you there!</p>
      <p style="color:#888;font-size:12px;">— from ${venue}</p>
    `,
  });
  if (error) throw error;
  return data;
}

/** After admin marks a support report as 已修复: tell user the issue has been fixed, please try again. */
export async function sendBugFixedNotification(params: {
  to: string;
  issueTypeLabel: string;
  locale: 'en' | 'zh';
}) {
  const { to, issueTypeLabel, locale } = params;
  const resend = getResend();
  if (!resend) return null;
  const venue = getVenueName();
  const isZh = locale === 'zh';
  const subject = isZh
    ? `问题已修复 — ${venue}`
    : `Issue fixed — ${venue}`;
  const html = isZh
    ? `
      <p>您好，</p>
      <p>您之前反馈的问题（<strong>${issueTypeLabel}</strong>）我们已经修复。</p>
      <p>请您再试一次。如仍有问题，欢迎再次通过页面内的支持入口联系我们。</p>
      <p style="color:#888;font-size:12px;">— 来自 ${venue}</p>
    `
    : `
      <p>Hi,</p>
      <p>The issue you reported (<strong>${issueTypeLabel}</strong>) has been fixed.</p>
      <p>Please try again. If you still have problems, you can contact us via the support option on the page.</p>
      <p style="color:#888;font-size:12px;">— from ${venue}</p>
    `;
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [to],
    subject,
    html,
  });
  if (error) throw error;
  return data;
}
