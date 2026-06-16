'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';

type SupportLog = {
  id: string;
  type: string;
  screening_id: string | null;
  user_id: string | null;
  priority: number;
  message: string | null;
  created_at: string;
  status?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
};

type RescheduleProposal = {
  id: string;
  screening_id: string;
  created_by: string;
  created_at: string;
};

type RescheduleOption = {
  id: string;
  option_date: string;
  time_slot: string;
  position: number;
};

type UserInfo = {
  display_name: string | null;
  wechat_id: string | null;
  email: string | null;
};

const TYPE_LABELS: Record<string, { zh: string; en: string }> = {
  cancel_issue: { zh: '取消座位问题', en: 'Cancel seat issue' },
  seat_gone: { zh: '座位不见了', en: 'Seat disappeared' },
  booking_cancelled: { zh: '预约被取消', en: 'Booking cancelled' },
  page_broken: { zh: '页面打不开', en: 'Page not loading' },
  cant_select: { zh: '选不了座位', en: "Can't select seat" },
  reschedule_request: { zh: '改期请求', en: 'Reschedule request' },
};

export default function AdminFeedbackPage() {
  const { t, locale } = useLocale();
  const isZh = locale === 'zh';
  const [supportLogs, setSupportLogs] = useState<SupportLog[]>([]);
  const [rescheduleProposals, setRescheduleProposals] = useState<RescheduleProposal[]>([]);
  const [screeningTitles, setScreeningTitles] = useState<Record<string, string>>({});
  const [proposalOptions, setProposalOptions] = useState<Record<string, RescheduleOption[]>>({});
  const [userInfo, setUserInfo] = useState<Record<string, UserInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingOptionId, setApprovingOptionId] = useState<string | null>(null);
  const [actingLogId, setActingLogId] = useState<string | null>(null);

  const fetchFeedback = useCallback(() => {
    fetch('/api/admin/feedback')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then((data: {
        supportLogs: SupportLog[];
        rescheduleProposals: RescheduleProposal[];
        screeningTitles?: Record<string, string>;
        proposalOptions?: Record<string, RescheduleOption[]>;
        userInfo?: Record<string, UserInfo>;
      }) => {
        setSupportLogs(data.supportLogs ?? []);
        setRescheduleProposals(data.rescheduleProposals ?? []);
        setScreeningTitles(data.screeningTitles ?? {});
        setProposalOptions(data.proposalOptions ?? {});
        setUserInfo(data.userInfo ?? {});
      })
      .catch(() => setError(t.common.loadFailed))
      .finally(() => setLoading(false));
  }, [t.common.loadFailed]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const approveOption = useCallback((optionId: string) => {
    setApprovingOptionId(optionId);
    fetch('/api/admin/reschedule/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionId }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((e) => Promise.reject(e));
        fetchFeedback();
      })
      .catch(() => {})
      .finally(() => setApprovingOptionId(null));
  }, [fetchFeedback]);

  const supportLogAction = useCallback((logId: string, action: 'fixed' | 'dismiss') => {
    setActingLogId(logId);
    fetch(`/api/admin/feedback/${logId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((e) => Promise.reject(e));
        fetchFeedback();
      })
      .catch(() => {})
      .finally(() => setActingLogId(null));
  }, [fetchFeedback]);

  const typeLabel = (type: string) => {
    const l = TYPE_LABELS[type];
    return l ? (isZh ? l.zh : l.en) : type;
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="font-mono text-[13px] text-[#888]">{t.common.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="font-mono text-[13px] text-[#f87171]">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 bg-[#0f0f0f]">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin"
          className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] hover:underline"
        >
          {t.admin.backToAdmin}
        </Link>
      </div>
      <h1 className="font-mono text-xl text-[#e8e4dc] mb-1">
        {t.admin.feedbackTitle}
      </h1>
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-6">
        {t.admin.feedbackSubtitle}
      </p>

      <section className="mb-8">
        <h2 className="font-mono text-[13px] text-[#e8c84a] mb-3">
          {t.admin.feedbackSupportLogs}
        </h2>
        {supportLogs.length === 0 ? (
          <p className="font-mono text-[11px] text-[#555]">{t.admin.feedbackNone}</p>
        ) : (
          <ul className="space-y-2">
            {supportLogs.map((log) => {
              const isOpen = !log.status || log.status === 'open';
              return (
                <li
                  key={log.id}
                  className={`border border-[#2a2a2a] p-3 font-mono text-[11px] ${isOpen ? 'bg-[#161616]' : 'bg-[#131313] opacity-85'}`}
                  style={{ borderRadius: 0 }}
                >
                  <span className="text-[#e8c84a]">{typeLabel(log.type)}</span>
                  {log.priority === 1 && (
                    <span className="ml-2 text-[#f87171]">{t.admin.feedbackPriority}</span>
                  )}
                  {!isOpen && (
                    <span className="ml-2 text-[#666] font-mono text-[10px]">
                      {log.status === 'fixed' ? t.admin.supportLogStatusFixed : t.admin.supportLogStatusDismissed}
                    </span>
                  )}
                  <span className="text-[#555] ml-2">
                    {new Date(log.created_at).toLocaleString(isZh ? 'zh-CN' : 'en-GB')}
                  </span>
                  {log.screening_id && (
                    <span className="block mt-1">
                      <Link
                        href={`/admin/screenings/${log.screening_id}`}
                        className="text-[#e8c84a] hover:underline"
                      >
                        {screeningTitles[log.screening_id] || `${t.admin.feedbackScreeningFallback} ${log.screening_id.slice(0, 8)}…`}
                      </Link>
                    </span>
                  )}
                  {log.user_id && (
                    <span className="block text-[#888] mt-0.5">
                      <span className="text-[#666] font-mono text-[10px]">{t.admin.userId}: </span>
                      <span className="font-mono break-all">{log.user_id}</span>
                      {(userInfo[log.user_id]?.display_name?.trim() || userInfo[log.user_id]?.wechat_id?.trim() || userInfo[log.user_id]?.email) && (
                        <span className="block mt-0.5 text-[#e8e4dc]">
                          {userInfo[log.user_id]?.display_name?.trim() && <span>{t.admin.userName}: {userInfo[log.user_id].display_name}</span>}
                          {userInfo[log.user_id]?.wechat_id?.trim() && <span className={userInfo[log.user_id]?.display_name?.trim() ? ' ml-3' : ''}>WeChat: {userInfo[log.user_id].wechat_id}</span>}
                          {userInfo[log.user_id]?.email && <span className="block mt-0.5 text-[10px]">{t.admin.userEmail}: {userInfo[log.user_id].email}</span>}
                        </span>
                      )}
                    </span>
                  )}
                  {log.message && <p className="mt-1 text-[#888]">{log.message}</p>}
                  {isOpen && (
                    <div className="mt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={() => supportLogAction(log.id, 'fixed')}
                        disabled={actingLogId !== null}
                        className="font-mono text-[10px] text-[#e8c84a] hover:underline disabled:opacity-50"
                      >
                        {actingLogId === log.id ? t.admin.feedbackProcessing : t.admin.supportLogFixed}
                      </button>
                      <button
                        type="button"
                        onClick={() => supportLogAction(log.id, 'dismiss')}
                        disabled={actingLogId !== null}
                        className="font-mono text-[10px] text-[#888] hover:underline disabled:opacity-50"
                      >
                        {actingLogId === log.id ? t.admin.feedbackProcessing : t.admin.supportLogDismiss}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-mono text-[13px] text-[#e8c84a] mb-3">
          {t.admin.feedbackReschedule}
        </h2>
        {rescheduleProposals.length === 0 ? (
          <p className="font-mono text-[11px] text-[#555]">{t.admin.feedbackNone}</p>
        ) : (
          <ul className="space-y-2">
            {rescheduleProposals.map((p) => (
              <li
                key={p.id}
                className="border border-[#2a2a2a] bg-[#161616] p-3 font-mono text-[11px]"
                style={{ borderRadius: 0 }}
              >
                <Link
                  href={`/admin/screenings/${p.screening_id}`}
                  className="text-[#e8c84a] hover:underline"
                >
                  {screeningTitles[p.screening_id] ?? `${t.admin.feedbackScreeningFallback} ${p.screening_id.slice(0, 8)}…`}
                </Link>
                <span className="text-[#555] ml-2">
                  {new Date(p.created_at).toLocaleString(isZh ? 'zh-CN' : 'en-GB')}
                </span>
                <span className="block text-[#888] mt-0.5">
                  <span className="text-[#666] font-mono text-[10px]">{t.admin.userId}: </span>
                  <span className="font-mono break-all">{p.created_by}</span>
                  {(userInfo[p.created_by]?.display_name?.trim() || userInfo[p.created_by]?.wechat_id?.trim() || userInfo[p.created_by]?.email) && (
                    <span className="block mt-0.5 text-[#e8e4dc]">
                      {userInfo[p.created_by]?.display_name?.trim() && <span>{t.admin.userName}: {userInfo[p.created_by].display_name}</span>}
                      {userInfo[p.created_by]?.wechat_id?.trim() && <span className={userInfo[p.created_by]?.display_name?.trim() ? ' ml-3' : ''}>WeChat: {userInfo[p.created_by].wechat_id}</span>}
                      {userInfo[p.created_by]?.email && <span className="block mt-0.5 text-[10px]">{t.admin.userEmail}: {userInfo[p.created_by].email}</span>}
                    </span>
                  )}
                </span>
                {(proposalOptions[p.id]?.length ?? 0) > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    <span className="text-[#888]">{t.admin.feedbackProposedTimes} </span>
                    {[...(proposalOptions[p.id] ?? [])]
                      .sort((a, b) => a.position - b.position)
                      .map((o) => (
                        <li key={o.id} className="flex items-center gap-2 flex-wrap">
                          <span className="text-[#e8e4dc]">{o.option_date} {o.time_slot}</span>
                          <button
                            type="button"
                            onClick={() => approveOption(o.id)}
                            disabled={approvingOptionId !== null}
                            className="font-mono text-[10px] text-[#e8c84a] hover:underline disabled:opacity-50"
                          >
                            {approvingOptionId === o.id ? t.admin.feedbackApproving : t.admin.feedbackApprove}
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
