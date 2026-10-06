import { useState } from 'react'
import type { MouseEvent } from 'react'
import type { SimulationProtocol } from '../data/mockData'
import { clearAttackerSimulation, pauseAttackerSimulation, recordAttackerAction, resumeAttackerSimulation, startAttackerSimulation, stopAttackerSimulation, usePrototypeState } from '../data/prototypeStore'
import { Icon } from './Icon'

type AttackerSimulationPageProps = {
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, path: string) => void
}

const protocols: SimulationProtocol[] = ['Web', 'SSH', 'MQTT']
const devices = ['ESP32-01', 'ESP32-02', 'ESP32-03']

type SimulationAction = { id: string; label: string; primitive: string; description: string; icon: string; result: string; protocols: readonly SimulationProtocol[] }

const actions: SimulationAction[] = [
  { id: 'service_discovery', label: 'Service Discovery', primitive: 'Discovery', description: 'Probe exposed services', icon: 'activity', result: 'Service banner observed', protocols },
  { id: 'login_attempt', label: 'Login Attempt', primitive: 'Authentication', description: 'Try a simulated credential', icon: 'shield', result: 'Authentication rejected', protocols },
  { id: 'device_discovery', label: 'Device Discovery', primitive: 'Discovery', description: 'Identify reachable devices', icon: 'cpu', result: 'Device responded to discovery', protocols },
  { id: 'topic_discovery', label: 'Topic Discovery', primitive: 'Enumeration', description: 'Enumerate available topics', icon: 'analysis', result: 'Topic list captured', protocols: ['MQTT'] },
  { id: 'mqtt_connect', label: 'MQTT Connect', primitive: 'Interaction', description: 'Open a simulated broker connection', icon: 'activity', result: 'Broker connection established', protocols: ['MQTT'] },
  { id: 'mqtt_subscribe', label: 'MQTT Subscribe', primitive: 'Interaction', description: 'Subscribe to a device topic', icon: 'sessions', result: 'Subscription request captured', protocols: ['MQTT'] },
  { id: 'mqtt_publish', label: 'MQTT Publish', primitive: 'Manipulation', description: 'Publish a simulated payload', icon: 'spark', result: 'Publish payload captured', protocols: ['MQTT'] },
  { id: 'device_interaction', label: 'Device Interaction', primitive: 'Manipulation', description: 'Interact with a device endpoint', icon: 'cpu', result: 'Device interaction observed', protocols },
  { id: 'reconnect', label: 'Reconnect', primitive: 'Persistence-like behavior', description: 'Re-establish the session', icon: 'activity', result: 'Reconnect attempt observed', protocols },
  { id: 'disconnect', label: 'Disconnect', primitive: 'Exit', description: 'Close the simulated connection', icon: 'play', result: 'Connection closed', protocols },
] as const

function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Bangkok' }).format(new Date(timestamp))
}

export function AttackerSimulationPage({ onNavigate }: AttackerSimulationPageProps) {
  const state = usePrototypeState()
  const [protocol, setProtocol] = useState<SimulationProtocol>(state.simulation.protocol)
  const [targetDevice, setTargetDevice] = useState(state.simulation.targetDevice)
  const simulation = state.simulation
  const currentSession = state.sessions.find((session) => session.id === simulation.currentSessionId)
  const activeEvents = state.traceEvents.filter((event) => event.sessionId === simulation.currentSessionId).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  const isRunning = simulation.status === 'Running'
  const isPaused = simulation.status === 'Paused'
  const canStart = !isRunning && !isPaused

  function handleAction(action: SimulationAction) {
    if (!action.protocols.includes(protocol)) return
    recordAttackerAction({ action: action.id, primitive: action.primitive, result: action.result })
    if (action.id === 'disconnect') stopAttackerSimulation()
  }

  function handleClear() {
    clearAttackerSimulation()
    setProtocol('MQTT')
    setTargetDevice('ESP32-01')
  }

  return <div className="attacker-page">
    <section className="attacker-notice"><span className="attacker-notice-icon"><Icon name="shield" size={17} /></span><span><strong>Safe simulation environment</strong><small>Actions are recorded as local mock events. No network traffic is sent and no real device or service is contacted.</small></span><span className="simulated-source-badge">SOURCE · SIMULATED</span></section>

    <div className="attacker-layout">
      <div className="attacker-main-column">
        <section className="dashboard-panel attacker-config-panel">
          <div className="attacker-panel-heading"><div><div className="section-kicker">SIMULATION CONFIGURATION</div><h2>Attacker environment</h2><p>Select the protocol and target before starting a session.</p></div><span className={`simulation-status-badge sim-status-${simulation.status.toLowerCase()}`}><i />{simulation.status}</span></div>
          <div className="attacker-config-fields"><fieldset disabled={!canStart}><legend>Target protocol</legend><div className="protocol-options">{protocols.map((item) => <label className={`protocol-option ${protocol === item ? 'protocol-selected' : ''}`} key={item}><input type="radio" name="protocol" value={item} checked={protocol === item} onChange={() => setProtocol(item)} /><span className="protocol-option-mark"><i /></span><span className="protocol-label"><strong>{item}</strong><small>{item === 'Web' ? 'HTTP service' : item === 'SSH' ? 'Remote access' : 'Message broker'}</small></span><span className="protocol-status"><i />Ready</span></label>)}</div></fieldset>
            <div className="target-device-field"><label htmlFor="simulation-target">Target Device</label><select id="simulation-target" value={targetDevice} onChange={(event) => setTargetDevice(event.target.value)} disabled={!canStart}>{devices.map((device) => <option key={device}>{device}</option>)}</select></div></div>
          <div className="simulation-context"><div><span>CURRENT RUN</span><strong>{simulation.runId ?? state.activeRunId}</strong></div><div><span>SESSION ID</span><strong>{simulation.currentSessionId ?? 'Created on start'}</strong></div><div><span>SOURCE</span><strong><i className="source-simulated-dot" />simulated</strong></div><div><span>TARGET SERVICE</span><strong>{simulation.status !== 'Idle' ? currentSession?.service : protocol === 'MQTT' ? 'MQTT Broker' : protocol === 'SSH' ? 'SSH Service' : 'HTTP Honeypot'}</strong></div></div>
          <div className="simulation-controls"><button className="button button-primary" onClick={() => startAttackerSimulation(protocol, targetDevice)} disabled={!canStart}><Icon name="play" size={13} />Start Simulation</button><button className="button button-secondary" onClick={pauseAttackerSimulation} disabled={!isRunning}>Pause</button><button className="button button-secondary" onClick={resumeAttackerSimulation} disabled={!isPaused}>Resume</button><button className="button button-secondary" onClick={stopAttackerSimulation} disabled={!isRunning && !isPaused}><span className="stop-square" />Stop</button><button className="button button-quiet" onClick={handleClear} disabled={!simulation.currentSessionId}>Clear <Icon name="activity" size={13} /></button></div>
        </section>

        <section className="dashboard-panel action-panel"><div className="attacker-panel-heading"><div><div className="section-kicker">BEHAVIOR PRIMITIVES</div><h2>Attack actions</h2><p>Each click appends one event to the active session sequence.</p></div><span className="action-count-badge">{activeEvents.length} EVENTS</span></div><div className="action-grid">{actions.map((action) => { const protocolAvailable = action.protocols.includes(protocol); return <button className={`action-card ${!protocolAvailable ? 'action-unavailable' : ''}`} type="button" key={action.id} onClick={() => handleAction(action)} disabled={!isRunning || !protocolAvailable}><span className="action-icon"><Icon name={action.icon} size={16} /></span><span className="action-copy"><strong>{action.label}</strong><small>{protocolAvailable ? action.description : 'Available with MQTT protocol'}</small></span><span className="action-add">+</span></button> })}</div>
          {isPaused && <div className="paused-callout"><span className="paused-indicator" />Simulation paused. Resume to add more actions to this session.</div>}
        </section>

        <section className="dashboard-panel sequence-panel"><div className="attacker-panel-heading"><div><div className="section-kicker">OBSERVED BEHAVIOR</div><h2>Behavioral sequence</h2><p>Ordered actions from this simulation session.</p></div><a className="text-link" href="/behavioral-analysis" onClick={(event) => onNavigate(event, '/behavioral-analysis')}>Analyze sequence <Icon name="arrow" size={13} /></a></div>
          {activeEvents.length === 0 ? <div className="sequence-empty"><span><Icon name="analysis" size={17} /></span><p>Start a simulation and run an action to build a behavioral sequence.</p></div> : <div className="sequence-chain">{activeEvents.map((event, index) => <div className="sequence-chain-item" key={event.id}><span className="sequence-action-chip"><small>{String(index + 1).padStart(2, '0')}</small><strong>{event.action}</strong></span>{index < activeEvents.length - 1 && <span className="sequence-arrow">→</span>}</div>)}</div>}
          {activeEvents.length > 0 && <div className="sequence-summary"><span>{activeEvents.length} actions</span><span><i />Run {simulation.runId}</span><span>Session {simulation.currentSessionId}</span></div>}
        </section>
      </div>

      <aside className="dashboard-panel attacker-session-panel"><div className="attacker-panel-heading"><div><div className="section-kicker">SESSION TIMELINE</div><h2>Attack session</h2><p>Events captured in sequence.</p></div><span className="session-event-count">{activeEvents.length}</span></div>
        {currentSession ? <div className="sim-session-card"><div className="sim-session-title"><span className="session-avatar"><Icon name="sessions" size={16} /></span><span><small>SESSION ID</small><strong>{currentSession.id}</strong></span><span className={`table-badge ${currentSession.status === 'Active' ? 'badge-active' : 'badge-complete'}`}><i />{currentSession.status}</span></div><div className="sim-session-details"><div><small>RUN ID</small><a href="/experiment" onClick={(event) => onNavigate(event, '/experiment')}>{currentSession.runId}</a></div><div><small>SOURCE IP</small><strong>{currentSession.sourceIp}</strong></div><div><small>TARGET</small><strong>{currentSession.target}</strong></div><div><small>SERVICE</small><strong>{currentSession.service}</strong></div></div></div> : <div className="session-pending"><span className="session-pending-icon"><Icon name="sessions" size={18} /></span><strong>No active session</strong><small>Start Simulation creates a session under {state.activeRunId}.</small></div>}
        <div className="timeline-list">{activeEvents.length === 0 ? <div className="timeline-empty"><span className="timeline-empty-line" /><span>Waiting for the first action</span></div> : activeEvents.map((event, index) => <article className="timeline-entry" key={event.id}><span className={`timeline-entry-marker ${index === activeEvents.length - 1 ? 'timeline-marker-current' : ''}`} /><div className="timeline-entry-content"><div className="timeline-entry-top"><time>{formatTime(event.timestamp)}</time><span className="event-id">{event.id}</span></div><strong>{event.action}</strong><div className="timeline-entry-meta"><span>{event.primitive}</span><i>·</i><span>{event.protocol}</span></div><div className="timeline-event-endpoints"><span>Source <b>{event.sourceIp}</b></span><span>Target <b>{event.target}</b></span></div><p>{event.result}</p></div></article>)}</div>
        {activeEvents.length > 0 && <div className="timeline-footer"><span><i />All events are local mock records</span><a href="/logs-traces" onClick={(event) => onNavigate(event, '/logs-traces')}>Open Logs &amp; Traces <Icon name="arrow" size={13} /></a></div>}
      </aside>
    </div>
  </div>
}
