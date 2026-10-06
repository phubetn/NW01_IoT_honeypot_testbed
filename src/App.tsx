import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import { Dashboard } from './components/Dashboard'
import { ExperimentPage } from './components/ExperimentPage'
import { AttackerSimulationPage } from './components/AttackerSimulationPage'
import { Icon } from './components/Icon'
import { DatasetPage, EvaluationPage, MLAnalysisPage } from './components/EvaluationPages'
import { AttackSessionsPage, BehavioralAnalysisPage, BehaviorGeneratorPage, ConstraintValidatorIntakePage, LogsTracesPage, ReplayIntakePage } from './components/TraceWorkspacePages'
import { usePrototypeState } from './data/prototypeStore'
import './App.css'
import './Phase4.css'
import './Phase10.css'
import './Phase11.css'

type Module = { path: string; label: string; title: string; description: string; icon: string; group: string }

const modules: Module[] = [
  { path: '/', label: 'Dashboard', title: 'Dashboard', description: 'System overview and research workflow status.', icon: 'grid', group: 'WORKSPACE' },
  { path: '/experiment', label: 'Experiment', title: 'Experiment', description: 'Configure and manage honeypot research runs.', icon: 'flask', group: 'WORKSPACE' },
  { path: '/testbed', label: 'Honeypot / Testbed', title: 'Honeypot / Testbed', description: 'Inspect honeypot services and testbed readiness.', icon: 'cpu', group: 'COLLECT' },
  { path: '/attack-sessions', label: 'Attack Sessions', title: 'Attack Sessions', description: 'Review attacker activity grouped into sessions.', icon: 'sessions', group: 'COLLECT' },
  { path: '/attacker-simulation', label: 'Attacker Simulation', title: 'Attacker Simulation', description: 'Simulate attacker actions and capture trace-driven behavior.', icon: 'activity', group: 'COLLECT' },
  { path: '/logs-traces', label: 'Logs & Traces', title: 'Logs & Traces', description: 'Browse collected events and network traces.', icon: 'activity', group: 'COLLECT' },
  { path: '/behavioral-analysis', label: 'Behavioral Analysis', title: 'Behavioral Analysis', description: 'Explore behavioral sequences extracted from traces.', icon: 'analysis', group: 'ANALYZE' },
  { path: '/behavior-generator', label: 'Behavior Generator', title: 'Behavior Generator', description: 'Generate behavior from observed sequences.', icon: 'spark', group: 'ANALYZE' },
  { path: '/constraint-validator', label: 'Constraint Validator', title: 'Constraint Validator', description: 'Check generated sequences against behavior constraints.', icon: 'shield', group: 'ANALYZE' },
  { path: '/replay', label: 'Replay', title: 'Controlled Replay', description: 'Review and control validated behavior replays.', icon: 'play', group: 'ANALYZE' },
  { path: '/evaluation', label: 'Evaluation', title: 'Evaluation', description: 'Assess validity, similarity, diversity, and novelty.', icon: 'chart', group: 'ANALYZE' },
  { path: '/ml-analysis', label: 'ML Analysis', title: 'ML Analysis', description: 'Compare model utility across dataset configurations.', icon: 'brain', group: 'OUTPUT' },
  { path: '/dataset', label: 'Dataset', title: 'Dataset', description: 'Browse and export curated trace datasets.', icon: 'database', group: 'OUTPUT' },
  { path: '/system-settings', label: 'System Settings', title: 'System Settings', description: 'Manage prototype preferences and system configuration.', icon: 'settings', group: 'SYSTEM' },
]

const nextSteps: Record<string, { path: string; label: string }[]> = {
  '/': [{ path: '/experiment', label: 'Open Experiment' }],
  '/experiment': [{ path: '/logs-traces', label: 'View Logs & Traces' }],
  '/logs-traces': [{ path: '/behavioral-analysis', label: 'Open Behavioral Analysis' }],
}

function currentRoute() {
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  return modules.find((item) => item.path === path) ?? modules[0]
}

function App() {
  const [route, setRoute] = useState(currentRoute)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const prototype = usePrototypeState()

  useEffect(() => {
    const update = () => setRoute(currentRoute())
    window.addEventListener('popstate', update)
    return () => window.removeEventListener('popstate', update)
  }, [])

  function navigate(event: MouseEvent<HTMLAnchorElement>, path: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    window.history.pushState({}, '', path)
    setRoute(currentRoute())
    setNoticeOpen(false)
    setMobileNavOpen(false)
    window.scrollTo(0, 0)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <a className="brand" href="/" onClick={(event) => navigate(event, '/')} aria-label="IoT TraceLab home">
          <span className="brand-mark"><span /><span /><span /><span /></span>
          <span className="brand-copy"><strong>TraceLab</strong><small>IoT HONEYPOT FRAMEWORK</small></span>
        </a>
        <div className="sidebar-context"><span className="context-dot" /> RESEARCH WORKSPACE</div>
        <nav className="nav-list" aria-label="Main navigation">
          {['WORKSPACE', 'COLLECT', 'ANALYZE', 'OUTPUT', 'SYSTEM'].map((group) => (
            <div className="nav-group" key={group}>
              <div className="nav-heading">{group}</div>
              {modules.filter((item) => item.group === group).map((item) => (
                <a key={item.path} href={item.path} onClick={(event) => navigate(event, item.path)} className={`nav-link ${route.path === item.path ? 'active' : ''}`} aria-current={route.path === item.path ? 'page' : undefined}>
                  <Icon name={item.icon} /><span>{item.label}</span>{route.path === item.path && <span className="active-mark" />}
                </a>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer"><div className="version-indicator"><span className="live-dot" /> Prototype environment</div><span>v0.1.0 · LOCAL</span></div>
      </aside>

      {mobileNavOpen && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}

      <div className="main-column">
        <header className="topbar">
          <button className="icon-button menu-toggle" aria-label="Toggle navigation" onClick={() => setMobileNavOpen((open) => !open)}><span className="hamburger" /></button>
          <div className="project-crumb"><span>PROJECT</span><strong>IoT Honeypot &amp; Trace-Driven Behavior Generation</strong></div>
          <div className="topbar-right">
            <div className="system-status"><span className="live-dot" /> System operational</div>
            <div className="run-chip"><span>CURRENT RUN</span><strong>{prototype.activeRunId}</strong></div>
            <div className="notification-wrap">
              <button className={`icon-button notification-button ${noticeOpen ? 'selected' : ''}`} aria-label="Notifications" aria-expanded={noticeOpen} onClick={() => setNoticeOpen((open) => !open)}><Icon name="activity" size={18} /><i /></button>
              {noticeOpen && <div className="notification-popover"><strong>System notifications</strong><p><span className="live-dot" /> Prototype environment is ready.</p><small>No new alerts</small></div>}
            </div>
            <div className="user-profile"><span className="avatar">AD</span><span className="user-copy"><strong>Admin</strong><small>Researcher</small></span><span className="chevron">⌄</span></div>
          </div>
        </header>

        <main className="page-area">
          <div className="page-container">
            <div className="breadcrumb"><span>WORKSPACE</span><span className="crumb-divider">/</span><strong>{route.title.toUpperCase()}</strong></div>
            <div className="page-header">
              <div><div className="eyebrow"><span className="eyebrow-line" /> MODULE OVERVIEW</div><h1>{route.title}</h1><p>{route.description}</p></div>
              <div className="page-header-meta"><span className="module-code">MODULE</span><strong>{modules.indexOf(route) + 1 < 10 ? '0' : ''}{modules.indexOf(route) + 1} <i>/</i> {modules.length}</strong></div>
            </div>

            {route.path === '/' ? <Dashboard onNavigate={navigate} />
              : route.path === '/experiment' ? <ExperimentPage onNavigate={navigate} />
                : route.path === '/attacker-simulation' ? <AttackerSimulationPage onNavigate={navigate} />
                  : route.path === '/attack-sessions' ? <AttackSessionsPage onNavigate={navigate} />
                    : route.path === '/logs-traces' ? <LogsTracesPage onNavigate={navigate} />
                      : route.path === '/behavioral-analysis' ? <BehavioralAnalysisPage onNavigate={navigate} />
                        : route.path === '/behavior-generator' ? <BehaviorGeneratorPage onNavigate={navigate} />
                          : route.path === '/constraint-validator' ? <ConstraintValidatorIntakePage onNavigate={navigate} />
                            : route.path === '/replay' ? <ReplayIntakePage onNavigate={navigate} />
                              : route.path === '/evaluation' ? <EvaluationPage onNavigate={navigate} />
                                : route.path === '/ml-analysis' ? <MLAnalysisPage />
                                  : route.path === '/dataset' ? <DatasetPage />
                        : <ModulePlaceholder route={route} />}

            <footer className="page-footer"><span>TraceLab <b>·</b> IoT Honeypot Research Framework</span><span>LOCAL PROTOTYPE <i /> ALL SYSTEMS READY</span></footer>
          </div>
        </main>
      </div>
    </div>
  )
}

function ModulePlaceholder({ route }: { route: Module }) {
  const links = nextSteps[route.path] ?? []
  return <section className="placeholder-card card"><div className="placeholder-visual"><span className="placeholder-icon"><Icon name={route.icon} size={25} /></span><div className="placeholder-lines"><i /><i /><i /></div></div><div className="placeholder-content"><div className="section-kicker">CURRENT MODULE</div><h2>{route.title}</h2><p>{route.description}</p><div className="placeholder-note"><span className="info-mark">i</span><span>This module is ready for the next implementation phase. The application shell and navigation are active.</span></div>{links.length > 0 && <div className="module-next-links">{links.map((link) => <a className="button button-primary" href={link.path} key={link.path} onClick={(event) => {
    event.preventDefault(); window.history.pushState({}, '', link.path); window.dispatchEvent(new PopStateEvent('popstate'))
  }}>{link.label} <span>→</span></a>)}</div>}</div></section>
}

export default App
