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
      wechatId: 'alice_wx',
      screeningAt: '2025-03-15 19:00',
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
    const call = mockSend.mock.calls[0][0];
    expect(call.subject).toContain('Seat confirmed');
    expect(call.subject).toContain('My Neighbor Totoro');
    expect(call.html).toContain('My Neighbor Totoro');
    expect(call.html).toContain('Alice');
    expect(call.to).toEqual(['user@example.com']);
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
