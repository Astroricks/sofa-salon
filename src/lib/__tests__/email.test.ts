/**
 * Unit tests for lib/email.ts — email template construction (subject and body).
 * We mock the Resend client and assert that the correct subject and body are passed.
 */
const mockSend = jest.fn().mockResolvedValue({ id: 'test-id' });

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

beforeEach(() => {
  mockSend.mockClear();
  process.env.RESEND_API_KEY = 'test-key';
  process.env.NEXT_PUBLIC_APP_NAME = '';
});

afterEach(() => {
  delete process.env.RESEND_API_KEY;
  delete process.env.NEXT_PUBLIC_APP_NAME;
});

describe('sendConfirmation', () => {
  it('sends email with subject "Seat confirmed" and screening title in body', async () => {
    const { sendConfirmation } = await import('../email');
    await sendConfirmation({
      to: 'user@example.com',
      screeningTitle: 'My Neighbor Totoro',
      seatKey: 'sofa-1:0',
      displayName: 'Alice',
      contactPlatform: 'wechat',
      contactId: 'alice_wx',
      screeningAt: '2025-03-15 19:00',
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
    const call = mockSend.mock.calls[0][0];
    expect(call.subject).toContain('Seat confirmed');
    expect(call.subject).toContain('My Neighbor Totoro');
    expect(call.html).toContain('My Neighbor Totoro');
    expect(call.html).toContain('Alice');
    expect(call.to).toEqual(['user@example.com']);
    expect(call.attachments).toBeUndefined();
  });

  it('adds Google Calendar link and screening.ics when calendar is passed', async () => {
    const { sendConfirmation } = await import('../email');
    await sendConfirmation({
      to: 'user@example.com',
      screeningTitle: 'Totoro',
      seatKey: 'sofa-1:0',
      displayName: 'Alice',
      contactPlatform: 'wechat',
      contactId: 'alice_wx',
      screeningAt: 'June 1, 2026',
      calendar: {
        screeningId: '550e8400-e29b-41d4-a716-446655440000',
        screeningAtIso: '2026-06-01T12:00:00.000Z',
        durationMinutes: 90,
      },
    });
    const call = mockSend.mock.calls[0][0];
    expect(call.html).toContain('calendar.google.com/calendar/render');
    expect(call.html).toContain('Add to Google Calendar');
    expect(call.attachments).toHaveLength(1);
    expect(call.attachments[0].filename).toBe('screening.ics');
    expect(call.attachments[0].content).toContain('BEGIN:VCALENDAR');
    expect(call.attachments[0].content).toContain('END:VCALENDAR');
  });
});

describe('sendAdminRemovedFromScreening', () => {
  it('includes screening time and escaped custom message in body', async () => {
    const { sendAdminRemovedFromScreening } = await import('../email');
    await sendAdminRemovedFromScreening({
      to: 'user@example.com',
      screeningTitle: 'Exotica',
      screeningAt: 'Sun, May 24, 2026',
      customMessage: 'Schedule conflict <sorry>',
    });
    const call = mockSend.mock.calls[0][0];
    expect(call.subject).toContain('Removed from screening');
    expect(call.html).toContain('Exotica');
    expect(call.html).toContain('Sun, May 24, 2026');
    expect(call.html).toContain('Schedule conflict &lt;sorry&gt;');
    expect(call.html).not.toContain('<sorry>');
    expect(call.html).toContain('background:#f7f4eb');
    expect(call.html).toContain('color:#1a1a1a');
    expect(call.html).not.toContain('background:#1a1a1a');
  });
});

describe('sendCancelConfirmation', () => {
  it('sends email with subject "Cancelled" and screening title', async () => {
    const { sendCancelConfirmation } = await import('../email');
    await sendCancelConfirmation({
      to: 'user@example.com',
      screeningTitle: 'Spirited Away',
      seatKey: 'chair-1:0',
      screeningAt: '2025-03-16 20:00',
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
    const call = mockSend.mock.calls[0][0];
    expect(call.subject).toContain('Cancelled');
    expect(call.html).toContain('Spirited Away');
  });
});

describe('sendHostContactMessage', () => {
  it('sends to host inbox with replyTo and subject prefix', async () => {
    jest.resetModules();
    process.env.HOST_CONTACT_EMAIL = 'host@example.com';
    const { sendHostContactMessage } = await import('../email');
    await sendHostContactMessage({
      subject: 'Want to join',
      message: 'Call me Ziggy\nWeChat: ziggy123',
      replyEmail: 'guest@example.com',
      signedInUserId: 'user-uuid',
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
    const call = mockSend.mock.calls[0][0];
    expect(call.to).toEqual(['host@example.com']);
    expect(call.replyTo).toBe('guest@example.com');
    expect(call.subject).toContain('Want to join');
    expect(call.html).toContain('guest@example.com');
    expect(call.html).toContain('Call me Ziggy');
    expect(call.html).toContain('user-uuid');
    delete process.env.HOST_CONTACT_EMAIL;
    jest.resetModules();
  });
});

describe('sendWaitlistPromotion', () => {
  it('sends email with subject "You\'re in!" and venue in body', async () => {
    const { sendWaitlistPromotion } = await import('../email');
    await sendWaitlistPromotion({
      to: 'user@example.com',
      screeningTitle: 'Kiki',
      seatKey: 'sofa-2:1',
      screeningAt: '2025-03-17 19:30',
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
    const call = mockSend.mock.calls[0][0];
    expect(call.subject).toContain("You're in!");
    expect(call.html).toContain('Sofa Salon');
  });
});
