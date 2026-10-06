export type ServiceStatus = 'Online' | 'Offline' | 'Warning'

export type SystemService = {
  id: string
  name: string
  status: ServiceStatus
  detail: string
}

export type ExperimentStatus = 'Preparing' | 'Running' | 'Collecting Trace' | 'Processing' | 'Completed' | 'Failed' | 'Stopped'
export type TraceSource = 'observed_real' | 'replayed' | 'regenerated' | 'simulated'
export type SimulationProtocol = 'Web' | 'SSH' | 'MQTT'
export type SimulationStatus = 'Idle' | 'Running' | 'Paused' | 'Stopped'

export type ExperimentRun = {
  id: string
  scenarioId?: string
  scenarioName?: string
  scenario: string
  status: ExperimentStatus
  kind: 'Attack' | 'Normal'
  targetService?: string
  attackType?: string
  durationMinutes?: number
  targetDevice?: string
  description?: string
  startTime: string | null
  duration: string
  source: 'observed_real' | 'replayed' | 'regenerated'
  eventCount?: number
  packetCount?: number
  sessionCount?: number
}

export type AttackSession = {
  id: string
  runId: string
  sourceIp: string
  target: string
  service: string
  attackType: string
  status: 'Active' | 'Completed' | 'Flagged'
  startedAt?: string
  endedAt?: string
}

export type TraceEvent = {
  id: string
  runId: string
  sessionId: string
  timestamp: string
  primitive: string
  action: string
  source: TraceSource
  sourceIp?: string
  target?: string
  service?: string
  protocol?: SimulationProtocol
  result?: string
  destinationIp?: string
  sourcePort?: number
  destinationPort?: number
  packetSize?: number
  flags?: string
  topic?: string
  qos?: number
  payloadSize?: number
  deviceState?: string
}

export type BehavioralSequence = {
  id: string
  runId: string
  sessionId: string
  source: TraceSource
  createdAt: string
  actions: string[]
  primitives: string[]
  eventIds: string[]
  features: { actionFrequency: Record<string, number>; transitionFrequency: Record<string, number>; transitionTimingMs: Record<string, number>; eventCount: number; durationSeconds: number }
}

export type SimulationContext = {
  status: SimulationStatus
  currentSessionId: string | null
  runId: string | null
  protocol: SimulationProtocol
  targetDevice: string
  startedAt: string | null
}

export type GeneratedBehavior = {
  id: string
  sourceSequenceId: string
  sourceSessionId: string
  runId: string
  generatorMode: 'G0 Exact Replay' | 'G1 Rule-Based Mutation' | 'G2 Probabilistic Generation'
  generatedActions: string[]
  target: string
  timingMs: number[]
  createdAt: string
  status: 'Generated' | 'Sent to Validator'
  validation: 'Pending' | 'Passed' | 'Rejected'
  validationErrors: string[]
  validationWarnings: string[]
  validatedAt: string | null
  replayStatus: 'Preparing' | 'Connecting Testbed' | 'Running' | 'Paused' | 'Collecting Trace' | 'Completed' | 'Stopped' | 'Failed' | 'Not started'
}

export type ReplayStatus = 'Preparing' | 'Connecting Testbed' | 'Running' | 'Paused' | 'Collecting Trace' | 'Completed' | 'Stopped' | 'Failed'

export type ReplayExecution = {
  id: string
  generationId: string
  runId: string
  sourceSequenceId: string
  target: string
  protocol: SimulationProtocol
  status: ReplayStatus
  startedAt: string
  completedAt: string | null
  currentActionIndex: number
}

export type GeneratedTrace = {
  id: string
  replayId: string
  generationId: string
  runId: string
  timestamp: string
  action: string
  target: string
  protocol: SimulationProtocol
  source: 'replayed'
  status: 'Completed'
}

export type ConstraintRule = {
  id: string
  action: string
  requiredAction: string
  status: 'Active' | 'Disabled'
}

export type EvaluationMetric = {
  id: 'validity' | 'similarity' | 'diversity' | 'novelty' | 'ml-utility'
  label: string
  value: string
  score: number
  detail: string
}

export type MlModelScore = { model: string; observedOnly: { accuracy: number; precision: number; recall: number; f1: number }; augmented: { accuracy: number; precision: number; recall: number; f1: number } }
export type EvaluationResult = { id: string; createdAt: string; observedCount: number; generatedCount: number; replayCount: number; validity: number; similarity: number; diversity: number; novelty: number; mlUtility: number; actionSimilarity: number; transitionSimilarity: number; lengthSimilarity: number; timingSimilarity: number; models: MlModelScore[] }
export type DemoState = { status: 'Idle' | 'Running' | 'Completed' | 'Failed'; step: string; error: string | null }

export type PipelineNode = {
  id: string
  label: string
  path: string
}

export type PrototypeState = {
  activeRunId: string
  simulation: SimulationContext
  systems: SystemService[]
  runs: ExperimentRun[]
  sessions: AttackSession[]
  traceEvents: TraceEvent[]
  behavioralSequences: BehavioralSequence[]
  generatedBehaviors: GeneratedBehavior[]
  validatorRules: ConstraintRule[]
  validatorGenerationId: string | null
  replayGenerationId: string | null
  activeReplayId: string | null
  replays: ReplayExecution[]
  generatedTraces: GeneratedTrace[]
  evaluation: EvaluationMetric[]
  evaluationResults: EvaluationResult[]
  demo: DemoState
  pipeline: PipelineNode[]
}

/** Shared mock source for dashboard and the workflow modules built in later phases. */
export const prototypeState: PrototypeState = {
  activeRunId: 'RUN-001',
  simulation: { status: 'Idle', currentSessionId: null, runId: null, protocol: 'MQTT', targetDevice: 'ESP32-01', startedAt: null },
  systems: [
    { id: 'honeypot', name: 'Honeypot', status: 'Online', detail: 'Cowrie + custom services' },
    { id: 'mqtt', name: 'MQTT Broker', status: 'Online', detail: 'Mosquitto · port 1883' },
    { id: 'gateway', name: 'IoT Gateway', status: 'Warning', detail: 'Elevated response latency' },
    { id: 'nodes', name: 'ESP32 Nodes', status: 'Warning', detail: '3 of 4 nodes reachable' },
    { id: 'database', name: 'Database', status: 'Online', detail: 'Trace store connected' },
    { id: 'generator', name: 'Generator', status: 'Online', detail: 'G0 · G1 · G2 available' },
    { id: 'replay', name: 'Replay Engine', status: 'Online', detail: 'Sandbox testbed ready' },
  ],
  runs: [
    { id: 'RUN-001', scenarioId: 'SCN-MQTT-01', scenarioName: 'MQTT Abuse', scenario: 'MQTT Abuse', status: 'Running', kind: 'Attack', targetService: 'MQTT Broker', attackType: 'MQTT', durationMinutes: 5, targetDevice: 'ESP32-01', description: 'Observe MQTT topic discovery and unauthorized publish behavior.', startTime: '2026-10-05T08:15:00+07:00', duration: '5 minutes', source: 'observed_real', eventCount: 28, packetCount: 44, sessionCount: 2 },
    { id: 'RUN-002', scenario: 'Normal device telemetry', status: 'Completed', kind: 'Normal', startTime: '2026-10-04T13:00:00+07:00', duration: '01h 32m', source: 'observed_real' },
    { id: 'RUN-003', scenario: 'Credential brute force', status: 'Completed', kind: 'Attack', startTime: '2026-10-04T09:20:00+07:00', duration: '00h 48m', source: 'observed_real' },
    { id: 'RUN-004', scenario: 'G1 mutation replay', status: 'Completed', kind: 'Attack', startTime: '2026-10-03T15:10:00+07:00', duration: '00h 26m', source: 'replayed' },
    { id: 'RUN-005', scenario: 'Periodic sensor publish', status: 'Completed', kind: 'Normal', startTime: '2026-10-03T10:40:00+07:00', duration: '02h 00m', source: 'observed_real' },
    { id: 'RUN-006', scenario: 'Topic enumeration', status: 'Completed', kind: 'Attack', startTime: '2026-10-02T11:30:00+07:00', duration: '00h 57m', source: 'observed_real' },
    { id: 'RUN-007', scenario: 'G2 behavior generation', status: 'Completed', kind: 'Attack', startTime: '2026-10-02T09:05:00+07:00', duration: '00h 19m', source: 'regenerated' },
    { id: 'RUN-008', scenario: 'Normal reconnect cycle', status: 'Completed', kind: 'Normal', startTime: '2026-10-01T14:15:00+07:00', duration: '01h 10m', source: 'observed_real' },
    { id: 'RUN-009', scenario: 'Service probing', status: 'Completed', kind: 'Attack', startTime: '2026-10-01T10:00:00+07:00', duration: '00h 41m', source: 'observed_real' },
    { id: 'RUN-010', scenario: 'Sensor baseline', status: 'Completed', kind: 'Normal', startTime: '2026-09-30T12:00:00+07:00', duration: '01h 44m', source: 'observed_real' },
    { id: 'RUN-011', scenario: 'MQTT publish abuse', status: 'Completed', kind: 'Attack', startTime: '2026-09-30T09:30:00+07:00', duration: '00h 36m', source: 'observed_real' },
    { id: 'RUN-012', scenario: 'Normal status check', status: 'Completed', kind: 'Normal', startTime: '2026-09-29T16:00:00+07:00', duration: '00h 55m', source: 'observed_real' },
  ],
  sessions: [
    { id: 'SES-001', runId: 'RUN-001', sourceIp: '185.220.101.42', target: 'mqtt-gateway-01', service: 'MQTT', attackType: 'Topic discovery', status: 'Active' },
    { id: 'SES-002', runId: 'RUN-001', sourceIp: '45.142.212.61', target: 'iot-honeypot-01', service: 'SSH', attackType: 'Credential probing', status: 'Flagged' },
    { id: 'SES-003', runId: 'RUN-003', sourceIp: '91.240.118.19', target: 'iot-honeypot-01', service: 'SSH', attackType: 'Brute force', status: 'Completed' },
    { id: 'SES-004', runId: 'RUN-006', sourceIp: '103.152.220.17', target: 'mqtt-gateway-01', service: 'MQTT', attackType: 'Topic enumeration', status: 'Completed' },
  ],
  traceEvents: [
    { id: 'EVT-001', runId: 'RUN-001', sessionId: 'SES-001', timestamp: '2026-10-05T08:16:04+07:00', primitive: 'Discovery', action: 'service_discovery', source: 'observed_real' },
    { id: 'EVT-002', runId: 'RUN-001', sessionId: 'SES-001', timestamp: '2026-10-05T08:16:13+07:00', primitive: 'Enumeration', action: 'topic_discovery', source: 'observed_real' },
    { id: 'EVT-003', runId: 'RUN-001', sessionId: 'SES-002', timestamp: '2026-10-05T08:21:32+07:00', primitive: 'Authentication', action: 'login_attempt', source: 'observed_real' },
    { id: 'EVT-004', runId: 'RUN-003', sessionId: 'SES-003', timestamp: '2026-10-04T09:23:10+07:00', primitive: 'Authentication', action: 'login_attempt', source: 'observed_real' },
    { id: 'EVT-005', runId: 'RUN-006', sessionId: 'SES-004', timestamp: '2026-10-02T11:34:18+07:00', primitive: 'Enumeration', action: 'topic_discovery', source: 'observed_real' },
  ],
  behavioralSequences: [],
  generatedBehaviors: [],
  validatorRules: [
    { id: 'CR-001', action: 'mqtt_publish', requiredAction: 'mqtt_connect', status: 'Active' },
    { id: 'CR-002', action: 'mqtt_subscribe', requiredAction: 'mqtt_connect', status: 'Active' },
    { id: 'CR-003', action: 'device_control', requiredAction: 'device_discovery', status: 'Active' },
  ],
  validatorGenerationId: null,
  replayGenerationId: null,
  activeReplayId: null,
  replays: [],
  generatedTraces: [],
  evaluation: [
    { id: 'validity', label: 'Validity', value: '—', score: 0, detail: 'Awaiting sequence validation' },
    { id: 'similarity', label: 'Similarity', value: '—', score: 0, detail: 'Awaiting generated sequence' },
    { id: 'diversity', label: 'Diversity', value: '—', score: 0, detail: 'Awaiting generated sequence' },
    { id: 'novelty', label: 'Novelty', value: '—', score: 0, detail: 'Awaiting generated sequence' },
    { id: 'ml-utility', label: 'ML Utility', value: '—', score: 0, detail: 'Awaiting evaluation' },
  ],
  evaluationResults: [],
  demo: { status: 'Idle', step: 'Ready to run the full workflow', error: null },
  pipeline: [
    { id: 'attacker', label: 'Attacker', path: '/attacker-simulation' },
    { id: 'honeypot', label: 'Honeypot', path: '/testbed' },
    { id: 'collection', label: 'Collection', path: '/logs-traces' },
    { id: 'processing', label: 'Processing', path: '/logs-traces' },
    { id: 'analysis', label: 'Analysis', path: '/behavioral-analysis' },
    { id: 'generator', label: 'Generator', path: '/behavior-generator' },
    { id: 'validator', label: 'Validator', path: '/constraint-validator' },
    { id: 'replay', label: 'Replay', path: '/replay' },
    { id: 'evaluation', label: 'Evaluation', path: '/evaluation' },
  ],
}
