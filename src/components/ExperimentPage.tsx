import { useMemo, useState } from 'react'
import type { FormEvent, MouseEvent } from 'react'
import type { ExperimentStatus } from '../data/mockData'
import { createExperimentRun, getNextRunId, resetExperimentRun, startExperimentRun, stopExperimentRun, usePrototypeState } from '../data/prototypeStore'
import { Icon } from './Icon'

type ExperimentPageProps = {
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, path: string) => void
}

type ExperimentForm = {
  scenarioId: string
  scenarioName: string
  targetService: string
  attackType: string
  durationMinutes: number
  targetDevice: string
  description: string
}

const defaultForm: ExperimentForm = {
  scenarioId: 'SCN-MQTT-01',
  scenarioName: 'MQTT Abuse',
  targetService: 'MQTT Broker',
  attackType: 'MQTT',
  durationMinutes: 5,
  targetDevice: 'ESP32-01',
  description: 'Observe MQTT topic discovery and unauthorized publish behavior.',
}

const workflowStages: ExperimentStatus[] = ['Preparing', 'Running', 'Collecting Trace', 'Processing', 'Completed']

function getStageIndex(status: ExperimentStatus) {
  if (status === 'Stopped' || status === 'Failed') return -1
  return workflowStages.indexOf(status)
}

function formatStartTime(startTime: string | null) {
  if (!startTime) return 'Not started'
  return `${new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Bangkok' }).format(new Date(startTime))} ICT`
}

function StatusBadge({ status }: { status: ExperimentStatus }) {
  const stateClass = status.toLowerCase().replaceAll(' ', '-')
  return <span className={`experiment-status-badge status-state-${stateClass}`}><i />{status}</span>
}

export function ExperimentPage({ onNavigate }: ExperimentPageProps) {
  const state = usePrototypeState()
  const [form, setForm] = useState(defaultForm)
  const [selectedRunId, setSelectedRunId] = useState(state.activeRunId)
  const [feedback, setFeedback] = useState('')
  const [showAllRuns, setShowAllRuns] = useState(false)
  const selectedRun = state.runs.find((run) => run.id === selectedRunId) ?? state.runs[0]
  const nextRunId = useMemo(() => getNextRunId(state), [state])
  const canStart = selectedRun.status === 'Preparing' || selectedRun.status === 'Stopped' || selectedRun.status === 'Failed'
  const canStop = ['Preparing', 'Running', 'Collecting Trace', 'Processing'].includes(selectedRun.status)

  function updateField<K extends keyof ExperimentForm>(key: K, value: ExperimentForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const scenarioName = form.scenarioName.trim()
    const run = createExperimentRun({
      scenarioId: form.scenarioId.trim(),
      scenarioName,
      scenario: scenarioName,
      kind: form.attackType === 'Normal Traffic' ? 'Normal' : 'Attack',
      targetService: form.targetService,
      attackType: form.attackType,
      durationMinutes: Number(form.durationMinutes),
      targetDevice: form.targetDevice.trim(),
      description: form.description.trim(),
    })
    setSelectedRunId(run.id)
    setFeedback(`${run.id} created and ready to start.`)
  }

  function handleStart() {
    startExperimentRun(selectedRun.id)
    setFeedback(`${selectedRun.id} started. Status will progress through the collection pipeline.`)
  }

  function handleStop() {
    stopExperimentRun(selectedRun.id)
    setFeedback(`${selectedRun.id} stopped. Collected trace data is preserved.`)
  }

  function handleReset() {
    resetExperimentRun(selectedRun.id)
    setFeedback(`${selectedRun.id} reset. Its run ID and scenario are retained; its collected artifacts were cleared.`)
  }

  const displayedRuns = showAllRuns ? [...state.runs].reverse() : [...state.runs].reverse().slice(0, 5)

  return <div className="experiment-page">
    <section className="experiment-intro"><div className="experiment-intro-icon"><Icon name="flask" size={20} /></div><div><div className="section-kicker">EXPERIMENT WORKSPACE</div><h2>Configure a research run</h2><p>Create an experiment, run the local lifecycle simulation, and keep trace artifacts linked to its Run ID.</p></div><div className="experiment-run-counter"><span>REGISTERED RUNS</span><strong>{state.runs.length}</strong></div></section>

    <div className="experiment-work-grid">
      <section className="dashboard-panel experiment-form-panel">
        <div className="experiment-panel-heading"><div><div className="section-kicker">NEW RUN CONFIGURATION</div><h2>Create experiment</h2><p>Run IDs are assigned from the shared experiment store.</p></div><span className="form-run-id"><small>RUN ID</small><strong>{nextRunId}</strong></span></div>
        <form className="experiment-form" onSubmit={handleCreate}>
          <div className="form-field"><label htmlFor="run-id">Run ID</label><div className="input-with-prefix"><span><Icon name="flask" size={14} /></span><input id="run-id" aria-label="Run ID" value={nextRunId} readOnly /></div><small>Assigned automatically to avoid duplicate runs.</small></div>
          <div className="form-field"><label htmlFor="scenario-id">Scenario ID <b>*</b></label><input id="scenario-id" value={form.scenarioId} onChange={(event) => updateField('scenarioId', event.target.value)} required /></div>
          <div className="form-field"><label htmlFor="scenario-name">Scenario Name <b>*</b></label><input id="scenario-name" value={form.scenarioName} onChange={(event) => updateField('scenarioName', event.target.value)} required /></div>
          <div className="form-field"><label htmlFor="target-service">Target Service <b>*</b></label><select id="target-service" value={form.targetService} onChange={(event) => updateField('targetService', event.target.value)} required><option>MQTT Broker</option><option>SSH Service</option><option>HTTP Honeypot</option><option>IoT Gateway</option></select></div>
          <div className="form-field"><label htmlFor="attack-type">Attack Type <b>*</b></label><select id="attack-type" value={form.attackType} onChange={(event) => updateField('attackType', event.target.value)} required><option>MQTT</option><option>Credential brute force</option><option>Service discovery</option><option>Topic enumeration</option><option>Normal Traffic</option></select></div>
          <div className="form-field"><label htmlFor="duration">Duration <b>*</b></label><div className="duration-input"><input id="duration" type="number" min="1" max="240" value={form.durationMinutes} onChange={(event) => updateField('durationMinutes', Number(event.target.value))} required /><span>minutes</span></div></div>
          <div className="form-field"><label htmlFor="target-device">Target Device <b>*</b></label><input id="target-device" value={form.targetDevice} onChange={(event) => updateField('targetDevice', event.target.value)} required /></div>
          <div className="form-field form-field-full"><label htmlFor="description">Description <b>*</b></label><textarea id="description" rows={3} value={form.description} onChange={(event) => updateField('description', event.target.value)} required /></div>
          <div className="form-actions"><span>Required fields <b>*</b></span><button className="button button-primary create-run-button" type="submit">Create Experiment <Icon name="arrow" size={14} /></button></div>
        </form>
        {feedback && <div className="experiment-feedback" role="status"><i />{feedback}</div>}
      </section>

      <section className="dashboard-panel run-detail-panel">
        <div className="experiment-panel-heading"><div><div className="section-kicker">SELECTED RUN</div><h2>Run detail</h2><p>Metrics and lifecycle status for the selected experiment.</p></div><StatusBadge status={selectedRun.status} /></div>
        <div className="run-detail-hero"><span className="run-avatar"><Icon name="flask" size={18} /></span><div><small>{selectedRun.scenarioId ?? 'SCENARIO'}</small><strong>{selectedRun.id}</strong><span>{selectedRun.scenarioName ?? selectedRun.scenario}</span></div></div>
        <div className="run-detail-fields"><div><small>SCENARIO</small><strong>{selectedRun.scenarioName ?? selectedRun.scenario}</strong></div><div><small>START TIME</small><strong>{formatStartTime(selectedRun.startTime)}</strong></div><div><small>DURATION</small><strong>{selectedRun.duration}</strong></div><div><small>TARGET</small><strong>{selectedRun.targetDevice ?? '—'} <span>·</span> {selectedRun.targetService ?? '—'}</strong></div></div>
        <div className="run-metric-grid"><div><span>EVENT COUNT</span><strong>{selectedRun.eventCount ?? 0}</strong></div><div><span>PACKET COUNT</span><strong>{selectedRun.packetCount ?? 0}</strong></div><div><span>SESSION COUNT</span><strong>{selectedRun.sessionCount ?? 0}</strong></div></div>
        <div className="run-lifecycle"><div className="run-lifecycle-title"><span>RUN LIFECYCLE</span>{selectedRun.status === 'Stopped' && <small>Manually stopped</small>}{selectedRun.status === 'Failed' && <small>Run failed</small>}</div><div className="lifecycle-track">{workflowStages.map((stage, index) => { const stageIndex = getStageIndex(selectedRun.status); const done = stageIndex > index || selectedRun.status === 'Completed'; const current = stage === selectedRun.status; return <div className={`lifecycle-stage ${done ? 'stage-done' : ''} ${current ? 'stage-current' : ''}`} key={stage}><span className="lifecycle-dot">{done ? '✓' : String(index + 1).padStart(2, '0')}</span><small>{stage}</small></div> })}</div></div>
        <div className="run-control-actions"><button type="button" className="button button-primary" onClick={handleStart} disabled={!canStart}>Start Experiment <Icon name="play" size={13} /></button><button type="button" className="button button-secondary" onClick={handleStop} disabled={!canStop}>Stop Experiment <span className="stop-square" /></button><button type="button" className="button button-quiet" onClick={handleReset}>Reset Experiment <Icon name="activity" size={13} /></button></div>
        <div className="run-link-actions"><a href="/attack-sessions" onClick={(event) => onNavigate(event, '/attack-sessions')}>Related sessions <Icon name="arrow" size={13} /></a><a href="/logs-traces" onClick={(event) => onNavigate(event, '/logs-traces')}>View traces <Icon name="arrow" size={13} /></a></div>
      </section>
    </div>

    <section className="dashboard-panel experiment-runs-panel"><div className="experiment-panel-heading"><div><div className="section-kicker">SHARED RUN REGISTRY</div><h2>Recent experiments</h2><p>Run IDs are the stable references used throughout the workflow.</p></div><button type="button" className="table-filter-button" onClick={() => setShowAllRuns((show) => !show)}>{showAllRuns ? 'Show recent' : 'All runs'} <Icon name="chevron" size={13} /></button></div>
      <div className="table-wrap dashboard-table-wrap experiment-runs-table-wrap"><table className="data-table experiment-runs-table"><thead><tr><th>Run ID</th><th>Scenario ID</th><th>Scenario</th><th>Target Service</th><th>Start Time</th><th>Duration</th><th>Status</th><th>Events</th></tr></thead><tbody>{displayedRuns.map((run) => <tr className={selectedRun.id === run.id ? 'selected-run-row' : ''} key={run.id} onClick={() => setSelectedRunId(run.id)}><td><button className="run-table-id" type="button" onClick={() => setSelectedRunId(run.id)}>{run.id}</button></td><td className="table-mono">{run.scenarioId ?? '—'}</td><td>{run.scenarioName ?? run.scenario}</td><td>{run.targetService ?? '—'}</td><td>{formatStartTime(run.startTime)}</td><td>{run.duration}</td><td><StatusBadge status={run.status} /></td><td>{run.eventCount ?? 0}</td></tr>)}</tbody></table></div>
    </section>
  </div>
}
