/**
 * Overview: public BuildOrbit landing page.
 * Owns the attention-grabbing first impression for unauthenticated users.
 */
import './Overview.css';

const PHASES = [
  ['01', 'Intent Gate', 'Locks scope before the agent writes code.'],
  ['02', 'Plan', 'Builds a traceable plan against the real request.'],
  ['03', 'Scaffold', 'Creates the structure only when the project needs it.'],
  ['04', 'Code', 'Applies focused implementation changes.'],
  ['05', 'Save', 'Stores artifacts, diffs, and provenance.'],
  ['06', 'Verify', 'Checks the result and feeds failures back into repair.'],
];

const PROOFS = [
  '6-phase pipeline',
  'Audit trail included',
  'GitHub-ready output',
  'Repo-aware execution',
];

const FEATURES = [
  {
    title: 'Agents that show their work',
    desc: 'Every run is split into inspectable phases, so users can see what was planned, changed, saved, and verified.',
  },
  {
    title: 'Built for real businesses',
    desc: 'BuildOrbit is designed for apps, dashboards, landing pages, tools, and business workflows that need more than a black-box prompt.',
  },
  {
    title: 'Professional output loop',
    desc: 'Prompt, build, inspect, refine, and ship from one product surface with persistent history and clear execution state.',
  },
];

export default function Overview() {
  return (
    <div className="ov-root">
      <header className="ov-nav">
        <a href="/overview" className="ov-brand" aria-label="BuildOrbit home">
          <span className="ov-brand-mark">BO</span>
          <span>BuildOrbit</span>
        </a>
        <nav className="ov-nav-links" aria-label="Landing navigation">
          <a href="#pipeline">Pipeline</a>
          <a href="#proof">Proof</a>
          <a href="/">Launch app</a>
        </nav>
      </header>

      <main>
        <section className="ov-hero">
          <div className="ov-hero-scene" aria-hidden="true">
            <div className="ov-grid-plane" />
            <div className="ov-orbit-loader">
              <span>BO</span>
            </div>
            <div className="ov-flow ov-flow-a" />
            <div className="ov-flow ov-flow-b" />
            <div className="ov-flow ov-flow-c" />
            <div className="ov-node ov-node-1">Plan</div>
            <div className="ov-node ov-node-2">Code</div>
            <div className="ov-node ov-node-3">Verify</div>
            <div className="ov-terminal">
              <span>buildorbit.run</span>
              <b>intent locked</b>
              <b>artifacts saved</b>
              <b>verification passed</b>
            </div>
          </div>

          <div className="ov-hero-content">
            <div className="ov-eyebrow">
              <span className="ov-live-dot" />
              Live autonomous app builder
            </div>
            <h1 className="ov-hero-title">BuildOrbit</h1>
            <p className="ov-hero-sub">
              Build apps with AI agents that plan, code, verify, and show their work.
            </p>
            <p className="ov-hero-body">
              A professional build platform for turning ideas into inspectable app runs, with every phase tracked from prompt to output.
            </p>
            <div className="ov-hero-actions">
              <a href="/" className="ov-cta-btn">Start building</a>
              <a href="#pipeline" className="ov-secondary-btn">See the pipeline</a>
            </div>
            <div className="ov-proof-row" aria-label="BuildOrbit highlights">
              {PROOFS.map((proof) => (
                <span key={proof}>{proof}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="ov-signal-strip" id="pipeline" aria-label="Pipeline phase overview">
          {PHASES.map(([num, name]) => (
            <div key={num} className="ov-signal-item">
              <span>{num}</span>
              <strong>{name}</strong>
            </div>
          ))}
        </section>

        <section className="ov-section ov-section-intro">
          <div className="ov-section-label">Why BuildOrbit</div>
          <h2 className="ov-section-heading">The landing page promises speed. The product proves control.</h2>
          <p className="ov-section-body">
            Users should feel the momentum immediately, then understand why BuildOrbit is different:
            it is not just a prompt box. It is a tracked execution system for building software with AI.
          </p>
        </section>

        <section className="ov-section ov-demo-section" id="demo">
          <div className="ov-section-label">Product demo</div>
          <h2 className="ov-section-heading">From prompt to finished app, with every step visible.</h2>
          <p className="ov-section-body">
            BuildOrbit turns a simple request into a traceable build run, then shows the result as a real product surface.
          </p>

          <div className="ov-demo-flow" aria-label="Prompt to pipeline to finished app demo">
            <article className="ov-demo-card ov-demo-prompt">
              <div className="ov-demo-card-top">
                <span className="ov-demo-step">01</span>
                <strong>Prompt</strong>
              </div>
              <div className="ov-demo-prompt-box">
                Build a client portal with project status, invoices, file sharing, and a polished dashboard.
              </div>
              <div className="ov-demo-prompt-meta">
                <span>Business app</span>
                <span>Dashboard</span>
                <span>Client workflow</span>
              </div>
            </article>

            <article className="ov-demo-card ov-demo-pipeline">
              <div className="ov-demo-card-top">
                <span className="ov-demo-step">02</span>
                <strong>Pipeline</strong>
              </div>
              <div className="ov-demo-track">
                {['Intent', 'Plan', 'Scaffold', 'Code', 'Save', 'Verify'].map((phase, index) => (
                  <div key={phase} className="ov-demo-phase" style={{ animationDelay: `${index * 120}ms` }}>
                    <span className="ov-demo-phase-dot" />
                    <span>{phase}</span>
                    <b>{index < 5 ? 'done' : 'passed'}</b>
                  </div>
                ))}
              </div>
            </article>

            <article className="ov-demo-card ov-demo-result">
              <div className="ov-demo-card-top">
                <span className="ov-demo-step">03</span>
                <strong>Finished app</strong>
              </div>
              <div className="ov-app-preview">
                <div className="ov-app-preview-top">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="ov-app-preview-body">
                  <div className="ov-app-sidebar">
                    <span className="active" />
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="ov-app-main">
                    <div className="ov-app-title" />
                    <div className="ov-app-metrics">
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="ov-app-table">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              </div>
              <div className="ov-demo-result-caption">
                Preview, inspect, refine, and ship from the same run.
              </div>
            </article>
          </div>
        </section>

        <section className="ov-section" id="proof">
          <div className="ov-section-label">Glass-box execution</div>
          <h2 className="ov-section-heading">Six phases. One visible build path.</h2>
          <div className="ov-phases-grid">
            {PHASES.map(([num, name, desc]) => (
              <article key={num} className="ov-phase-card">
                <span className="ov-phase-num">{num}</span>
                <h3>{name}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="ov-section">
          <div className="ov-section-label">Product advantage</div>
          <h2 className="ov-section-heading">A builder that feels fast without hiding the process.</h2>
          <div className="ov-features-grid">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="ov-feature-card">
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="ov-cta-section">
          <h2>Ready to launch a build?</h2>
          <p>Open BuildOrbit and start from a prompt. The pipeline will handle the rest.</p>
          <a href="/" className="ov-cta-btn ov-cta-btn-lg">Launch BuildOrbit</a>
        </section>
      </main>
    </div>
  );
}
