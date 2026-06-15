'use client';

import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/components/LocaleProvider';
import PigeonHead from '@/components/PigeonHead';
import { HOST_NAME } from '@/lib/config';
import { formatScreeningInVenue } from '@/lib/screening-datetime';

const HOST_CONTACT_ZH = HOST_NAME ? `请联系 ${HOST_NAME}` : '请联系主理人';
const HOST_CONFIRM_ZH = HOST_NAME
  ? `请联系 ${HOST_NAME} 确认情况。`
  : '请联系主理人确认情况。';
const HOST_CONFIRM_EN = HOST_NAME
  ? `Please contact ${HOST_NAME} to confirm.`
  : 'Please contact the host to confirm.';

type StateId =
  | 'ROOT'
  | 'RULES'
  | 'RESCHEDULE_PICK_FILM'
  | 'RESCHEDULE_EXPLAIN'
  | 'RESCHEDULE_PICK_OPTIONS'
  | 'RESCHEDULE_CONFIRM'
  | 'CANCEL_SEAT'
  | 'CANCEL_THANKYOU'
  | 'CANCEL_CANT_FIND'
  | 'CANCEL_ALREADY_GONE'
  | 'CANCEL_ESCALATE'
  | 'EVENT_INFO'
  | 'INFO_LOCATION'
  | 'INFO_FRIEND'
  | 'INFO_SNACKS'
  | 'INFO_PUNCTUAL'
  | 'INFO_DRESSCODE'
  | 'INFO_DEV'
  | 'TECH_ISSUE'
  | 'TECH_CANT_SELECT'
  | 'TECH_SEAT_GONE'
  | 'TECH_BOOKING_CANCELLED'
  | 'TECH_PAGE_BROKEN'
  | 'TECH_ESCALATE_P1'
  | 'PIGEON_NONSENSE'
  | 'NONSENSE_TASTY'
  | 'NONSENSE_BAIL'
  | 'NONSENSE_HELLO'
  | 'NONSENSE_COO'
  | 'NONSENSE_COO_DEEP'
  | 'NONSENSE_THANKS'
  | 'NONSENSE_FOREVER'
  | 'NONSENSE_MY_STORY';

type State = {
  id: StateId;
  messages_zh: string[];
  messages_en: string[];
  options?: { label_zh: string; label_en: string; next: StateId; value?: string }[];
  action?: 'show_screenings';
  onEnterSupportLog?: { type: string; priority: number };
};

const STATES: Record<StateId, State> = {
  ROOT: {
    id: 'ROOT',
    messages_zh: ['咕。有什么可以帮你？'],
    messages_en: ['How can I help?'],
    options: [
      { label_zh: '📜  使用守则', label_en: 'Rules & how to use', next: 'RULES' },
      { label_zh: '🗓  想改期', label_en: 'Reschedule', next: 'RESCHEDULE_PICK_FILM' },
      { label_zh: '🪑  取消我的座位', label_en: 'Cancel seat', next: 'CANCEL_SEAT' },
      { label_zh: 'ℹ️  活动详情', label_en: 'Event info', next: 'EVENT_INFO' },
      { label_zh: '🔧  操作问题', label_en: 'Technical issue', next: 'TECH_ISSUE' },
      { label_zh: '🐦  我想说鸽语', label_en: 'Speak Pigeon', next: 'PIGEON_NONSENSE' },
      { label_zh: '👩‍💻  查看开发者信息', label_en: 'Developer info', next: 'INFO_DEV' },
    ],
  },
  INFO_DEV: {
    id: 'INFO_DEV',
    messages_zh: ['本应用由 471 开发。', 'GitHub: https://github.com/eveshi'],
    messages_en: ['This app was built by 471.', 'GitHub: https://github.com/eveshi'],
    options: [{ label_zh: '返回主菜单', label_en: 'Back to menu', next: 'ROOT' }],
  },
  RULES: {
    id: 'RULES',
    messages_zh: [
      '【怎么用】',
      '首页选一场活动 → 点进去选座位。需要先登录，个人页里填好昵称和微信号才能选座。',
      '可以在座位图上帮朋友多选座位。',
      '取消座位：在活动页点你的头像，出现取消键，点一下就释放座位。',
      '',
      '【规则】',
      '• 满座时可以加入候补，有人取消会按顺序补上（或由管理员安排）。',
      '• 血条：临开场前取消、或被标记鸽了，会掉一格。掉满三格会变成鸽子，需连续两场取消鸽了标记（管理员勾选掉）才能恢复。',
      '• 改期要超过半数已报名者投票同意，管理员批准后生效。',
      '• 活动地址会在放映前发到你的邮箱和微信；请准时，迟到可能影响他人。',
      '• 当然可以带零食来跟大家分享哟！带上你最喜欢的饮料和零食吧；别带气味太重的。没有着装要求。',
    ],
    messages_en: [
      '【How to use】',
      'Pick an event on the home page → open it and choose a seat. You need to log in and set your display name and WeChat in your profile first.',
      'You can claim extra seats for your friends on the seat map.',
      'To cancel: on the event page tap your avatar, then tap the cancel button to release your seat.',
      '',
      '【Rules】',
      '• When full, you can join the waitlist. If someone cancels, you may be promoted (auto or by admin).',
      '• Blood bar: cancelling close to the event or being marked no-show loses a segment. Three strikes and you become a pigeon; clear no-show on two screenings in a row (admin unchecks) to recover.',
      '• Rescheduling needs a majority vote of registered attendees; admin approves the new time.',
      '• The address is sent by email and WeChat before the screening. Please be on time.',
      '• Of course! Bring your favorite drinks and snacks to share. Avoid strong smells. No dress code.',
    ],
    options: [{ label_zh: '返回主菜单', label_en: 'Back to menu', next: 'ROOT' }],
  },
  RESCHEDULE_PICK_FILM: {
    id: 'RESCHEDULE_PICK_FILM',
    messages_zh: ['你想改哪场放映？'],
    messages_en: ['Which screening do you want to reschedule?'],
    action: 'show_screenings',
  },
  RESCHEDULE_EXPLAIN: {
    id: 'RESCHEDULE_EXPLAIN',
    messages_zh: [
      '改期需要超过半数已报名者投票同意。',
      '发起投票后，其他人会在活动页面看到你的提议。',
      '投票在活动开始前 24 小时截止。票数不够就别想了。',
    ],
    messages_en: [
      'Rescheduling needs a majority of registered attendees to vote in favour.',
      'After you start a vote, others will see your proposal on the event page.',
      'Voting ends 24 hours before the event. No majority, no change.',
    ],
    options: [
      { label_zh: '发起改期投票', label_en: 'Start vote', next: 'RESCHEDULE_PICK_OPTIONS' },
      { label_zh: '我只是问问', label_en: 'Never mind', next: 'ROOT' },
    ],
  },
  RESCHEDULE_PICK_OPTIONS: {
    id: 'RESCHEDULE_PICK_OPTIONS',
    messages_zh: ['请选择已有时间或填写新的希望改期时间（最多 5 个选项）。'],
    messages_en: ['Select existing times or enter new options (max 5 total).'],
  },
  RESCHEDULE_CONFIRM: {
    id: 'RESCHEDULE_CONFIRM',
    messages_zh: ['好的。管理员会收到你的改期提议，投票发起后会在活动页显示。'],
    messages_en: ['Got it. Admin will receive your request; the vote will show on the event page.'],
    options: [{ label_zh: '返回主菜单', label_en: 'Back to menu', next: 'ROOT' }],
  },
  CANCEL_SEAT: {
    id: 'CANCEL_SEAT',
    messages_zh: [
      '取消座位很简单：',
      '在活动页面找到你的头像，\n点一下它，\n旁边会出现取消按键。',
      '点取消，座位就释放了。',
    ],
    messages_en: [
      'To cancel your seat:',
      'On the event page, find your avatar.\nTap it,\nand the cancel button will appear.',
      'Tap cancel and your seat is released.',
    ],
    options: [
      { label_zh: '✓ 明白了，我去取消', label_en: 'Got it, I’ll cancel', next: 'CANCEL_THANKYOU' },
      { label_zh: '我找不到我的头像', label_en: "Can't find it", next: 'CANCEL_CANT_FIND' },
      { label_zh: '我的座位已经不见了', label_en: "It's gone", next: 'CANCEL_ALREADY_GONE' },
    ],
  },
  CANCEL_THANKYOU: {
    id: 'CANCEL_THANKYOU',
    messages_zh: ['谢谢你取消座位。', '等待名单里的人会很感激你的。', '咕。'],
    messages_en: ['Thanks for cancelling.', 'People on the waitlist will appreciate it.', 'Coo.'],
    options: [{ label_zh: '返回主菜单', label_en: 'Back to menu', next: 'ROOT' }],
  },
  CANCEL_CANT_FIND: {
    id: 'CANCEL_CANT_FIND',
    messages_zh: [
      '请确认：',
      '1. 你已登录（右上角有你的头像）',
      '2. 你是在对的那场放映页面',
      '3. 你在这场放映确实有订座',
    ],
    messages_en: [
      'Please check:',
      '1. You are logged in (your avatar is in the top right)',
      '2. You are on the correct screening page',
      '3. You actually have a seat for this screening',
    ],
    options: [
      { label_zh: '✓ 找到了', label_en: 'Found it', next: 'CANCEL_THANKYOU' },
      { label_zh: '还是不行', label_en: "Still can't", next: 'CANCEL_ESCALATE' },
    ],
  },
  CANCEL_ALREADY_GONE: {
    id: 'CANCEL_ALREADY_GONE',
    messages_zh: [
      '如果你的座位不见了，可能是：',
      '• 管理员取消了这场放映',
      '• 你的预约因故被移除',
      HOST_CONFIRM_ZH,
    ],
    messages_en: [
      'If your seat is gone, it may be because:',
      '• The host cancelled this screening',
      '• Your booking was removed for some reason',
      HOST_CONFIRM_EN,
    ],
    options: [{ label_zh: '返回主菜单', label_en: 'Back to menu', next: 'ROOT' }],
  },
  CANCEL_ESCALATE: {
    id: 'CANCEL_ESCALATE',
    messages_zh: ['已通知管理员。请稍候。'],
    messages_en: ['Admin has been notified. Please wait.'],
    onEnterSupportLog: { type: 'cancel_issue', priority: 2 },
    options: [{ label_zh: '返回主菜单', label_en: 'Back to menu', next: 'ROOT' }],
  },
  EVENT_INFO: {
    id: 'EVENT_INFO',
    messages_zh: ['你想了解哪方面？'],
    messages_en: ['What would you like to know?'],
    options: [
      { label_zh: '📍  活动在哪里', label_en: 'Location', next: 'INFO_LOCATION' },
      { label_zh: '🎬  带朋友来', label_en: 'Bring a friend', next: 'INFO_FRIEND' },
      { label_zh: '🍿  可以带零食吗', label_en: 'Snacks OK?', next: 'INFO_SNACKS' },
      { label_zh: '⏰  准时开始吗', label_en: 'Does it start on time?', next: 'INFO_PUNCTUAL' },
      { label_zh: '👔  需要着装要求吗', label_en: 'Dress code?', next: 'INFO_DRESSCODE' },
      { label_zh: '← 返回', label_en: 'Back', next: 'ROOT' },
    ],
  },
  INFO_LOCATION: {
    id: 'INFO_LOCATION',
    messages_zh: [
      '具体地址会在放映前发送给所有已报名者。',
      '请检查你的邮件和微信。',
      `如果没收到，${HOST_CONTACT_ZH}。`,
    ],
    messages_en: [
      'The address will be sent to all registered attendees before the screening.',
      'Check your email and WeChat.',
      `If you don’t get it, contact ${HOST_NAME || 'the host'}.`,
    ],
    options: [{ label_zh: '返回主菜单', label_en: 'Back to menu', next: 'ROOT' }],
  },
  INFO_FRIEND: {
    id: 'INFO_FRIEND',
    messages_zh: [
      '可以带朋友来。',
      '你可以在座位图上帮朋友选座：点选空位即可为朋友占座。',
    ],
    messages_en: [
      'You can bring a friend.',
      'You can claim extra seats for your friends on the seat map—tap an empty seat to reserve it for them.',
    ],
    options: [{ label_zh: '返回主菜单', label_en: 'Back to menu', next: 'ROOT' }],
  },
  INFO_SNACKS: {
    id: 'INFO_SNACKS',
    messages_zh: [
      '当然可以带零食来跟大家分享哟！',
      '带上你最喜欢的饮料和零食吧。',
      '请避免气味太重的食物，榴莲达咩～',
    ],
    messages_en: [
      'Of course! Bring snacks to share with everyone.',
      'Bring your favorite drinks and snacks.',
      'Avoid strong-smelling food (no durian).',
    ],
    options: [{ label_zh: '返回主菜单', label_en: 'Back to menu', next: 'ROOT' }],
  },
  INFO_PUNCTUAL: {
    id: 'INFO_PUNCTUAL',
    messages_zh: ['放映准时开始。', '请提前 5–10 分钟到达。', '迟到可能影响其他观众。'],
    messages_en: ['Screening starts on time.', 'Please arrive 5–10 minutes early.', 'Being late may affect others.'],
    options: [{ label_zh: '返回主菜单', label_en: 'Back to menu', next: 'ROOT' }],
  },
  INFO_DRESSCODE: {
    id: 'INFO_DRESSCODE',
    messages_zh: ['没有着装要求。', '舒服就好。', '这是朋友家，不是电影院。'],
    messages_en: ['No dress code.', 'Just be comfortable.', "It's someone's home, not a cinema."],
    options: [{ label_zh: '返回主菜单', label_en: 'Back to menu', next: 'ROOT' }],
  },
  TECH_ISSUE: {
    id: 'TECH_ISSUE',
    messages_zh: ['遇到什么问题？'],
    messages_en: ['What kind of issue?'],
    options: [
      { label_zh: '选不了座位', label_en: "Can't select seat", next: 'TECH_CANT_SELECT' },
      { label_zh: '我的座位不见了', label_en: 'Seat disappeared', next: 'TECH_SEAT_GONE' },
      { label_zh: '预约被取消了', label_en: 'Booking cancelled', next: 'TECH_BOOKING_CANCELLED' },
      { label_zh: '页面打不开', label_en: 'Page not loading', next: 'TECH_PAGE_BROKEN' },
      { label_zh: '← 返回', label_en: 'Back', next: 'ROOT' },
    ],
  },
  TECH_CANT_SELECT: {
    id: 'TECH_CANT_SELECT',
    messages_zh: [
      '请检查以下两点：',
      '1. 你已登录',
      '2. 你的个人页面里填写了微信号',
      '两步都完成后，座位应该可以选。',
    ],
    messages_en: [
      'Please check:',
      '1. You are logged in',
      '2. Your profile has a WeChat ID filled in',
      'After both, seats should be selectable.',
    ],
    options: [
      { label_zh: '✓ 可以了', label_en: 'All good', next: 'ROOT' },
      { label_zh: '还是不行', label_en: 'Still broken', next: 'TECH_ESCALATE_P1' },
    ],
  },
  TECH_SEAT_GONE: {
    id: 'TECH_SEAT_GONE',
    messages_zh: [
      '你的座位可能因以下原因消失：',
      '• 系统检测到重复预约',
      '• 管理员手动调整了座位',
      '已通知管理员处理。',
    ],
    messages_en: [
      'Your seat may have disappeared because:',
      '• Duplicate booking was detected',
      '• Admin adjusted seats manually',
      'Admin has been notified.',
    ],
    onEnterSupportLog: { type: 'seat_gone', priority: 1 },
    options: [{ label_zh: '返回主菜单', label_en: 'Back to menu', next: 'ROOT' }],
  },
  TECH_BOOKING_CANCELLED: {
    id: 'TECH_BOOKING_CANCELLED',
    messages_zh: ['已通知管理员。标记为优先处理。请等候。'],
    messages_en: ['Admin notified. Marked as priority. Please wait.'],
    onEnterSupportLog: { type: 'booking_cancelled', priority: 1 },
    options: [{ label_zh: '返回主菜单', label_en: 'Back to menu', next: 'ROOT' }],
  },
  TECH_PAGE_BROKEN: {
    id: 'TECH_PAGE_BROKEN',
    messages_zh: ['已通知管理员。标记为紧急处理。\n请稍后刷新页面重试。'],
    messages_en: ['Admin notified. Marked urgent.\nPlease try again after refreshing.'],
    onEnterSupportLog: { type: 'page_broken', priority: 1 },
    options: [{ label_zh: '返回主菜单', label_en: 'Back to menu', next: 'ROOT' }],
  },
  TECH_ESCALATE_P1: {
    id: 'TECH_ESCALATE_P1',
    messages_zh: ['已通知管理员，标记为优先处理。\n请稍候回复。'],
    messages_en: ['Admin notified, marked as priority.\nPlease wait for a reply.'],
    onEnterSupportLog: { type: 'cant_select', priority: 1 },
    options: [{ label_zh: '返回主菜单', label_en: 'Back to menu', next: 'ROOT' }],
  },
  PIGEON_NONSENSE: {
    id: 'PIGEON_NONSENSE',
    messages_zh: ['咕咕咕。\n选一条鸽语：'],
    messages_en: ['Coo coo.\nPick a pigeon line:'],
    options: [
      { label_zh: '鸽子好吃吗？', label_en: 'Do pigeons taste good?', next: 'NONSENSE_TASTY' },
      { label_zh: '我就是想鸽', label_en: 'I just want to flake', next: 'NONSENSE_BAIL' },
      { label_zh: 'Hello / 你好', label_en: 'Hello / Hi', next: 'NONSENSE_HELLO' },
      { label_zh: '咕', label_en: 'Coo', next: 'NONSENSE_COO' },
      { label_zh: '谢谢', label_en: 'Thanks', next: 'NONSENSE_THANKS' },
      { label_zh: '我想永远是鸽子', label_en: 'I want to be a pigeon forever', next: 'NONSENSE_FOREVER' },
      { label_zh: '我的故事', label_en: 'My story', next: 'NONSENSE_MY_STORY' },
      { label_zh: '← 返回', label_en: 'Back', next: 'ROOT' },
    ],
  },
  NONSENSE_MY_STORY: {
    id: 'NONSENSE_MY_STORY',
    messages_zh: ['咕。这是「我的故事」。', 'https://youtube.com/shorts/Gd5YJUGlOdg'],
    messages_en: ['Coo. This is "My story".', 'https://youtube.com/shorts/Gd5YJUGlOdg'],
    options: [{ label_zh: '返回主菜单', label_en: 'Back to menu', next: 'ROOT' }],
  },
  NONSENSE_TASTY: {
    id: 'NONSENSE_TASTY',
    messages_zh: ['你再问我就把你变成鸽子。'],
    messages_en: ['Ask again and I’ll turn you into a pigeon.'],
    options: [{ label_zh: '返回主菜单', label_en: 'Back to menu', next: 'ROOT' }],
  },
  NONSENSE_BAIL: {
    id: 'NONSENSE_BAIL',
    messages_zh: ['我知道。', '但请先取消座位。', '让等待的人能坐进来。'],
    messages_en: ['I know.', 'But please cancel your seat first.', 'So someone on the waitlist can get in.'],
    options: [
      { label_zh: '好吧，去取消', label_en: 'OK, I’ll cancel', next: 'CANCEL_SEAT' },
      { label_zh: '算了随便', label_en: 'Whatever', next: 'ROOT' },
    ],
  },
  NONSENSE_HELLO: {
    id: 'NONSENSE_HELLO',
    messages_zh: ['咕。\n你好。\n有事请选菜单。'],
    messages_en: ['Coo.\nHello.\nUse the menu if you need something.'],
    options: [{ label_zh: '返回主菜单', label_en: 'Back to menu', next: 'ROOT' }],
  },
  NONSENSE_COO: {
    id: 'NONSENSE_COO',
    messages_zh: ['咕咕咕。\n🐦'],
    messages_en: ['Coo coo coo.\n🐦'],
    options: [
      { label_zh: '咕咕咕。', label_en: 'Coo coo coo.', next: 'NONSENSE_COO_DEEP' },
      { label_zh: '返回主菜单', label_en: 'Back to menu', next: 'ROOT' },
    ],
  },
  NONSENSE_COO_DEEP: {
    id: 'NONSENSE_COO_DEEP',
    messages_zh: ['咕。\n\n...咕。\n\n咕咕。'],
    messages_en: ['Coo.\n\n...Coo.\n\nCoo coo.'],
    options: [{ label_zh: '返回主菜单', label_en: 'Back to menu', next: 'ROOT' }],
  },
  NONSENSE_THANKS: {
    id: 'NONSENSE_THANKS',
    messages_zh: ['咕咕。\n不客气。'],
    messages_en: ['Coo coo.\nYou’re welcome.'],
    options: [{ label_zh: '返回主菜单', label_en: 'Back to menu', next: 'ROOT' }],
  },
  NONSENSE_FOREVER: {
    id: 'NONSENSE_FOREVER',
    messages_zh: ['那是一种诅咒，不是选择。', '相信我。'],
    messages_en: ["That's a curse, not a choice.", 'Trust me.'],
    options: [{ label_zh: '返回主菜单', label_en: 'Back to menu', next: 'ROOT' }],
  },
};

type LogEntry = { type: 'pigeon'; content: string } | { type: 'user'; content: string };

/** Turn message content into nodes, with URLs as clickable links. */
function contentWithLinks(content: string): ReactNode {
  const parts = content.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#2dd4bf] hover:underline break-all"
      >
        {part}
      </a>
    ) : (
      part
    )
  );
}

type StackFrame = { stateId: StateId; logLength: number };

type ScreeningOption = { id: string; title: string; screening_at: string };

export default function FaqChatbot() {
  const { locale } = useLocale();
  const isZh = locale === 'zh';
  const [open, setOpen] = useState(false);
  const [pigeonBounce, setPigeonBounce] = useState(false);
  const [stateStack, setStateStack] = useState<StackFrame[]>([]);
  const [messageLog, setMessageLog] = useState<LogEntry[]>([]);
  const [screenings, setScreenings] = useState<ScreeningOption[]>([]);
  const [screeningsLoading, setScreeningsLoading] = useState(false);
  const [selectedScreening, setSelectedScreening] = useState<{ id: string; title: string } | null>(null);
  const supportLogFired = useRef<Set<StateId>>(new Set());

  type RescheduleOptionRow = { id: string; option_date: string; time_slot: string; position: number };
  const [rescheduleOptions, setRescheduleOptions] = useState<RescheduleOptionRow[] | null>(null);
  const [rescheduleOptionCount, setRescheduleOptionCount] = useState(0);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleNewSlots, setRescheduleNewSlots] = useState<{ date: string; timeSlot: string }[]>([
    { date: '', timeSlot: '14:00–17:00' },
    { date: '', timeSlot: '14:00–17:00' },
    { date: '', timeSlot: '14:00–17:00' },
  ]);
  const [rescheduleVoteIds, setRescheduleVoteIds] = useState<string[]>([]);
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);

  const currentStateId: StateId = stateStack.length > 0 ? stateStack[stateStack.length - 1].stateId : 'ROOT';
  const currentState = STATES[currentStateId];

  const getMessages = useCallback(
    (state: State) => (isZh ? state.messages_zh : state.messages_en),
    [isZh]
  );
  const getLabel = useCallback(
    (opt: { label_zh: string; label_en: string }) => (isZh ? opt.label_zh : opt.label_en),
    [isZh]
  );

  useEffect(() => {
    if (open && stateStack.length === 0) {
      const root = STATES.ROOT;
      const messages = getMessages(root);
      setMessageLog(messages.map((m) => ({ type: 'pigeon' as const, content: m })));
      setStateStack([{ stateId: 'ROOT', logLength: messages.length }]);
    }
  }, [open, getMessages]);

  const fireSupportLog = useCallback(
    (stateId: StateId, screeningId: string | null) => {
      const state = STATES[stateId];
      const cfg = state.onEnterSupportLog;
      if (!cfg || supportLogFired.current.has(stateId)) return;
      supportLogFired.current.add(stateId);
      fetch('/api/support-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: cfg.type,
          screeningId: screeningId || undefined,
          priority: cfg.priority,
        }),
      }).catch(() => {});
    },
    []
  );

  const onSelect = useCallback(
    (label: string, nextId: StateId, value?: string) => {
      const nextState = STATES[nextId];
      const messages = getMessages(nextState);
      const nextScreeningId = value ?? selectedScreening?.id ?? null;
      if (value) setSelectedScreening({ id: value, title: label });
      setMessageLog((prev) => [
        ...prev,
        { type: 'user' as const, content: label },
        ...messages.map((m) => ({ type: 'pigeon' as const, content: m })),
      ]);
      setStateStack((prev) => {
        const prevFrame = prev[prev.length - 1];
        const newLogLength = prevFrame.logLength + 1 + messages.length;
        return [...prev, { stateId: nextId, logLength: newLogLength }];
      });
      fireSupportLog(nextId, nextScreeningId);
    },
    [getMessages, fireSupportLog, selectedScreening?.id]
  );

  const goBack = useCallback(() => {
    setStateStack((prev) => {
      if (prev.length <= 1) return prev;
      const popped = prev.slice(0, -1);
      const trimTo = popped[popped.length - 1].logLength;
      setMessageLog((log) => log.slice(0, trimTo));
      return popped;
    });
  }, []);

  useEffect(() => {
    if (currentStateId !== 'RESCHEDULE_PICK_FILM' || !open) return;
    setScreeningsLoading(true);
    const supabase = createClient();
    Promise.resolve(
      supabase
        .from('screenings')
        .select('id, title, screening_at')
        .eq('is_active', true)
        .gte('screening_at', new Date().toISOString())
        .order('screening_at', { ascending: true })
    )
      .then(({ data }) => {
        setScreenings((data as ScreeningOption[]) ?? []);
      })
      .finally(() => setScreeningsLoading(false));
  }, [currentStateId, open]);

  useEffect(() => {
    if (currentStateId !== 'RESCHEDULE_PICK_OPTIONS' || !selectedScreening?.id || !open) return;
    setRescheduleLoading(true);
    setRescheduleOptions(null);
    fetch(`/api/reschedule/${selectedScreening.id}`)
      .then((res) => res.json())
      .then((data: { proposal: { id: string } | null; options: RescheduleOptionRow[]; optionCount: number }) => {
        setRescheduleOptions(data.options ?? []);
        setRescheduleOptionCount(data.optionCount ?? 0);
        const count = data.optionCount ?? 0;
        const newSlotsCount = count === 0 ? 3 : Math.min(2, Math.max(0, 5 - count));
        setRescheduleNewSlots(
          Array.from({ length: newSlotsCount }, () => ({ date: '', timeSlot: '14:00–17:00' }))
        );
        setRescheduleVoteIds([]);
      })
      .catch(() => {
        setRescheduleOptions([]);
        setRescheduleOptionCount(0);
        setRescheduleNewSlots([
          { date: '', timeSlot: '14:00–17:00' },
          { date: '', timeSlot: '14:00–17:00' },
          { date: '', timeSlot: '14:00–17:00' },
        ]);
        setRescheduleVoteIds([]);
      })
      .finally(() => setRescheduleLoading(false));
  }, [currentStateId, selectedScreening?.id, open]);

  const submitReschedule = useCallback(() => {
    if (!selectedScreening?.id || rescheduleSubmitting) return;
    const newSlots = rescheduleNewSlots
      .filter((s) => s.date && s.date.trim())
      .map((s) => ({ date: s.date.trim(), timeSlot: s.timeSlot }));
    const voteOptionIds = [...rescheduleVoteIds];
    if (newSlots.length === 0 && voteOptionIds.length === 0) return;
    setRescheduleSubmitting(true);
    fetch('/api/reschedule/propose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ screeningId: selectedScreening.id, newSlots, voteOptionIds }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((e) => Promise.reject(e));
      })
      .then(() => {
        const confirmState = STATES.RESCHEDULE_CONFIRM;
        const confirmMessages = isZh ? confirmState.messages_zh : confirmState.messages_en;
        const userMsg = isZh ? '已提交' : 'Submitted';
        setMessageLog((prev) => [
          ...prev,
          { type: 'user' as const, content: userMsg },
          ...confirmMessages.map((m) => ({ type: 'pigeon' as const, content: m })),
        ]);
        setStateStack((prev) => {
          const last = prev[prev.length - 1];
          return [...prev, { stateId: 'RESCHEDULE_CONFIRM' as StateId, logLength: last.logLength + 1 + confirmMessages.length }];
        });
      })
      .catch(() => setRescheduleSubmitting(false))
      .finally(() => setRescheduleSubmitting(false));
  }, [selectedScreening?.id, rescheduleNewSlots, rescheduleVoteIds, rescheduleSubmitting, isZh]);

  const canBack = stateStack.length > 1;
  const displayLog = canBack
    ? messageLog.slice(0, stateStack[stateStack.length - 1].logLength)
    : messageLog;

  const TIME_SLOTS = ['14:00–17:00', '19:00–22:00'];
  const dynamicOptions =
    currentStateId === 'RESCHEDULE_PICK_OPTIONS'
      ? undefined
      : currentStateId === 'RESCHEDULE_PICK_FILM' && currentState.action === 'show_screenings'
        ? screenings.map((s) => ({
            label_zh: `${s.title} · ${formatScreeningInVenue(s.screening_at, 'zh-CN', { day: 'numeric', month: 'short' })}`,
            label_en: `${s.title} · ${formatScreeningInVenue(s.screening_at, 'en-GB', { day: 'numeric', month: 'short' })}`,
            next: 'RESCHEDULE_EXPLAIN' as StateId,
            value: s.id,
          }))
        : currentState.options;

  const backLabel = isZh ? '← 返回' : '← back';
  const loadingLabel = isZh ? '加载中…' : 'Loading…';
  const noScreeningsLabel = isZh ? '暂无即将举行的放映。' : 'No upcoming screenings.';

  return (
    <>
      <style>{`
        .faq-chatbot-bob {
          animation: pigeonBob 2.5s ease-in-out infinite;
        }
        .faq-chatbot-btn:hover {
          filter: drop-shadow(0 0 6px rgba(45,212,191,0.5));
        }
        .faq-chatbot-pigeon-bounce {
          animation: pigeonClickBounce 0.45s ease-out;
        }
        @keyframes pigeonClickBounce {
          0% { transform: translateY(0) rotate(0deg); }
          28% { transform: translateY(-10px) rotate(-4deg); }
          56% { transform: translateY(2px) rotate(2deg); }
          100% { transform: translateY(0) rotate(0deg); }
        }
        .faq-chatbot-shadow-wrap {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        .faq-chatbot-shadow-inner {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          transform-origin: 0 0;
        }
        .faq-chatbot-shadow-inner.faq-chatbot-shadow-bounce {
          animation: shadowScaleBounce 0.45s ease-out;
        }
        @keyframes shadowScaleBounce {
          0% { transform: scale(1, 1); }
          28% { transform: scale(1.04, 1.12); }
          56% { transform: scale(1.02, 1.04); }
          100% { transform: scale(1, 1); }
        }
      `}</style>
      <button
        type="button"
        onClick={() => {
          setPigeonBounce(true);
          setOpen((o) => !o);
          window.setTimeout(() => setPigeonBounce(false), 450);
        }}
        className="faq-chatbot-btn fixed z-[10000] border-0 bg-transparent shadow-none cursor-pointer p-0"
        style={{ bottom: 10, right: 20 }}
        aria-label={isZh ? '打开支持对话' : 'Open support chat'}
      >
        <span className="relative inline-block" style={{ width: 120, height: Math.round(120 * (832 / 812)) }}>
          <span className="faq-chatbot-shadow-wrap">
            <span className={`faq-chatbot-shadow-inner ${pigeonBounce ? 'faq-chatbot-shadow-bounce' : ''}`}>
              <PigeonHead layer="shadow" size={120} className="w-full h-full" />
            </span>
          </span>
          <span className={pigeonBounce ? 'faq-chatbot-pigeon-bounce absolute inset-0 block' : 'faq-chatbot-bob absolute inset-0 block'}>
            <PigeonHead layer="pigeon" size={120} className="w-full h-full" />
          </span>
        </span>
      </button>

      {open && (
        <div
          className="faq-chatbot-window fixed z-[10000] flex flex-col border border-[#2dd4bf] bg-[#0f0f0f]"
          style={{ borderRadius: 0 }}
        >
          <div
            className="flex items-center gap-2 border-b border-[#2a2a2a] bg-[#161616] shrink-0"
            style={{ padding: '10px 14px', borderRadius: 0 }}
          >
            <PigeonHead size={72} />
            <div className="flex flex-col min-w-0">
              <p style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: '#2dd4bf' }}>SOFA PIGEON</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555' }}>
                {isZh ? '技术支持' : 'support'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto font-mono text-base text-[#555] hover:text-[#2dd4bf] transition-colors"
              aria-label={isZh ? '关闭' : 'Close'}
            >
              ×
            </button>
          </div>

          <div
            className="flex-1 overflow-y-auto flex flex-col gap-3"
            style={{ padding: 12, borderRadius: 0 }}
          >
            {canBack && (
              <button
                type="button"
                onClick={goBack}
                className="self-start font-mono text-[10px] text-[#444] hover:text-[#888] transition-colors text-left"
              >
                {backLabel}
              </button>
            )}

            {displayLog.map((entry, i) =>
              entry.type === 'pigeon' ? (
                <div key={i} className="flex items-start gap-2">
                  <div className="shrink-0">
                    <PigeonHead size={48} />
                  </div>
                  <p
                    className="font-mono text-[11px] text-[#e8e4dc] leading-[1.8] whitespace-pre-line"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {contentWithLinks(entry.content)}
                  </p>
                </div>
              ) : (
                <div
                  key={i}
                  className="self-end border border-[#2a2a2a] bg-[#1e1e1e] font-mono text-[11px] text-[#888]"
                  style={{ padding: '4px 10px', borderRadius: 0 }}
                >
                  {entry.content}
                </div>
              )
            )}

            {currentStateId === 'RESCHEDULE_PICK_OPTIONS' && (
              <div className="mt-2 space-y-2 font-mono text-[11px]">
                {rescheduleLoading ? (
                  <p className="text-[#555]">{loadingLabel}</p>
                ) : (
                  <>
                    {rescheduleOptions && rescheduleOptions.length > 0 && (
                      <div>
                        <p className="text-[#2dd4bf] mb-1.5">{isZh ? '已有选项（可多选）' : 'Existing options (multi-select)'}</p>
                        <div className="flex flex-col gap-1">
                          {rescheduleOptions.map((o) => (
                            <label key={o.id} className="flex items-center gap-2 text-[#e8e4dc] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={rescheduleVoteIds.includes(o.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setRescheduleVoteIds((ids) => [...ids, o.id]);
                                  else setRescheduleVoteIds((ids) => ids.filter((id) => id !== o.id));
                                }}
                                className="rounded border-[#2a2a2a]"
                              />
                              <span>{o.option_date} {o.time_slot}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    {rescheduleOptionCount < 5 && (
                      <div>
                        <p className="text-[#2dd4bf] mb-1.5">
                          {isZh ? '新增时间（日期 + 时段）' : 'Add new (date + time slot)'}
                        </p>
                        <div className="flex flex-col gap-2">
                          {rescheduleNewSlots.map((slot, i) => (
                            <div key={i} className="flex flex-wrap items-center gap-2">
                              <input
                                type="date"
                                value={slot.date}
                                onChange={(e) =>
                                  setRescheduleNewSlots((prev) => {
                                    const next = [...prev];
                                    next[i] = { ...next[i], date: e.target.value };
                                    return next;
                                  })
                                }
                                className="bg-[#161616] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[11px] px-2 py-1"
                              />
                              <select
                                value={slot.timeSlot}
                                onChange={(e) =>
                                  setRescheduleNewSlots((prev) => {
                                    const next = [...prev];
                                    next[i] = { ...next[i], timeSlot: e.target.value };
                                    return next;
                                  })
                                }
                                className="bg-[#161616] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[11px] px-2 py-1"
                              >
                                {TIME_SLOTS.map((ts) => (
                                  <option key={ts} value={ts}>{ts}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={submitReschedule}
                      disabled={rescheduleSubmitting || (rescheduleNewSlots.every((s) => !s.date?.trim()) && rescheduleVoteIds.length === 0)}
                      className="mt-2 w-full font-mono text-[11px] border border-[#2dd4bf] bg-[#161616] text-[#2dd4bf] hover:bg-[#2dd4bf] hover:text-[#0f0f0f] transition-colors py-2"
                    >
                      {rescheduleSubmitting ? (isZh ? '提交中…' : 'Submitting…') : isZh ? '提交' : 'Submit'}
                    </button>
                  </>
                )}
              </div>
            )}

            {dynamicOptions && dynamicOptions.length > 0 && (
              <div className="flex flex-col gap-1 mt-1">
                {dynamicOptions.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onSelect(getLabel(opt), opt.next, opt.value)}
                    className="w-full text-left font-mono text-[11px] text-[#e8e4dc] border border-[#2a2a2a] bg-[#161616] hover:border-[#2dd4bf] hover:text-[#2dd4bf] transition-colors flex items-center justify-between gap-2"
                    style={{ padding: '8px 12px', borderRadius: 0 }}
                  >
                    <span className="min-w-0 truncate">{getLabel(opt)}</span>
                    <span className="shrink-0">→</span>
                  </button>
                ))}
              </div>
            )}

            {screeningsLoading && currentStateId === 'RESCHEDULE_PICK_FILM' && (
              <p className="font-mono text-[11px] text-[#555]">{loadingLabel}</p>
            )}
            {currentStateId === 'RESCHEDULE_PICK_FILM' && !screeningsLoading && screenings.length === 0 && (
              <p className="font-mono text-[11px] text-[#555]">{noScreeningsLabel}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
