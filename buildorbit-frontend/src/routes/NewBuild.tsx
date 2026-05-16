/**
 * NewBuild: build initiation page at /new.
 * Owns prompt input, optional GitHub repo selector, billing context, and launch.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  createPipeline,
  fetchGithubStatus,
  fetchGithubRepos,
  fetchBillingStatus,
} from '../lib/api';
import './NewBuild.css';

interface GithubRepo {
  full_name: string;
  name: string;
  default_branch: string;
}

const PHASES = [
  { phase: 'Intent Gate', desc: 'Classifies your prompt', color: 'var(--accent)' },
  { phase: 'Plan', desc: 'Generates a build spec', color: 'var(--planner)' },
  { phase: 'Scaffold', desc: 'Creates file structure', color: 'var(--builder)' },
  { phase: 'Code', desc: 'Writes implementation', color: 'var(--builder)' },
  { phase: 'Save', desc: 'Commits and pushes code', color: 'var(--qa)' },
  { phase: 'Verify', desc: 'Runs quality checks', color: 'var(--ops)' },
];

export default function NewBuild() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [githubConnected, setGithubConnected] = useState(false);
  const [githubLogin, setGithubLogin] = useState('');
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [sourceRepo, setSourceRepo] = useState('');

  const [credits, setCredits] = useState<number | null>(null);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    if (searchParams.get('github_connected') === '1') {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    fetchGithubStatus()
      .then((data) => {
        if (data.connected) {
          setGithubConnected(true);
          setGithubLogin(data.login ?? '');
          return fetchGithubRepos();
        }
        return null;
      })
      .then((data) => {
        if (data?.repos) setRepos(data.repos as GithubRepo[]);
      })
      .catch(() => { /* GitHub not connected is fine */ });

    fetchBillingStatus()
      .then((data) => {
        if (data.success) {
          setCredits(data.task_credits ?? 0);
          setIsPro(data.subscription_status === 'active' || data.is_admin);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = useCallback(async () => {
    const text = prompt.trim();
    if (!text) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const opts: Record<string, unknown> = {};
      if (selectedRepo) opts.github_repo = selectedRepo;
      if (sourceRepo) opts.source_repo = sourceRepo;
      const data = await createPipeline(text, opts);
      if (data.id) navigate(`/run/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start build.');
      setIsSubmitting(false);
    }
  }, [prompt, selectedRepo, sourceRepo, navigate]);

  return (
    <div className="page-newbuild">
      <div className="nb-orbital" aria-hidden="true">
        <div className="nb-ring nb-ring-1" />
        <div className="nb-ring nb-ring-2" />
      </div>

      <main className="nb-content">
        <header className="nb-header">
          <div className="nb-brand-row">
            <span className="nb-brand-mark">BO</span>
            <span>BuildOrbit builder</span>
          </div>
          <h1 className="nb-title">Start a new build</h1>
          <p className="nb-subtitle">
            Describe the product, tool, page, or workflow you want. BuildOrbit turns the prompt into a tracked pipeline run.
          </p>
        </header>

        {credits !== null && (
          <div className="nb-credits">
            <span className="nb-credits-dot" />
            <span>
              {isPro ? 'Pro' : 'Trial'} / {credits} credit{credits !== 1 ? 's' : ''} remaining
            </span>
          </div>
        )}

        <section className="nb-card">
          <label className="nb-label" htmlFor="nb-prompt">What should BuildOrbit create?</label>
          <textarea
            id="nb-prompt"
            className="nb-textarea"
            placeholder="Example: Build a professional SaaS dashboard with a prompt box, project history, billing status, and smooth loading animation."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
            rows={6}
            autoFocus
          />
          <div className="nb-hint">Cmd/Ctrl + Enter to launch</div>

          {githubConnected && (
            <div className="nb-github-section">
              <div className="nb-github-header">
                <span className="nb-github-dot" />
                <span>GitHub connected as <strong>{githubLogin}</strong></span>
              </div>

              <div className="nb-github-fields">
                <div className="nb-field">
                  <label className="nb-field-label" htmlFor="nb-push-repo">Push to repo (optional)</label>
                  <select
                    id="nb-push-repo"
                    className="nb-select"
                    value={selectedRepo}
                    onChange={e => setSelectedRepo(e.target.value)}
                  >
                    <option value="">None - hosted on BuildOrbit</option>
                    {repos.map(r => (
                      <option key={r.full_name} value={r.full_name}>{r.full_name}</option>
                    ))}
                  </select>
                </div>

                <div className="nb-field">
                  <label className="nb-field-label" htmlFor="nb-source-repo">Source repo (optional)</label>
                  <select
                    id="nb-source-repo"
                    className="nb-select"
                    value={sourceRepo}
                    onChange={e => setSourceRepo(e.target.value)}
                  >
                    <option value="">No source repo</option>
                    {repos.map(r => (
                      <option key={r.full_name} value={r.full_name}>{r.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {!githubConnected && (
            <div className="nb-github-connect">
              <a href="/auth/github" className="nb-github-connect-link">
                Connect GitHub
              </a>
              <span className="nb-github-connect-hint">Optional. Auto-push builds to a repo when connected.</span>
            </div>
          )}

          {error && <div className="nb-error">{error}</div>}

          <button
            className="nb-submit"
            onClick={handleSubmit}
            disabled={!prompt.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="bo-brand-loader nb-submit-loader" />
                Launching pipeline...
              </>
            ) : (
              'Start Build'
            )}
          </button>
        </section>

        <section className="nb-phases" aria-label="BuildOrbit pipeline phases">
          <div className="nb-phases-title">6-phase pipeline</div>
          <div className="nb-phases-grid">
            {PHASES.map((p, index) => (
              <div key={p.phase} className="nb-phase-item" style={{ animationDelay: `${index * 45}ms` }}>
                <div className="nb-phase-dot" style={{ background: p.color }} />
                <div>
                  <div className="nb-phase-name">{p.phase}</div>
                  <div className="nb-phase-desc">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
