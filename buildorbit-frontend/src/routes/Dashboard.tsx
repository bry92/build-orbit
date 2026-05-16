/**
 * Dashboard: BuildOrbit command workspace.
 * Owns stat cards, intent pills, recent runs, billing prompts, and build modals.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchDashboard,
  fetchBillingStatus,
  startBillingCheckout,
  activateSubscription,
  getBillingPortal,
  deleteAllBuilds,
  createPipeline,
  type DashboardStats,
  type RecentRun,
} from '../lib/api';
import { fmtDuration, fmtTime } from '../lib/utils';
import './Dashboard.css';

const INTENT_MAP: Record<string, { label: string; cls: string; color: string }> = {
  static_surface: { label: 'Static', cls: 'intent-static', color: 'var(--accent)' },
  light_app: { label: 'Light App', cls: 'intent-light', color: 'var(--success)' },
  soft_expansion: { label: 'Adaptive', cls: 'intent-soft', color: 'var(--warning)' },
  full_product: { label: 'Full Product', cls: 'intent-full', color: '#a78bfa' },
};

const STATUS_LABELS: Record<string, string> = {
  completed: 'Completed',
  partial_success: 'Partial',
  failed: 'Failed',
  running: 'Running',
  in_progress: 'Running',
  pending: 'Pending',
  queued: 'Queued',
};

function StatusBadge({ status }: { status: string }) {
  const cls = `drs-status status-${status || 'pending'}`;
  const label = STATUS_LABELS[status] ?? status ?? 'N/A';
  return (
    <span className={cls}>
      <span className="drs-dot" />
      {label}
    </span>
  );
}

function IntentBadge({ ic }: { ic?: string | null }) {
  if (!ic) return <span className="intent-badge intent-unknown">N/A</span>;
  const m = INTENT_MAP[ic] ?? { label: ic, cls: 'intent-unknown', color: 'var(--text-dim)' };
  return <span className={`intent-badge ${m.cls}`}>{m.label}</span>;
}

function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  return { toast, showToast };
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [totalBuilds, setTotalBuilds] = useState(0);
  const [intentDist, setIntentDist] = useState<Record<string, number>>({});

  const [isPro, setIsPro] = useState(false);
  const [credits, setCredits] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPlanBadge, setShowPlanBadge] = useState(false);
  const [showUpgradeBtn, setShowUpgradeBtn] = useState(false);
  const [showManageBtn, setShowManageBtn] = useState(false);
  const [showTrialBanner, setShowTrialBanner] = useState(false);
  const [trialCreditsLeft, setTrialCreditsLeft] = useState(0);

  const [showRunModal, setShowRunModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const { toast, showToast } = useToast();

  const loadDashboard = useCallback(async () => {
    try {
      const data = await fetchDashboard();
      if (!data.success) return;
      setStats(data.stats);
      setTotalBuilds(data.stats.total_builds ?? 0);
      setIntentDist(data.stats.intent_distribution ?? {});
      setRecentRuns(data.recent_runs ?? []);
    } catch { /* non-fatal */ }
  }, []);

  const loadBilling = useCallback(async () => {
    try {
      const data = await fetchBillingStatus();
      if (!data.success) return;
      const c = data.task_credits ?? 0;
      const pro = data.subscription_status === 'active' || data.is_admin;
      setCredits(c);
      setIsPro(pro);
      setIsAdmin(data.is_admin);
      setShowPlanBadge(true);
      setShowUpgradeBtn(!pro);
      setShowManageBtn(pro);
      if (!pro) setTrialCreditsLeft(c);
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscription') === 'active') {
      activateSubscription().catch(() => { /* non-fatal */ });
      window.history.replaceState({}, '', window.location.pathname);
      showToast("You're now on BuildOrbit Pro.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isPro && totalBuilds >= 3) setShowTrialBanner(true);
  }, [isPro, totalBuilds]);

  useEffect(() => {
    loadDashboard();
    loadBilling();
    const interval = setInterval(loadDashboard, 5000);
    return () => clearInterval(interval);
  }, [loadDashboard, loadBilling]);

  const submitRun = useCallback(async () => {
    const text = prompt.trim();
    if (!text) return;
    setIsSubmitting(true);
    try {
      const data = await createPipeline(text);
      if (data.id) window.location.href = `/run/${data.id}`;
    } catch (err) {
      setIsSubmitting(false);
      alert(err instanceof Error ? err.message : 'Failed to start build.');
    }
  }, [prompt]);

  const handleManageSubscription = useCallback(async () => {
    try {
      const data = await getBillingPortal();
      if (data.url) window.location.href = data.url;
    } catch { alert('Could not open billing portal. Please try again.'); }
  }, []);

  const handleCheckout = useCallback(async () => {
    setIsCheckoutLoading(true);
    try {
      const data = await startBillingCheckout();
      if (data.url) window.location.href = data.url;
    } catch {
      setIsCheckoutLoading(false);
      alert('Could not start checkout. Please try again.');
    }
  }, []);

  const confirmClearAll = useCallback(async () => {
    setIsClearing(true);
    try {
      const data = await deleteAllBuilds();
      setShowClearAllModal(false);
      if (data.success) {
        showToast(`Deleted ${data.deleted} build${data.deleted !== 1 ? 's' : ''}.`);
        setTotalBuilds(0);
        setRecentRuns([]);
        setStats(null);
        setIntentDist({});
      }
    } catch (err) {
      setShowClearAllModal(false);
      alert(err instanceof Error ? err.message : 'Failed to delete builds.');
    } finally {
      setIsClearing(false);
    }
  }, [showToast]);

  const running = stats?.running ?? 0;
  const intentEntries = Object.entries(intentDist).filter(([, v]) => v > 0);

  return (
    <div className="page-dashboard">
      <div className="cloud-bg" aria-hidden="true">
        <div className="cloud-layer-1" />
        <div className="cloud-layer-2" />
        <div className="cloud-layer-3" />
      </div>

      <main className="dash-hero" id="dash-hero">
        <section className="dash-hero-top">
          <div className="dash-hero-greeting">
            <div className="dash-kicker">
              <span className="dash-kicker-mark">BO</span>
              BuildOrbit workspace
            </div>
            <h1 className="dash-hero-title">Command Center</h1>
            <p className="dash-hero-subtitle">Plan, build, verify, and deploy from one clear pipeline view.</p>
          </div>

          <div className="dash-hero-actions">
            <div className="dash-system-status">
              <div className={`dss-dot${running > 0 ? ' running' : ' idle'}`} />
              <span>
                {running > 0
                  ? `${running} build${running > 1 ? 's' : ''} running`
                  : 'Pipeline idle'}
              </span>
            </div>

            {showPlanBadge && (
              <div className="plan-badge">
                <span className="plan-credits-badge">
                  {isAdmin ? 'Unlimited credits' : `${credits} credits`}
                </span>
                {showUpgradeBtn && (
                  <button className="plan-link-btn" onClick={() => setShowUpgradeModal(true)}>
                    Upgrade
                  </button>
                )}
                {showManageBtn && (
                  <button className="plan-link-btn" onClick={handleManageSubscription}>
                    Manage plan
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="dash-stat-grid" id="dash-stat-grid" aria-label="Build metrics">
          <div className="dash-stat-card">
            <div className="dsc-label">Total Builds</div>
            <div className="dsc-value">{stats?.total_builds ?? '-'}</div>
            <div className="dsc-sub">{totalBuilds === 1 ? '1 build all time' : `${totalBuilds} builds all time`}</div>
          </div>
          <div className="dash-stat-card success">
            <div className="dsc-label">Success Rate</div>
            <div className="dsc-value dsc-success">
              {stats && stats.total_builds > 0 ? `${stats.success_rate}%` : '-'}
            </div>
            <div className="dsc-sub">{stats?.completed ?? 0} completed</div>
          </div>
          <div className="dash-stat-card accent">
            <div className="dsc-label">Avg Build Time</div>
            <div className="dsc-value dsc-accent">{fmtDuration(stats?.avg_duration_seconds)}</div>
            <div className="dsc-sub">per completed run</div>
          </div>
          <div className={`dash-stat-card live${running > 0 ? ' active' : ''}`}>
            <div className="dsc-label">Active Now</div>
            <div className="dsc-value dsc-live">{running}</div>
            <div className="dsc-sub">{running > 0 ? 'pipeline active' : 'ready'}</div>
          </div>
        </section>

        {showTrialBanner && !isPro && (
          <section className="trial-upgrade-banner">
            <div className="tub-left">
              <span className="tub-icon">BO</span>
              <div>
                <div className="tub-title">
                  You've built {totalBuilds} projects. Unlock higher build volume.
                </div>
                <div className="tub-sub">
                  Pro includes priority queueing, GitHub auto-push, custom domains, and {trialCreditsLeft} trial credits remaining.
                </div>
              </div>
            </div>
            <div className="tub-right">
              <Link to="/pricing" className="tub-cta">View Pro plan</Link>
              <button className="tub-dismiss" onClick={() => setShowTrialBanner(false)}>Close</button>
            </div>
          </section>
        )}

        <section className="dash-hero-body">
          {intentEntries.length > 0 && (
            <div className="dash-intent-section">
              <div className="dis-label">Intent distribution</div>
              <div className="dis-pills">
                {intentEntries.map(([ic, count]) => {
                  const m = INTENT_MAP[ic] ?? { label: ic, color: 'var(--text-muted)' };
                  return (
                    <span
                      key={ic}
                      className="dis-pill"
                      style={{
                        borderColor: `${m.color}33`,
                        color: m.color,
                        background: `${m.color}14`,
                      }}
                    >
                      {m.label} <b>{count}</b>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="dash-recent-section">
            <div className="drs-header">
              <div>
                <h2>Recent Builds</h2>
                <p>Latest pipeline activity across this workspace.</p>
              </div>
              <div className="drs-actions">
                {totalBuilds > 0 && (
                  <button
                    className="drs-clear-all-btn"
                    onClick={() => setShowClearAllModal(true)}
                    title="Delete all builds permanently"
                  >
                    Clear all
                  </button>
                )}
                <Link to="/history" className="drs-view-all">View all</Link>
              </div>
            </div>
            <div className="drs-list">
              {recentRuns.length === 0 ? (
                <div className="drs-empty">
                  <div className="bo-brand-loader" />
                  <div className="drs-empty-title">No builds yet</div>
                  <div className="drs-empty-sub">Launch your first BuildOrbit pipeline to see results here.</div>
                  <Link to="/new" className="drs-empty-cta">New Build</Link>
                </div>
              ) : (
                recentRuns.map(r => {
                  const ptext = r.prompt ? r.prompt.slice(0, 80) + (r.prompt.length > 80 ? '...' : '') : 'Untitled';
                  return (
                    <Link key={r.id} to={`/run/${r.id}`} className="drs-item">
                      <div className="drs-item-left">
                        <StatusBadge status={r.status} />
                        <span className="drs-prompt">{ptext}</span>
                      </div>
                      <div className="drs-item-right">
                        <IntentBadge ic={r.intent_class} />
                        <span className="drs-duration">{fmtDuration(r.duration_s)}</span>
                        <span className="drs-time">{fmtTime(r.created_at)}</span>
                        <span className="drs-arrow">Open</span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </main>

      {showRunModal && (
        <div className="modal-overlay visible" onClick={e => { if (e.target === e.currentTarget) setShowRunModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h2>New Build</h2>
              <button className="modal-close" onClick={() => setShowRunModal(false)}>Close</button>
            </div>
            <div className="modal-body">
              <textarea
                placeholder="Describe what you want to build..."
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) submitRun(); }}
                autoFocus
              />
              <button
                id="submit-run-btn"
                onClick={submitRun}
                disabled={!prompt.trim() || isSubmitting}
                style={{ marginTop: 12, width: '100%' }}
              >
                {isSubmitting ? 'Launching...' : 'Start Build'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpgradeModal && (
        <div className="modal-overlay visible" onClick={e => { if (e.target === e.currentTarget) setShowUpgradeModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h2>BuildOrbit Pro</h2>
              <button className="modal-close" onClick={() => setShowUpgradeModal(false)}>Close</button>
            </div>
            <div className="upgrade-modal-body">
              <div className="upgrade-price">$49<span>/month</span></div>
              <p>Daily autonomous build cycles for higher-volume product work.</p>
              <ul className="upgrade-features">
                <li><span>OK</span> Daily autonomous build cycles</li>
                <li><span>OK</span> <strong>10 bonus credits</strong> on signup</li>
                <li><span>OK</span> 5 renewal credits every month</li>
                <li><span>OK</span> Plan, build, verify, and deploy automation</li>
              </ul>
              <button
                className="upgrade-checkout-btn"
                onClick={handleCheckout}
                disabled={isCheckoutLoading}
              >
                {isCheckoutLoading ? 'Redirecting...' : 'Subscribe for $49/month'}
              </button>
              <p className="upgrade-footer">Secured by Stripe. Cancel any time.</p>
            </div>
          </div>
        </div>
      )}

      {showClearAllModal && (
        <div className="modal-overlay visible" onClick={e => { if (e.target === e.currentTarget) setShowClearAllModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h2>Clear All Builds</h2>
              <button className="modal-close" onClick={() => setShowClearAllModal(false)}>Close</button>
            </div>
            <div className="confirm-modal-body">
              <span className="confirm-modal-count">{totalBuilds} build{totalBuilds !== 1 ? 's' : ''}</span>
              <p>
                This will permanently delete all your builds and their execution data.
                <br />
                This action <strong>cannot be undone</strong>.
              </p>
              <button
                className="modal-danger-btn"
                onClick={confirmClearAll}
                disabled={isClearing}
              >
                {isClearing ? 'Deleting...' : 'Delete all builds'}
              </button>
              <button className="modal-cancel-btn" onClick={() => setShowClearAllModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="bo-toast visible">{toast}</div>}
    </div>
  );
}
