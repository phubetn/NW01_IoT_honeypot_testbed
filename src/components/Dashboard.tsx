import type { MouseEvent } from 'react'
import { getActiveRun, getExperimentSummary, runFullDemo, usePrototypeState } from '../data/prototypeStore'
import type { EvaluationMetric, ServiceStatus } from '../data/mockData'
import { Icon } from './Icon'

type DashboardProps = {
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, path: string) => void
}

function SectionHeading({ kicker, title, description, action, onNavigate }: { kicker: string; title: string; description?: string; action?: { label: string; path: string }; onNavigate?: DashboardProps['onNavigate'] }) {
  return <div className="dashboard-section-heading"><div><div className="section-kicker">{kicker}</div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action && <a className="text-link" href={action.path} onClick={onNavigate ? (event) => onNavigate(event, action.path) : undefined}>{action.label}<Icon name="arrow" size={14} /></a>}</div>
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}><span className="status-indicator" />{status}</span>
}

function SessionStatus({ status }: { status: string }) {
  const className = status === 'Active' ? 'badge-active' : status === 'Flagged' ? 'badge-warning' : 'badge-complete'
  return <span className={`table-badge ${className}`}><i />{status}</span>
}

function MetricCard({ metric, onNavigate }: { metric: EvaluationMetric; onNavigate: DashboardProps['onNavigate'] }) {
  return <a className="evaluation-metric" href="/evaluation" onClick={(event) => onNavigate(event, '/evaluation')}><div className="metric-label">{metric.label}<Icon name="arrow" size={13} /></div><strong>{metric.value}</strong><span>{metric.detail}</span><div className="metric-track"><i style={{ width: `${metric.score}%` }} /></div></a>
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const state = usePrototypeState()
  const activeRun = getActiveRun(state)
  const experimentSummary = getExperimentSummary(state)
  const activeStartTime = activeRun.startTime ? `${new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Bangkok' }).format(new Date(activeRun.startTime))} ICT` : 'Not started'
  const sourceLabel = activeRun.source.replace('_', ' ')
  const runIsActive = ['Preparing', 'Running', 'Collecting Trace', 'Processing'].includes(activeRun.status)
  const latestEvaluation = state.evaluationResults.at(-1)
  const demoRunning = state.demo.status === 'Running'
  return <div className="dashboard-content">
    <section className={`full-demo-banner ${demoRunning ? 'full-demo-running' : state.demo.status === 'Completed' ? 'full-demo-complete' : ''}`}><div className="full-demo-copy"><span className="section-kicker">END-TO-END WORKFLOW</span><strong>Full Demo Mode</strong><small>{state.demo.step}</small>{state.demo.error && <small className="full-demo-error">{state.demo.error}</small>}</div><button type="button" className="button button-primary" disabled={demoRunning} onClick={() => void runFullDemo()}><Icon name={demoRunning ? 'activity' : 'play'} size={13} />{demoRunning ? 'Demo Running…' : state.demo.status === 'Completed' ? 'Run Full Demo Again' : 'Run Full Demo'}</button></section>
    <section className="dashboard-panel system-panel">
      <SectionHeading kicker="INFRASTRUCTURE" title="System status" description="Live readiness across the research environment." />
      <div className="system-grid">{state.systems.map((service) => <div className="system-card" key={service.id}><div className="system-card-top"><span className={`system-icon system-icon-${service.status.toLowerCase()}`}><Icon name={service.id === 'mqtt' ? 'activity' : service.id === 'database' ? 'database' : service.id === 'generator' ? 'spark' : service.id === 'replay' ? 'play' : service.id === 'nodes' ? 'cpu' : service.id === 'gateway' ? 'analysis' : 'shield'} size={16} /></span><StatusBadge status={service.status} /></div><strong>{service.name}</strong><span>{service.detail}</span></div>)}</div>
    </section>

    <section className="summary-grid" aria-label="Experiment summary">
      {[{ label: 'Total Runs', value: experimentSummary.totalRuns, icon: 'flask', tone: 'blue' }, { label: 'Attack Runs', value: experimentSummary.attackRuns, icon: 'activity', tone: 'orange' }, { label: 'Normal Runs', value: experimentSummary.normalRuns, icon: 'cpu', tone: 'green' }, { label: 'Active Run', value: experimentSummary.activeRuns, icon: 'play', tone: 'violet' }, { label: 'Completed Runs', value: experimentSummary.completedRuns, icon: 'chart', tone: 'slate' }].map((item) => <a key={item.label} className="summary-card" href="/experiment" onClick={(event) => onNavigate(event, '/experiment')}><span className={`summary-icon summary-${item.tone}`}><Icon name={item.icon} size={16} /></span><span className="summary-label">{item.label}</span><strong>{item.value}</strong><span className="summary-detail">View experiment <Icon name="chevron" size={13} /></span></a>)}
    </section>

    <section className="current-experiment dashboard-panel">
      <div className="current-experiment-heading"><SectionHeading kicker={runIsActive ? 'RUN IN PROGRESS' : 'LATEST RUN'} title="Current experiment" description="Live context for the selected research run." /><a className="button button-primary dashboard-button" href="/experiment" onClick={(event) => onNavigate(event, '/experiment')}>Open run <Icon name="arrow" size={14} /></a></div>
      <a className="experiment-run-card" href="/experiment" onClick={(event) => onNavigate(event, '/experiment')}>
        <div className="experiment-run-id"><span className="run-avatar"><Icon name="flask" size={18} /></span><span><small>RUN ID</small><strong>{activeRun.id}</strong></span><span className={`experiment-status-badge status-state-${activeRun.status.toLowerCase().replaceAll(' ', '-')}`}><i />{activeRun.status}</span></div>
        <div className="experiment-field"><small>SCENARIO</small><strong>{activeRun.scenarioName ?? activeRun.scenario}</strong></div>
        <div className="experiment-field"><small>START TIME</small><strong>{activeStartTime}</strong></div>
        <div className="experiment-field"><small>DURATION</small><strong><Icon name="clock" size={13} />{activeRun.duration}</strong></div>
        <div className="experiment-field"><small>SOURCE</small><strong><span className="source-indicator" />{sourceLabel}</strong></div>
        <span className="experiment-open-icon"><Icon name="arrow" size={16} /></span>
      </a>
    </section>

    <section className="dashboard-panel pipeline-panel">
      <SectionHeading kicker="END-TO-END TRACE WORKFLOW" title="Research pipeline" description="Select a stage to open its workspace." />
      <div className="pipeline-scroll"><div className="pipeline-flow">{state.pipeline.map((node, index) => <div className="pipeline-item" key={node.id}><a className={`pipeline-node ${node.id === 'evaluation' ? 'pipeline-node-final' : ''}`} href={node.path} onClick={(event) => onNavigate(event, node.path)}><span className="pipeline-node-index">{String(index + 1).padStart(2, '0')}</span><span className="pipeline-node-icon"><Icon name={node.id === 'attacker' ? 'sessions' : node.id === 'honeypot' ? 'shield' : node.id === 'collection' ? 'activity' : node.id === 'processing' ? 'cpu' : node.id === 'analysis' ? 'analysis' : node.id === 'generator' ? 'spark' : node.id === 'validator' ? 'shield' : node.id === 'replay' ? 'play' : 'chart'} size={17} /></span><strong>{node.label}</strong><span className="pipeline-open">Open module <Icon name="arrow" size={11} /></span></a>{index < state.pipeline.length - 1 && <span className="pipeline-connector"><i /></span>}</div>)}</div></div>
      <div className="pipeline-caption"><span><i className="pipeline-caption-dot" />Observed behavior flows through generation and controlled replay.</span><a href="/behavioral-analysis" onClick={(event) => onNavigate(event, '/behavioral-analysis')}>View workflow details <Icon name="arrow" size={13} /></a></div>
    </section>

    <section className="dashboard-data-grid">
      <div className="dashboard-panel data-panel"><SectionHeading kicker="LATEST ACTIVITY" title="Recent attack sessions" action={{ label: 'All sessions', path: '/attack-sessions' }} onNavigate={onNavigate} />
        <div className="table-wrap dashboard-table-wrap"><table className="data-table dashboard-table"><thead><tr><th>Session ID</th><th>Run ID</th><th>Source IP</th><th>Target</th><th>Service</th><th>Attack Type</th><th>Status</th></tr></thead><tbody>{state.sessions.map((session) => <tr key={session.id}><td><a className="table-primary-link" href="/attack-sessions" onClick={(event) => onNavigate(event, '/attack-sessions')}>{session.id}<Icon name="arrow" size={12} /></a></td><td><a className="table-mono-link" href="/experiment" onClick={(event) => onNavigate(event, '/experiment')}>{session.runId}</a></td><td className="table-mono">{session.sourceIp}</td><td>{session.target}</td><td><span className="service-chip">{session.service}</span></td><td>{session.attackType}</td><td><SessionStatus status={session.status} /></td></tr>)}</tbody></table></div>
      </div>
      <div className="dashboard-panel data-panel generated-panel"><SectionHeading kicker="TRACE-DRIVEN OUTPUT" title="Recent generated behaviors" action={{ label: 'Generator', path: '/behavior-generator' }} onNavigate={onNavigate} />
        <div className="table-wrap dashboard-table-wrap"><table className="data-table generated-table"><thead><tr><th>Generation ID</th><th>Source Session</th><th>Mode</th><th>Validation</th><th>Replay</th></tr></thead><tbody>{state.generatedBehaviors.map((behavior) => <tr key={behavior.id}><td><a className="table-primary-link" href="/behavior-generator" onClick={(event) => onNavigate(event, '/behavior-generator')}>{behavior.id}<Icon name="arrow" size={12} /></a></td><td><a className="table-mono-link" href="/attack-sessions" onClick={(event) => onNavigate(event, '/attack-sessions')}>{behavior.sourceSessionId}</a></td><td><span className="generator-mode">{behavior.generatorMode}</span></td><td><span className={`validation-pill ${behavior.validation === 'Passed' ? 'validation-passed' : behavior.validation === 'Rejected' ? 'validation-rejected' : 'validation-pending'}`}><i />{behavior.validation}</span></td><td><span className="replay-text">{behavior.replayStatus}</span></td></tr>)}</tbody></table>{!state.generatedBehaviors.length && <div className="trace-empty-inline">No generated behaviors yet. Extract a sequence and use the generator.</div>}</div>
      </div>
    </section>

    <section className="dashboard-panel evaluation-panel"><div className="evaluation-heading"><SectionHeading kicker="QUALITY & MODEL READINESS" title="Evaluation summary" description="Latest evaluation for generated behavior from the observed session set." /><a className="evaluation-run-link" href="/evaluation" onClick={(event) => onNavigate(event, '/evaluation')}><span><small>EVALUATION RUN</small><strong>{latestEvaluation?.id ?? 'Awaiting data'}</strong></span><Icon name="arrow" size={15} /></a></div><div className="evaluation-grid">{state.evaluation.map((metric) => <MetricCard key={metric.id} metric={metric} onNavigate={onNavigate} />)}</div><div className="evaluation-footnote"><span><i />{latestEvaluation ? `Based on ${latestEvaluation.generatedCount} generated actions · ${latestEvaluation.replayCount} replay traces` : 'Run a validated replay to create Evaluation Data'}</span><a href="/ml-analysis" onClick={(event) => onNavigate(event, '/ml-analysis')}>Compare ML utility <Icon name="arrow" size={13} /></a></div></section>
  </div>
}
