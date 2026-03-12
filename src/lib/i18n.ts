// Locale: user can switch between English and 中文 (no stacking).

export type Locale = 'en' | 'zh';

const STORAGE_KEY = 'sofa-salon-locale';
const COOKIE_NAME = 'sofa-salon-locale';

export function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'zh' ? 'zh' : 'en';
}

export function setStoredLocale(locale: Locale): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, locale);
  document.cookie = `${COOKIE_NAME}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}

export const tEn = {
  nav: {
    home: 'Home',
    profile: 'Profile',
    admin: 'Admin',
    signIn: 'Sign in',
    logOut: 'Log out',
  },
  home: {
    sectionLabel: 'UPCOMING SCREENINGS',
    upcoming: 'upcoming',
    noScreenings: 'No upcoming screenings',
    selectSeat: 'Select seat ↓',
    selectedSeat: 'Selected ↑',
    full: 'FULL',
    left: 'LEFT',
    open: 'OPEN',
  },
  auth: {
    signInWithGoogle: 'Sign in with Google',
  },
  profile: {
    title: 'Profile',
    displayName: 'Display name',
    wechatId: 'WeChat ID',
    save: 'Save',
    watchHistory: 'Watch history',
    watchHistoryCount: 'You’ve attended',
    screenings: 'screenings',
    rateFilmQuality: 'Rate film quality',
    yourRating: 'Your rating',
    submitRating: 'Submit',
    noWatchHistory: 'Book a seat to see your history here.',
  },
  admin: {
    title: 'Admin',
    adminOnly: 'Admin only.',
    backToAdmin: '← Admin',
    eventsAndWaitlist: 'Events & waitlist',
    rooms: 'Rooms',
    newEvent: 'New event',
    seat: 'Seat',
    guestDetail: 'Guest details',
    wechatId: 'WeChat ID',
    displayName: 'Display name',
    close: 'Close',
    copyWechat: 'Copy WeChat',
    ratingsReport: 'Ratings report',
    tickerManage: 'Ticker',
    pastScreenings: 'Past screenings',
    avgRating: 'Avg',
    numRatings: 'Ratings',
    tickerCustomLines: 'Custom ticker lines',
    showUpcoming: 'Show upcoming events',
    showRatings: 'Show film ratings on ticker',
    addLine: 'Add line',
    content: 'Content',
    order: 'Order',
    active: 'Active',
  },
  screening: {
    back: '← Back',
    tapToClaim: 'Tap an empty seat to claim',
    seatsTaken: 'seats taken',
    waitingArea: 'WAITING AREA',
    queued: 'queued',
    ifSomeoneCancels: "If someone cancels, you'll be moved up automatically.",
    claimThisSeat: 'Claim this seat ✦',
    reallySqueeze: 'Really squeeze in?',
    squeezeSubtitle: "You'll be fitting in between two people. It'll be cosy.",
    squeezeConfirm: 'Squeeze in ✦',
    cancel: 'Cancel',
    squeezeNote: 'Squeeze',
    squeezeButton: 'squeeze',
    squeezeInZone: 'SQUEEZE IN',
    squeezeInSub: 'SCREENING FULL? JOIN WAITLIST OR TRY TO SQUEEZE',
    ghostSeat: 'Ghost seat',
    you: 'You',
  },
  seatMap: {
    loadingSeats: 'Loading seats...',
    noRoom: 'No room configured for this event.',
  },
  common: {
    loading: 'Loading...',
  },
} as const;

export const tZh = {
  nav: {
    home: '首页',
    profile: '个人',
    admin: '管理',
    signIn: '登录',
    logOut: '退出',
  },
  home: {
    sectionLabel: '即将放映',
    upcoming: '场即将放映',
    noScreenings: '暂无放映',
    selectSeat: '选座 ↓',
    selectedSeat: '已选 ↑',
    full: '满',
    left: '余',
    open: '可选',
  },
  auth: {
    signInWithGoogle: '使用 Google 登录',
  },
  profile: {
    title: '个人',
    displayName: '昵称',
    wechatId: '微信号',
    save: '保存',
    watchHistory: '观看历史',
    watchHistoryCount: '你已参加',
    screenings: '场活动',
    rateFilmQuality: '为影片质量打分',
    yourRating: '你的评分',
    submitRating: '提交',
    noWatchHistory: '选座参加活动后，这里会显示观看历史。',
  },
  admin: {
    title: '管理',
    adminOnly: '仅管理员。',
    backToAdmin: '← 返回管理',
    eventsAndWaitlist: '活动与候补',
    rooms: '房间',
    newEvent: '新建活动',
    seat: '座位',
    guestDetail: '观众信息',
    wechatId: '微信号',
    displayName: '昵称',
    close: '关闭',
    copyWechat: '复制微信号',
    ratingsReport: '评分报表',
    tickerManage: '跑马灯',
    pastScreenings: '往期活动',
    avgRating: '均分',
    numRatings: '评分人数',
    tickerCustomLines: '自定义跑马灯',
    showUpcoming: '显示即将放映',
    showRatings: '在跑马灯显示影片评分',
    addLine: '添加一行',
    content: '内容',
    order: '顺序',
    active: '启用',
  },
  screening: {
    back: '← 返回',
    tapToClaim: '点击空位选座',
    seatsTaken: '座位已占',
    waitingArea: '等待区',
    queued: '人排队',
    ifSomeoneCancels: '若有人取消，将自动顺延。',
    claimThisSeat: '确认选座 ✦',
    reallySqueeze: '真的要挤进去吗？',
    squeezeSubtitle: '会挤在两个人中间，很温馨。',
    squeezeConfirm: '挤进去 ✦',
    cancel: '取消',
    squeezeNote: '挤一挤',
    squeezeButton: '挤一挤',
    squeezeInZone: '挤一挤',
    squeezeInSub: '满了？加入候补或试试挤一挤',
    ghostSeat: '幽灵座',
    you: '你',
  },
  seatMap: {
    loadingSeats: '加载座位中...',
    noRoom: '未配置房间。',
  },
  common: {
    loading: '加载中...',
  },
} as const;

export type TEn = typeof tEn;
export type TZh = typeof tZh;

export function getT(locale: Locale): TEn {
  return locale === 'zh' ? (tZh as unknown as TEn) : tEn;
}

// Legacy: for server or when no context, default to en
export const t = tEn;
