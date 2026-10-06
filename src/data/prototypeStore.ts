import { useSyncExternalStore } from 'react'
import { prototypeState, type BehavioralSequence, type ExperimentRun, type ExperimentStatus, type GeneratedBehavior, type PrototypeState, type SimulationProtocol, type TraceEvent, type EvaluationResult, type EvaluationMetric } from './mockData'

let currentState = prototypeState
const listeners = new Set<() => void>()
const workflowTimers = new Map<string, ReturnType<typeof setTimeout>>()
const replayTimers = new Map<string, ReturnType<typeof setTimeout>>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function getSnapshot() {
  return currentState
}

function clearReplayTimer(replayId: string) {
  const timer = replayTimers.get(replayId)
  if (timer !== undefined) clearTimeout(timer)
  replayTimers.delete(replayId)
}

export function getPrototypeSnapshot() {
  return currentState
}

export function usePrototypeState() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function updatePrototypeState(update: (state: PrototypeState) => PrototypeState) {
  currentState = update(currentState)
  listeners.forEach((listener) => listener())
}

function scoreSimilarity(reference: string[], candidate: string[]) {
  const counts = (items: string[]) => items.reduce<Record<string, number>>((result, item) => { result[item] = (result[item] ?? 0) + 1; return result }, {})
  const left = counts(reference); const right = counts(candidate)
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  if (!keys.size) return 0
  const leftTotal = reference.length || 1; const rightTotal = candidate.length || 1
  const distance = [...keys].reduce((sum, key) => sum + Math.abs((left[key] ?? 0) / leftTotal - (right[key] ?? 0) / rightTotal), 0) / 2
  return Math.round(Math.max(0, 1 - distance) * 100)
}

function transitionKeys(actions: string[]) { return actions.slice(1).map((action, index) => `${actions[index]} → ${action}`) }

function nextEvaluationId(state: PrototypeState) {
  const next = state.evaluationResults.reduce((max, item) => Math.max(max, Number(item.id.replace('EVAL-', '')) || 0), 0) + 1
  return `EVAL-${String(next).padStart(3, '0')}`
}

export function evaluatePrototypeData() {
  const state = currentState
  const generated = state.generatedBehaviors
  const pairs = generated.map((generation) => ({ generation, sequence: state.behavioralSequences.find((sequence) => sequence.id === generation.sourceSequenceId) })).filter((item): item is { generation: GeneratedBehavior; sequence: BehavioralSequence } => Boolean(item.sequence))
  const actionScores = pairs.map(({ generation, sequence }) => scoreSimilarity(sequence.actions, generation.generatedActions))
  const transitionScores = pairs.map(({ generation, sequence }) => scoreSimilarity(transitionKeys(sequence.actions), transitionKeys(generation.generatedActions)))
  const lengthScores = pairs.map(({ generation, sequence }) => Math.round(Math.max(0, 1 - Math.abs(sequence.actions.length - generation.generatedActions.length) / Math.max(sequence.actions.length, generation.generatedActions.length, 1)) * 100))
  const timingScores = pairs.map(({ generation, sequence }) => {
    const source = Object.values(sequence.features.transitionTimingMs); const candidate = generation.timingMs.slice(1)
    if (!source.length || !candidate.length) return 50
    const average = (items: number[]) => items.reduce((sum, value) => sum + value, 0) / items.length
    return Math.round(Math.max(0, 1 - Math.abs(average(source) - average(candidate)) / Math.max(average(source), average(candidate), 1)) * 100)
  })
  const mean = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0
  const observedTransitions = new Set(state.behavioralSequences.flatMap((sequence) => transitionKeys(sequence.actions)))
  const generatedTransitions = pairs.flatMap(({ generation }) => transitionKeys(generation.generatedActions))
  const novelty = generatedTransitions.length ? Math.round(generatedTransitions.filter((transition) => !observedTransitions.has(transition)).length / generatedTransitions.length * 100) : 0
  const unique = new Set(pairs.map(({ generation }) => generation.generatedActions.join('|'))).size
  const diversity = pairs.length ? Math.round(unique / pairs.length * 100) : 0
  const passed = generated.filter((item) => item.validation === 'Passed').length
  const rejected = generated.filter((item) => item.validation === 'Rejected').length
  const validationCount = passed + rejected
  const validity = validationCount ? Math.round(passed / validationCount * 100) : 0
  const similarityParts = [mean(actionScores), mean(transitionScores), mean(lengthScores), mean(timingScores)]
  const similarity = Math.round(similarityParts.reduce((sum, value) => sum + value, 0) / similarityParts.length)
  const mlUtility = Math.round(Math.min(25, novelty * 0.15 + Math.max(0, diversity - 50) * 0.08))
  const base = Math.min(94, 70 + Math.min(16, state.sessions.length * 2))
  const models = ['Logistic Regression', 'Decision Tree', 'Random Forest', 'XGBoost'].map((model, index) => {
    const offset = [0, 3, 6, 8][index]
    const observedOnly = { accuracy: base + offset, precision: base - 3 + offset, recall: base - 5 + offset, f1: base - 4 + offset }
    const lift = Math.max(1, Math.round(mlUtility / 4))
    return { model, observedOnly, augmented: { accuracy: observedOnly.accuracy + lift, precision: observedOnly.precision + lift, recall: observedOnly.recall + Math.max(1, lift - 1), f1: observedOnly.f1 + lift } }
  })
  const result: EvaluationResult = { id: nextEvaluationId(state), createdAt: new Date().toISOString(), observedCount: state.traceEvents.filter((event) => event.source === 'observed_real' || event.source === 'simulated').length, generatedCount: generated.reduce((sum, item) => sum + item.generatedActions.length, 0), replayCount: state.generatedTraces.length, validity, similarity, diversity, novelty, mlUtility, actionSimilarity: similarityParts[0], transitionSimilarity: similarityParts[1], lengthSimilarity: similarityParts[2], timingSimilarity: similarityParts[3], models }
  const metrics: EvaluationMetric[] = [
    { id: 'validity', label: 'Validity', value: `${validity}%`, score: validity, detail: `${passed} valid / ${rejected} invalid sequences` },
    { id: 'similarity', label: 'Similarity', value: `${similarity}%`, score: similarity, detail: 'Action, transition, length & timing average' },
    { id: 'diversity', label: 'Diversity', value: `${diversity}%`, score: diversity, detail: 'Unique generated sequence ratio' },
    { id: 'novelty', label: 'Novelty', value: `${novelty}%`, score: novelty, detail: 'Generated transitions absent from observed' },
    { id: 'ml-utility', label: 'ML Utility', value: `+${mlUtility}%`, score: mlUtility, detail: 'Estimated observed + generated uplift' },
  ]
  updatePrototypeState((current) => ({ ...current, evaluation: metrics, evaluationResults: [...current.evaluationResults, result] }))
  return result
}

function setDemoStep(step: string, status: PrototypeState['demo']['status'] = 'Running') {
  updatePrototypeState((state) => ({ ...state, demo: { ...state.demo, status, step, error: null } }))
}

function waitForDemo<T>(read: () => T | null, label: string, timeoutMs = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now()
    const check = () => {
      const value = read()
      if (value !== null) { resolve(value); return }
      if (Date.now() - startedAt > timeoutMs) { reject(new Error(`Timed out waiting for ${label}.`)); return }
      setTimeout(check, 50)
    }
    check()
  })
}

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))

/** Runs the same shared-store operations exposed by the manual workflow screens. */
export async function runFullDemo() {
  if (currentState.demo.status === 'Running') return false
  workflowTimers.forEach((timer) => clearTimeout(timer)); workflowTimers.clear()
  replayTimers.forEach((timer) => clearTimeout(timer)); replayTimers.clear()
  updatePrototypeState((state) => ({
    ...state,
    activeRunId: '',
    simulation: { status: 'Idle', currentSessionId: null, runId: null, protocol: 'MQTT', targetDevice: 'ESP32-01', startedAt: null },
    runs: [], sessions: [], traceEvents: [], behavioralSequences: [], generatedBehaviors: [],
    validatorGenerationId: null, replayGenerationId: null, activeReplayId: null, replays: [], generatedTraces: [], evaluationResults: [],
    evaluation: [
      { id: 'validity', label: 'Validity', value: '—', score: 0, detail: 'Awaiting sequence validation' },
      { id: 'similarity', label: 'Similarity', value: '—', score: 0, detail: 'Awaiting generated sequence' },
      { id: 'diversity', label: 'Diversity', value: '—', score: 0, detail: 'Awaiting generated sequence' },
      { id: 'novelty', label: 'Novelty', value: '—', score: 0, detail: 'Awaiting generated sequence' },
      { id: 'ml-utility', label: 'ML Utility', value: '—', score: 0, detail: 'Awaiting evaluation' },
    ],
    demo: { status: 'Running', step: 'Creating RUN-001', error: null },
  }))
  try {
    const run = createExperimentRun({ scenarioId: 'SCN-MQTT-01', scenarioName: 'MQTT Abuse', scenario: 'MQTT Abuse', kind: 'Attack', targetService: 'MQTT Broker', attackType: 'MQTT Abuse', durationMinutes: 5, targetDevice: 'ESP32-01', description: 'Full end-to-end demonstration of observed MQTT behavior generation and replay.' })
    setDemoStep(`Starting ${run.id}: Preparing → Running`)
    startExperimentRun(run.id)
    await waitForDemo(() => currentState.runs.find((item) => item.id === run.id)?.status === 'Running' ? true : null, 'Experiment Running')
    holdExperimentRun(run.id) // Hold at Running while the shared attacker simulation collects this run.
    setDemoStep('Simulating the MQTT attacker sequence')
    startAttackerSimulation('MQTT', 'ESP32-01')
    const actions = [
      { action: 'service_discovery', primitive: 'Discovery', result: 'MQTT broker service discovered' },
      { action: 'mqtt_connect', primitive: 'Interaction', result: 'Broker connection established' },
      { action: 'topic_discovery', primitive: 'Enumeration', result: 'Device topics enumerated' },
      { action: 'mqtt_publish', primitive: 'Manipulation', result: 'Publish payload captured' },
      { action: 'disconnect', primitive: 'Exit', result: 'Connection closed' },
    ]
    actions.forEach((action) => recordAttackerAction(action))
    const sessionId = currentState.simulation.currentSessionId
    if (!sessionId) throw new Error('Attacker Simulation did not create a Session.')
    stopAttackerSimulation()
    setDemoStep('Collecting logs and extracting behavioral features')
    const sequence = extractBehavioralSequence(sessionId)
    if (!sequence) throw new Error('Could not extract a behavioral sequence from the captured trace.')
    setDemoStep('Generating G1 Rule-Based Mutation')
    const generatedActions = sequence.actions.flatMap((action) => action === 'mqtt_publish' ? ['mqtt_subscribe', action] : [action])
    const generation = createBehaviorGeneration({ sourceSequenceId: sequence.id, generatorMode: 'G1 Rule-Based Mutation', generatedActions, target: 'ESP32-01', timingMs: generatedActions.map((_, index) => index === 0 ? 0 : 350) })
    if (!generation) throw new Error('Could not generate behavior from the observed sequence.')
    sendGenerationToValidator(generation.id)
    setDemoStep('Validating MQTT semantic constraints')
    const validation = validateGeneratedBehavior(generation.id)
    if (validation?.status !== 'VALID') throw new Error(`Generated sequence failed validation: ${validation?.errors.join('; ') ?? 'unknown constraint error'}`)
    requestValidatedReplay(generation.id)
    setDemoStep('Replaying validated behavior and collecting replay traces')
    const replayId = startReplay(generation.id)
    if (!replayId) throw new Error('Replay Engine did not accept the validated Generation.')
    await waitForDemo(() => currentState.replays.find((item) => item.id === replayId)?.status === 'Completed' ? true : null, 'Replay completion', 20000)
    setDemoStep('Completing Experiment and refreshing Evaluation / ML / Dataset')
    updatePrototypeState((state) => ({ ...state, runs: state.runs.map((item) => item.id === run.id ? { ...item, status: 'Collecting Trace' } : item) }))
    await delay(140)
    updatePrototypeState((state) => ({ ...state, runs: state.runs.map((item) => item.id === run.id ? { ...item, status: 'Processing' } : item) }))
    await delay(140)
    updatePrototypeState((state) => ({ ...state, runs: state.runs.map((item) => item.id === run.id ? { ...item, status: 'Completed', eventCount: state.traceEvents.filter((event) => event.runId === run.id).length, packetCount: state.traceEvents.filter((event) => event.runId === run.id).length, sessionCount: state.sessions.filter((item) => item.runId === run.id).length } : item), demo: { status: 'Completed', step: `${run.id} → ${sessionId} → ${sequence.id} → ${generation.id} → ${replayId} → ${currentState.evaluationResults.at(-1)?.id ?? 'Evaluation'}`, error: null } }))
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Full demo failed.'
    updatePrototypeState((state) => ({ ...state, demo: { status: 'Failed', step: 'Demo stopped', error: message } }))
    return false
  }
}

export function holdExperimentRun(runId: string) { clearWorkflowTimer(runId) }

export function getNextRunId(state = currentState) {
  const nextNumber = state.runs.reduce((highest, run) => {
    const match = /^RUN-(\d+)$/.exec(run.id)
    return match ? Math.max(highest, Number(match[1])) : highest
  }, 0) + 1
  return `RUN-${String(nextNumber).padStart(3, '0')}`
}

export function getActiveRun(state = currentState) {
  return state.runs.find((run) => run.id === state.activeRunId) ?? state.runs[0]
}

export function getExperimentSummary(state = currentState) {
  return {
    totalRuns: state.runs.length,
    attackRuns: state.runs.filter((run) => run.kind === 'Attack').length,
    normalRuns: state.runs.filter((run) => run.kind === 'Normal').length,
    activeRuns: state.runs.filter((run) => ['Preparing', 'Running', 'Collecting Trace', 'Processing'].includes(run.status)).length,
    completedRuns: state.runs.filter((run) => run.status === 'Completed').length,
  }
}

export type NewExperiment = Omit<ExperimentRun, 'id' | 'status' | 'startTime' | 'duration' | 'source' | 'eventCount' | 'packetCount' | 'sessionCount'>

function isWorkflowActive(status: ExperimentStatus) {
  return ['Preparing', 'Running', 'Collecting Trace', 'Processing'].includes(status)
}

export function createExperimentRun(input: NewExperiment) {
  const id = getNextRunId()
  currentState.runs.filter((run) => isWorkflowActive(run.status)).forEach((run) => clearWorkflowTimer(run.id))
  const run: ExperimentRun = {
    ...input,
    id,
    status: 'Preparing',
    startTime: null,
    duration: `${input.durationMinutes ?? 5} minutes`,
    source: 'observed_real',
    eventCount: 0,
    packetCount: 0,
    sessionCount: 0,
  }
  updatePrototypeState((state) => ({
    ...state,
    activeRunId: id,
    runs: [...state.runs.map((existing) => isWorkflowActive(existing.status) ? { ...existing, status: 'Stopped' as const } : existing), run],
  }))
  return run
}

function clearWorkflowTimer(runId: string) {
  const timer = workflowTimers.get(runId)
  if (timer !== undefined) clearTimeout(timer)
  workflowTimers.delete(runId)
}

function nextSessionId(state: PrototypeState) {
  const nextNumber = state.sessions.reduce((highest, session) => {
    const match = /^SES-(\d+)$/.exec(session.id)
    return match ? Math.max(highest, Number(match[1])) : highest
  }, 0) + 1
  return `SES-${String(nextNumber).padStart(3, '0')}`
}

function collectTraceForRun(state: PrototypeState, run: ExperimentRun) {
  const sessionId = nextSessionId(state)
  const session = {
    id: sessionId,
    runId: run.id,
    sourceIp: '198.51.100.42',
    target: run.targetDevice || 'iot-honeypot-01',
    service: run.targetService ?? 'MQTT Broker',
    attackType: run.attackType ?? 'MQTT',
    status: 'Completed' as const,
  }
  const time = new Date().toISOString()
  const events: TraceEvent[] = [
    { id: `${run.id}-EVT-001`, runId: run.id, sessionId, timestamp: time, primitive: 'Discovery', action: 'service_discovery', source: 'observed_real' },
    { id: `${run.id}-EVT-002`, runId: run.id, sessionId, timestamp: time, primitive: 'Enumeration', action: 'topic_discovery', source: 'observed_real' },
    { id: `${run.id}-EVT-003`, runId: run.id, sessionId, timestamp: time, primitive: 'Interaction', action: 'mqtt_connect', source: 'observed_real' },
  ]
  return { session, events }
}

function transitionRun(runId: string, status: ExperimentStatus) {
  updatePrototypeState((state) => {
    const run = state.runs.find((item) => item.id === runId)
    if (!run || !isWorkflowActive(run.status)) return state
    if (status !== 'Collecting Trace') {
      return { ...state, runs: state.runs.map((item) => item.id === runId ? { ...item, status } : item) }
    }
    const collected = collectTraceForRun(state, run)
    const events = [...state.traceEvents, ...collected.events]
    return {
      ...state,
      sessions: [...state.sessions, collected.session],
      traceEvents: events,
      behavioralSequences: state.behavioralSequences.filter((sequence) => sequence.runId !== runId),
      generatedBehaviors: state.generatedBehaviors.filter((generation) => generation.runId !== runId),
      runs: state.runs.map((item) => item.id === runId ? { ...item, status, eventCount: events.filter((event) => event.runId === runId).length, packetCount: 6, sessionCount: state.sessions.filter((session) => session.runId === runId).length + 1 } : item),
    }
  })
}

export function startExperimentRun(runId: string) {
  currentState.runs.filter((run) => isWorkflowActive(run.status)).forEach((run) => clearWorkflowTimer(run.id))
  currentState.replays.filter((replay) => replay.runId === runId).forEach((replay) => clearReplayTimer(replay.id))
  const now = new Date().toISOString()
  updatePrototypeState((state) => ({
    ...state,
    activeRunId: runId,
    runs: state.runs.map((run) => {
      if (run.id === runId) return { ...run, status: 'Preparing', startTime: now, eventCount: 0, packetCount: 0, sessionCount: 0 }
      return isWorkflowActive(run.status) ? { ...run, status: 'Stopped' } : run
    }),
    sessions: state.sessions.filter((session) => session.runId !== runId),
    traceEvents: state.traceEvents.filter((event) => event.runId !== runId),
    behavioralSequences: state.behavioralSequences.filter((sequence) => sequence.runId !== runId),
    generatedBehaviors: state.generatedBehaviors.filter((generation) => generation.runId !== runId),
    validatorGenerationId: null,
    replayGenerationId: null,
    activeReplayId: state.activeReplayId && state.replays.find((replay) => replay.id === state.activeReplayId)?.runId === runId ? null : state.activeReplayId,
    replays: state.replays.filter((replay) => replay.runId !== runId),
    generatedTraces: state.generatedTraces.filter((trace) => trace.runId !== runId),
  }))
  const steps: ExperimentStatus[] = ['Running', 'Collecting Trace', 'Processing', 'Completed']
  let index = 0
  const advance = () => {
    const next = steps[index]
    if (!next) return
    transitionRun(runId, next)
    index += 1
    if (index < steps.length) {
      const timer = setTimeout(advance, 900)
      workflowTimers.set(runId, timer)
    } else {
      workflowTimers.delete(runId)
    }
  }
  const timer = setTimeout(advance, 900)
  workflowTimers.set(runId, timer)
}

export function stopExperimentRun(runId: string) {
  clearWorkflowTimer(runId)
  updatePrototypeState((state) => ({
    ...state,
    runs: state.runs.map((run) => run.id === runId && isWorkflowActive(run.status) ? { ...run, status: 'Stopped' } : run),
  }))
}

export function resetExperimentRun(runId: string) {
  clearWorkflowTimer(runId)
  currentState.replays.filter((replay) => replay.runId === runId).forEach((replay) => clearReplayTimer(replay.id))
  updatePrototypeState((state) => {
    const sessionsToRemove = new Set(state.sessions.filter((session) => session.runId === runId).map((session) => session.id))
    return {
      ...state,
      activeRunId: runId,
      sessions: state.sessions.filter((session) => session.runId !== runId),
      traceEvents: state.traceEvents.filter((event) => event.runId !== runId),
      behavioralSequences: state.behavioralSequences.filter((sequence) => sequence.runId !== runId),
      generatedBehaviors: state.generatedBehaviors.filter((generation) => generation.runId !== runId),
      validatorGenerationId: state.validatorGenerationId && sessionsToRemove.has(state.generatedBehaviors.find((generation) => generation.id === state.validatorGenerationId)?.sourceSessionId ?? '') ? null : state.validatorGenerationId,
      replayGenerationId: state.replayGenerationId && sessionsToRemove.has(state.generatedBehaviors.find((generation) => generation.id === state.replayGenerationId)?.sourceSessionId ?? '') ? null : state.replayGenerationId,
      activeReplayId: state.activeReplayId && state.replays.find((replay) => replay.id === state.activeReplayId)?.runId === runId ? null : state.activeReplayId,
      replays: state.replays.filter((replay) => replay.runId !== runId),
      generatedTraces: state.generatedTraces.filter((trace) => trace.runId !== runId),
      runs: state.runs.map((run) => run.id === runId ? { ...run, status: 'Preparing', startTime: null, eventCount: 0, packetCount: 0, sessionCount: 0 } : run),
    }
  })
}

function nextSimulationSessionId(state: PrototypeState) {
  const nextNumber = state.sessions.reduce((highest, session) => {
    const match = /^SESSION-(\d+)$/.exec(session.id)
    return match ? Math.max(highest, Number(match[1])) : highest
  }, 0) + 1
  return `SESSION-${String(nextNumber).padStart(3, '0')}`
}

function nextEventId(state: PrototypeState) {
  const nextNumber = state.traceEvents.reduce((highest, event) => {
    const match = /^EVT-(\d+)$/.exec(event.id)
    return match ? Math.max(highest, Number(match[1])) : highest
  }, 0) + 1
  return `EVT-${String(nextNumber).padStart(3, '0')}`
}

function getServiceForProtocol(protocol: SimulationProtocol) {
  if (protocol === 'Web') return 'HTTP Honeypot'
  if (protocol === 'SSH') return 'SSH Service'
  return 'MQTT Broker'
}

export function startAttackerSimulation(protocol: SimulationProtocol, targetDevice: string) {
  updatePrototypeState((state) => {
    const run = state.runs.find((item) => item.id === state.activeRunId)
    if (!run) return state
    const sessionId = nextSimulationSessionId(state)
    const session = {
      id: sessionId,
      runId: run.id,
      sourceIp: '198.51.100.42',
      target: targetDevice,
      service: getServiceForProtocol(protocol),
      attackType: 'Attacker behavior simulation',
      status: 'Active' as const,
      startedAt: new Date().toISOString(),
    }
    return {
      ...state,
      simulation: { status: 'Running', currentSessionId: sessionId, runId: run.id, protocol, targetDevice, startedAt: new Date().toISOString() },
      sessions: [...state.sessions, session],
      runs: state.runs.map((item) => item.id === run.id ? { ...item, sessionCount: (item.sessionCount ?? 0) + 1 } : item),
    }
  })
}

export function pauseAttackerSimulation() {
  updatePrototypeState((state) => state.simulation.status === 'Running' ? { ...state, simulation: { ...state.simulation, status: 'Paused' } } : state)
}

export function resumeAttackerSimulation() {
  updatePrototypeState((state) => state.simulation.status === 'Paused' ? { ...state, simulation: { ...state.simulation, status: 'Running' } } : state)
}

export function stopAttackerSimulation() {
  updatePrototypeState((state) => {
    const sessionId = state.simulation.currentSessionId
    if (!sessionId) return { ...state, simulation: { ...state.simulation, status: 'Stopped' } }
    return {
      ...state,
      simulation: { ...state.simulation, status: 'Stopped' },
      sessions: state.sessions.map((session) => session.id === sessionId ? { ...session, status: 'Completed', endedAt: new Date().toISOString() } : session),
    }
  })
}

export function recordAttackerAction(input: { action: string; primitive: string; result: string }) {
  let createdEvent: TraceEvent | null = null
  updatePrototypeState((state) => {
    const simulation = state.simulation
    if (simulation.status !== 'Running' || !simulation.currentSessionId || !simulation.runId) return state
    const protocol = simulation.protocol
    const service = getServiceForProtocol(protocol)
    const event: TraceEvent = {
      id: nextEventId(state),
      runId: simulation.runId,
      sessionId: simulation.currentSessionId,
      timestamp: new Date().toISOString(),
      primitive: input.primitive,
      action: input.action,
      source: 'simulated',
      sourceIp: '198.51.100.42',
      target: simulation.targetDevice,
      service,
      protocol,
      result: input.result,
      destinationIp: '192.0.2.10',
      sourcePort: 42000 + (state.traceEvents.length % 2000),
      destinationPort: protocol === 'MQTT' ? 1883 : protocol === 'SSH' ? 22 : 80,
      packetSize: 64 + ((input.action.length * 17 + state.traceEvents.length * 29) % 1200),
      flags: input.action === 'mqtt_connect' || input.action === 'login_attempt' ? 'SYN' : input.action === 'disconnect' ? 'FIN, ACK' : 'PSH, ACK',
      topic: protocol === 'MQTT' ? input.action.includes('publish') ? 'devices/esp32-01/command' : 'devices/esp32-01/+' : undefined,
      qos: protocol === 'MQTT' ? input.action.includes('publish') ? 1 : 0 : undefined,
      payloadSize: protocol === 'MQTT' && input.action.includes('publish') ? 48 : protocol === 'MQTT' ? 0 : undefined,
      deviceState: ['device_interaction', 'mqtt_publish'].includes(input.action) ? 'command_received' : ['reconnect', 'mqtt_connect'].includes(input.action) ? 'connected' : input.action === 'disconnect' ? 'disconnected' : input.action === 'device_discovery' ? 'discovered' : undefined,
    }
    createdEvent = event
    return {
      ...state,
      traceEvents: [...state.traceEvents, event],
      behavioralSequences: state.behavioralSequences.filter((sequence) => sequence.sessionId !== simulation.currentSessionId),
      generatedBehaviors: state.generatedBehaviors.filter((generation) => generation.sourceSessionId !== simulation.currentSessionId),
      validatorGenerationId: state.generatedBehaviors.find((generation) => generation.id === state.validatorGenerationId)?.sourceSessionId === simulation.currentSessionId ? null : state.validatorGenerationId,
      replayGenerationId: state.generatedBehaviors.find((generation) => generation.id === state.replayGenerationId)?.sourceSessionId === simulation.currentSessionId ? null : state.replayGenerationId,
      runs: state.runs.map((run) => run.id === simulation.runId ? { ...run, eventCount: (run.eventCount ?? 0) + 1, packetCount: (run.packetCount ?? 0) + 1 } : run),
    }
  })
  return createdEvent
}

export function clearAttackerSimulation() {
  const sessionId = currentState.simulation.currentSessionId
  const removedGenerationIds = new Set(currentState.generatedBehaviors.filter((generation) => generation.sourceSessionId === sessionId).map((generation) => generation.id))
  const removedReplayIds = new Set(currentState.replays.filter((replay) => removedGenerationIds.has(replay.generationId)).map((replay) => replay.id))
  removedReplayIds.forEach(clearReplayTimer)
  updatePrototypeState((state) => {
    if (!sessionId) return { ...state, simulation: { ...state.simulation, status: 'Idle', runId: null, startedAt: null } }
    const removedEvents = state.traceEvents.filter((event) => event.sessionId === sessionId)
    const session = state.sessions.find((item) => item.id === sessionId)
    return {
      ...state,
      simulation: { ...state.simulation, status: 'Idle', currentSessionId: null, runId: null, startedAt: null },
      sessions: state.sessions.filter((item) => item.id !== sessionId),
      traceEvents: state.traceEvents.filter((event) => event.sessionId !== sessionId),
      behavioralSequences: state.behavioralSequences.filter((sequence) => sequence.sessionId !== sessionId),
      generatedBehaviors: state.generatedBehaviors.filter((generation) => generation.sourceSessionId !== sessionId),
      activeReplayId: state.activeReplayId && removedReplayIds.has(state.activeReplayId) ? null : state.activeReplayId,
      replays: state.replays.filter((replay) => !removedReplayIds.has(replay.id)),
      generatedTraces: state.generatedTraces.filter((trace) => !removedReplayIds.has(trace.replayId)),
      validatorGenerationId: state.generatedBehaviors.find((generation) => generation.id === state.validatorGenerationId)?.sourceSessionId === sessionId ? null : state.validatorGenerationId,
      replayGenerationId: state.generatedBehaviors.find((generation) => generation.id === state.replayGenerationId)?.sourceSessionId === sessionId ? null : state.replayGenerationId,
      runs: state.runs.map((run) => session && run.id === session.runId ? { ...run, eventCount: Math.max((run.eventCount ?? 0) - removedEvents.length, 0), packetCount: Math.max((run.packetCount ?? 0) - removedEvents.length, 0), sessionCount: Math.max((run.sessionCount ?? 0) - 1, 0) } : run),
    }
  })
}

function nextSequenceId(state: PrototypeState) {
  const nextNumber = state.behavioralSequences.reduce((highest, sequence) => {
    const match = /^SEQ-(\d+)$/.exec(sequence.id)
    return match ? Math.max(highest, Number(match[1])) : highest
  }, 0) + 1
  return `SEQ-${String(nextNumber).padStart(3, '0')}`
}

export function extractBehavioralSequence(sessionId: string): BehavioralSequence | null {
  let created: BehavioralSequence | null = null
  updatePrototypeState((state) => {
    const session = state.sessions.find((item) => item.id === sessionId)
    const events = state.traceEvents.filter((event) => event.sessionId === sessionId).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    if (!session || events.length === 0) return state
    const prior = state.behavioralSequences.find((sequence) => sequence.sessionId === sessionId)
    const actionFrequency: Record<string, number> = {}
    const transitionFrequency: Record<string, number> = {}
    const transitionTimingTotal: Record<string, number> = {}
    events.forEach((event, index) => {
      actionFrequency[event.action] = (actionFrequency[event.action] ?? 0) + 1
      const next = events[index + 1]
      if (next) {
        const transition = `${event.action} → ${next.action}`
        transitionFrequency[transition] = (transitionFrequency[transition] ?? 0) + 1
        transitionTimingTotal[transition] = (transitionTimingTotal[transition] ?? 0) + Math.max(0, new Date(next.timestamp).getTime() - new Date(event.timestamp).getTime())
      }
    })
    const durationSeconds = events.length > 1 ? Math.max(0, (new Date(events.at(-1)!.timestamp).getTime() - new Date(events[0].timestamp).getTime()) / 1000) : 0
    const sequence: BehavioralSequence = {
      id: prior?.id ?? nextSequenceId(state),
      runId: session.runId,
      sessionId,
      source: events[0].source,
      createdAt: new Date().toISOString(),
      actions: events.map((event) => event.action),
      primitives: events.map((event) => event.primitive),
      eventIds: events.map((event) => event.id),
      features: { actionFrequency, transitionFrequency, transitionTimingMs: Object.fromEntries(Object.entries(transitionTimingTotal).map(([transition, total]) => [transition, Math.round(total / transitionFrequency[transition])])), eventCount: events.length, durationSeconds },
    }
    created = sequence
    return { ...state, behavioralSequences: [...state.behavioralSequences.filter((item) => item.sessionId !== sessionId), sequence] }
  })
  return created
}

function nextGenerationId(state: PrototypeState) {
  const nextNumber = state.generatedBehaviors.reduce((highest, generation) => {
    const match = /^GEN-(\d+)$/.exec(generation.id)
    return match ? Math.max(highest, Number(match[1])) : highest
  }, 0) + 1
  return `GEN-${String(nextNumber).padStart(3, '0')}`
}

export function createBehaviorGeneration(input: { sourceSequenceId: string; generatorMode: GeneratedBehavior['generatorMode']; generatedActions: string[]; target: string; timingMs: number[] }) {
  const sourceSequence = currentState.behavioralSequences.find((item) => item.id === input.sourceSequenceId)
  if (!sourceSequence || input.generatedActions.length === 0) return null
  const generation: GeneratedBehavior = {
      id: nextGenerationId(currentState),
      sourceSequenceId: sourceSequence.id,
      sourceSessionId: sourceSequence.sessionId,
      runId: sourceSequence.runId,
      generatorMode: input.generatorMode,
      generatedActions: input.generatedActions,
      target: input.target,
      timingMs: input.timingMs,
      createdAt: new Date().toISOString(),
      status: 'Generated',
      validation: 'Pending',
      validationErrors: [],
      validationWarnings: [],
      validatedAt: null,
      replayStatus: 'Not started',
  }
  updatePrototypeState((state) => {
    if (!state.behavioralSequences.some((sequence) => sequence.id === generation.sourceSequenceId)) return state
    return { ...state, generatedBehaviors: [...state.generatedBehaviors, generation] }
  })
  return currentState.generatedBehaviors.some((item) => item.id === generation.id) ? generation : null
}

export function generateProbabilisticActions(sequenceId: string) {
  const sequence = currentState.behavioralSequences.find((item) => item.id === sequenceId)
  if (!sequence?.actions.length) return []
  const outgoing = Object.entries(sequence.features.transitionFrequency).reduce<Record<string, { next: string; count: number }[]>>((map, [pair, count]) => {
    const [from, to] = pair.split(' → ')
    ;(map[from] ??= []).push({ next: to, count })
    return map
  }, {})
  const generated = [sequence.actions[0]]
  while (generated.length < sequence.actions.length) {
    const candidates = outgoing[generated[generated.length - 1]] ?? []
    const total = candidates.reduce((sum, item) => sum + item.count, 0)
    if (!total) break
    let draw = Math.random() * total
    const next = candidates.find((item) => (draw -= item.count) < 0) ?? candidates.at(-1)
    if (!next) break
    generated.push(next.next)
  }
  return generated
}

export function sendGenerationToValidator(generationId: string) {
  updatePrototypeState((state) => ({
    ...state,
    validatorGenerationId: generationId,
    generatedBehaviors: state.generatedBehaviors.map((generation) => generation.id === generationId ? { ...generation, status: 'Sent to Validator' } : generation),
  }))
}

export function validateGeneratedBehavior(generationId: string) {
  const generation = currentState.generatedBehaviors.find((item) => item.id === generationId)
  if (!generation) return null
  const errors = currentState.validatorRules.filter((rule) => rule.status === 'Active').flatMap((rule) => {
    const triggerIndex = generation.generatedActions.indexOf(rule.action)
    if (triggerIndex === -1) return []
    const requiredIndex = generation.generatedActions.indexOf(rule.requiredAction)
    if (requiredIndex === -1) return [`${rule.action} requires ${rule.requiredAction}, but ${rule.requiredAction} is missing.`]
    if (requiredIndex > triggerIndex) return [`${rule.action} requires ${rule.requiredAction} before it, but ${rule.requiredAction} appears later.`]
    return []
  })
  const warnings: string[] = []
  const validatedAt = new Date().toISOString()
  const result = { status: errors.length ? 'INVALID' as const : 'VALID' as const, errors, warnings, validatedAt }
  updatePrototypeState((state) => ({
    ...state,
    generatedBehaviors: state.generatedBehaviors.map((item) => item.id === generationId ? { ...item, validation: errors.length ? 'Rejected' : 'Passed', validationErrors: errors, validationWarnings: warnings, validatedAt, replayStatus: 'Not started' } : item),
  }))
  return result
}

export function fixGeneratedBehavior(generationId: string) {
  const generation = currentState.generatedBehaviors.find((item) => item.id === generationId)
  if (!generation) return null
  const fixedActions = [...generation.generatedActions]
  const fixedTimings = [...generation.timingMs]
  currentState.validatorRules.filter((rule) => rule.status === 'Active').forEach((rule) => {
    const triggerIndex = fixedActions.indexOf(rule.action)
    if (triggerIndex === -1) return
    const requiredIndex = fixedActions.indexOf(rule.requiredAction)
    if (requiredIndex === -1 || requiredIndex > triggerIndex) {
      fixedActions.splice(triggerIndex, 0, rule.requiredAction)
      fixedTimings.splice(triggerIndex, 0, triggerIndex === 0 ? 0 : fixedTimings[triggerIndex] ?? 1000)
    }
  })
  updatePrototypeState((state) => ({
    ...state,
    generatedBehaviors: state.generatedBehaviors.map((item) => item.id === generationId ? { ...item, generatedActions: fixedActions, timingMs: fixedTimings, validation: 'Pending', validationErrors: [], validationWarnings: [], validatedAt: null, status: 'Generated', replayStatus: 'Not started' } : item),
  }))
  return currentState.generatedBehaviors.find((item) => item.id === generationId) ?? null
}

export function requestValidatedReplay(generationId: string) {
  const generation = currentState.generatedBehaviors.find((item) => item.id === generationId)
  if (!generation || generation.validation !== 'Passed') return false
  updatePrototypeState((state) => state.generatedBehaviors.some((item) => item.id === generationId && item.validation === 'Passed') ? { ...state, replayGenerationId: generationId } : state)
  return currentState.replayGenerationId === generationId
}

export function selectReplayGeneration(generationId: string) {
  if (!currentState.generatedBehaviors.some((generation) => generation.id === generationId)) return
  updatePrototypeState((state) => ({ ...state, replayGenerationId: generationId }))
}

function nextReplayId(state: PrototypeState) {
  const nextNumber = state.replays.reduce((highest, replay) => {
    const match = /^REPLAY-(\d+)$/.exec(replay.id)
    return match ? Math.max(highest, Number(match[1])) : highest
  }, 0) + 1
  return `REPLAY-${String(nextNumber).padStart(3, '0')}`
}

function protocolForGeneration(state: PrototypeState, generation: GeneratedBehavior): SimulationProtocol {
  const session = state.sessions.find((item) => item.id === generation.sourceSessionId)
  if (generation.target === 'MQTT Broker' || session?.service.includes('MQTT') || generation.generatedActions.some((action) => action.startsWith('mqtt_') || action === 'topic_discovery')) return 'MQTT'
  if (generation.target === 'SSH Service' || session?.service.includes('SSH')) return 'SSH'
  return 'Web'
}

function updateReplayStatus(replayId: string, status: PrototypeState['replays'][number]['status'], completedAt: string | null = null) {
  updatePrototypeState((state) => {
    const replay = state.replays.find((item) => item.id === replayId)
    if (!replay) return state
    return {
      ...state,
      replays: state.replays.map((item) => item.id === replayId ? { ...item, status, completedAt } : item),
      generatedBehaviors: state.generatedBehaviors.map((generation) => generation.id === replay.generationId ? { ...generation, replayStatus: status } : generation),
    }
  })
}

function failReplay(replayId: string) {
  clearReplayTimer(replayId)
  updateReplayStatus(replayId, 'Failed', new Date().toISOString())
}

function processNextReplayAction(replayId: string) {
  const replay = currentState.replays.find((item) => item.id === replayId)
  const generation = replay && currentState.generatedBehaviors.find((item) => item.id === replay.generationId)
  if (!replayId || !replay || replay.status !== 'Running') return
  if (!generation || generation.validation !== 'Passed') { failReplay(replayId); return }
  if (replay.currentActionIndex >= generation.generatedActions.length) {
    updateReplayStatus(replayId, 'Collecting Trace')
    replayTimers.set(replayId, setTimeout(() => {
      replayTimers.delete(replayId)
      const latest = currentState.replays.find((item) => item.id === replayId)
      if (latest?.status === 'Collecting Trace') {
        updateReplayStatus(replayId, 'Completed', new Date().toISOString())
        evaluatePrototypeData()
      }
    }, 450))
    return
  }
  const index = replay.currentActionIndex
  const trace = {
    id: `${replay.id}-TRACE-${String(currentState.generatedTraces.filter((item) => item.replayId === replay.id).length + 1).padStart(3, '0')}`,
    replayId: replay.id,
    generationId: generation.id,
    runId: generation.runId,
    timestamp: new Date().toISOString(),
    action: generation.generatedActions[index],
    target: generation.target,
    protocol: replay.protocol,
    source: 'replayed' as const,
    status: 'Completed' as const,
  }
  updatePrototypeState((state) => ({
    ...state,
    generatedTraces: [...state.generatedTraces, trace],
    replays: state.replays.map((item) => item.id === replayId ? { ...item, currentActionIndex: index + 1 } : item),
  }))
  const delay = Math.max(250, Math.min(700, generation.timingMs[index] || 500))
  replayTimers.set(replayId, setTimeout(() => {
    replayTimers.delete(replayId)
    processNextReplayAction(replayId)
  }, delay))
}

export function startReplay(generationId: string) {
  const generation = currentState.generatedBehaviors.find((item) => item.id === generationId)
  if (!generation || generation.validation !== 'Passed') return null
  const active = currentState.replays.find((item) => item.id === currentState.activeReplayId)
  if (active && ['Preparing', 'Connecting Testbed', 'Running', 'Paused', 'Collecting Trace'].includes(active.status)) return null
  const replayId = nextReplayId(currentState)
  const replay = {
    id: replayId,
    generationId: generation.id,
    runId: generation.runId,
    sourceSequenceId: generation.sourceSequenceId,
    target: generation.target,
    protocol: protocolForGeneration(currentState, generation),
    status: 'Preparing' as const,
    startedAt: new Date().toISOString(),
    completedAt: null,
    currentActionIndex: 0,
  }
  updatePrototypeState((state) => ({
    ...state,
    activeReplayId: replayId,
    replayGenerationId: generationId,
    replays: [...state.replays, replay],
    generatedBehaviors: state.generatedBehaviors.map((item) => item.id === generationId ? { ...item, replayStatus: 'Preparing' } : item),
  }))
  replayTimers.set(replayId, setTimeout(() => {
    replayTimers.delete(replayId)
    const latest = currentState.replays.find((item) => item.id === replayId)
    if (latest?.status !== 'Preparing') return
    const linkedGeneration = currentState.generatedBehaviors.find((item) => item.id === generationId)
    if (!linkedGeneration || linkedGeneration.validation !== 'Passed') { failReplay(replayId); return }
    updateReplayStatus(replayId, 'Connecting Testbed')
    replayTimers.set(replayId, setTimeout(() => {
      replayTimers.delete(replayId)
      const connecting = currentState.replays.find((item) => item.id === replayId)
      if (connecting?.status !== 'Connecting Testbed') return
      updateReplayStatus(replayId, 'Running')
      replayTimers.set(replayId, setTimeout(() => {
        replayTimers.delete(replayId)
        processNextReplayAction(replayId)
      }, 300))
    }, 400))
  }, 350))
  return replayId
}

export function pauseReplay() {
  const replayId = currentState.activeReplayId
  const replay = currentState.replays.find((item) => item.id === replayId)
  if (!replayId || !replay || replay.status !== 'Running') return
  clearReplayTimer(replayId)
  updateReplayStatus(replayId, 'Paused')
}

export function resumeReplay() {
  const replayId = currentState.activeReplayId
  const replay = currentState.replays.find((item) => item.id === replayId)
  if (!replayId || !replay || replay.status !== 'Paused') return
  updateReplayStatus(replayId, 'Running')
  replayTimers.set(replayId, setTimeout(() => {
    replayTimers.delete(replayId)
    processNextReplayAction(replayId)
  }, 200))
}

export function stopReplay() {
  const replayId = currentState.activeReplayId
  const replay = currentState.replays.find((item) => item.id === replayId)
  if (!replayId || !replay || ['Completed', 'Failed', 'Stopped'].includes(replay.status)) return
  clearReplayTimer(replayId)
  updateReplayStatus(replayId, 'Stopped', new Date().toISOString())
}

export function resetReplay() {
  const replayId = currentState.activeReplayId
  if (!replayId) return
  clearReplayTimer(replayId)
  const replay = currentState.replays.find((item) => item.id === replayId)
  updatePrototypeState((state) => ({
    ...state,
    activeReplayId: null,
    replays: state.replays.filter((item) => item.id !== replayId),
    generatedTraces: state.generatedTraces.filter((trace) => trace.replayId !== replayId),
    generatedBehaviors: state.generatedBehaviors.map((generation) => generation.id === replay?.generationId ? { ...generation, replayStatus: 'Not started' } : generation),
  }))
}
