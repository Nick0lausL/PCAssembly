// save in localStorage (no backend)
const STORAGE_KEY = 'pc_sim_logs';


function createMetricsSession(options) {
  let now = Date.now();
  return {
    sessionId: 'run_' + now,
    timestampIso: new Date(now).toISOString(),
    participantId: options.participantId || 'Player 1',
    condition: options.condition || 'ar_overlay',
    cpuModel: options.cpuModel || 'intel_i5',
    totalSteps: options.totalSteps || 14,
    startTimeMs: now,
    stepStartTimeMs: now,
    totalPausedMs: 0,
    pauseStartMs: null,
    pauseCount: 0,
    stepTimesSec: [],
    errors: [],
    hazardEvents: []
  };
}

function recordStepCompletion(session, stepNumber, stepTitle) {
    let nowMs = Date.now();
    let elapsedSec = Number(((nowMs - session.stepStartTimeMs) / 1000).toFixed(2));
    if (elapsedSec < 0.1) elapsedSec = 0.1;

    let stepErrors = 0;
    for (let i = 0; i < session.errors.length; i++) {
      if (session.errors[i].stepNumber === stepNumber) {
        stepErrors++;
      }
    }

    session.stepTimesSec.push({
      stepNumber: stepNumber,
      stepTitle: stepTitle,
      durationSec: elapsedSec,
      errorsOnStep: stepErrors
    });

    session.stepStartTimeMs = nowMs;
    return elapsedSec;
}

function recordError(session, stepNumber, errorType, detail) {
  let entry = {
    stepNumber: stepNumber,
    errorType: errorType,
    detail: detail,
    timestampMs: Date.now()
  };
  session.errors.push(entry);
  return entry;
}

function recordHazardResponse(session, hazardId, stepNumber, reactionTimeMs, actedProperly) {
  let entry = {
    hazardId: hazardId,
    stepNumber: stepNumber,
    reactionTimeMs: Math.max(0, Math.round(reactionTimeMs)),
    actedProperly: Boolean(actedProperly)
  };
  session.hazardEvents.push(entry);
  return entry;
}



function finalizeMetricsSummary(session) {
  let endTimeMs = Date.now();
  let rawTotalMs = Math.max(100, endTimeMs - session.startTimeMs - session.totalPausedMs);
  let totalTimeSec = Number((rawTotalMs / 1000).toFixed(2));

  let sum = 0;
  for (let i = 0; i < session.stepTimesSec.length; i++) {
    sum += session.stepTimesSec[i].durationSec;
  }
  let avgStepTimeSec = session.stepTimesSec.length > 0 ? Number((sum / session.stepTimesSec.length).toFixed(2)) : 0;

  let wrongComponentErrors = session.errors.filter((e) => e.errorType === 'wrong_component').length;
  let wrongToolErrors = session.errors.filter((e) => e.errorType === 'wrong_tool').length;
  let safetyViolations = session.errors.filter((e) => e.errorType === 'unacknowledged_hazard').length;

  let hazardCount = session.hazardEvents.length;
  let hazardsActedOn = session.hazardEvents.filter((h) => h.actedProperly).length;
  let totalReaction = 0;
  for (let i = 0; i < hazardCount; i++) {
    totalReaction += session.hazardEvents[i].reactionTimeMs;
  }
  let avgHazardReactionMs = hazardCount > 0 ? Math.round(totalReaction / hazardCount) : 0;

  return {
    sessionId: session.sessionId,
    timestampIso: session.timestampIso,
    participantId: session.participantId,
    condition: session.condition,
    cpuModel: session.cpuModel,
    totalSteps: session.totalSteps,
    totalTimeSec: totalTimeSec,
    avgStepTimeSec: avgStepTimeSec,
    totalErrors: session.errors.length,
    wrongComponentErrors: wrongComponentErrors,
    wrongToolErrors: wrongToolErrors,
    safetyViolations: safetyViolations,
    pauseCount: session.pauseCount,
    totalPausedSec: Number((session.totalPausedMs / 1000).toFixed(2)),
    hazardsTriggered: hazardCount,
    hazardsActedOn: hazardsActedOn,
    avgHazardReactionMs: avgHazardReactionMs,
    stepTimesSec: session.stepTimesSec
  };
}



function convertMetricsToCSV(records) {
    let headers = [
      'session_id',
      'timestamp',
      'player',
      'mode',
      'cpu_model',
      'total_time_sec',
      'avg_step_time_sec',
      'total_errors',
      'wrong_part_errors',
      'wrong_tool_errors',
      'safety_violations',
      'pause_count',
      'total_paused_sec',
      'hazards_acted_on',
      'avg_hazard_reaction_ms'
    ];

    let rows = records.map((r) => [
      r.sessionId,
      r.timestampIso,
      r.participantId,
      r.condition,
      r.cpuModel,
      r.totalTimeSec,
      r.avgStepTimeSec,
      r.totalErrors,
      r.wrongComponentErrors,
      r.wrongToolErrors,
      r.safetyViolations,
      r.pauseCount,
      r.totalPausedSec,
      r.hazardsActedOn + '/' + r.hazardsTriggered,
      r.avgHazardReactionMs
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

function loadSavedMetrics() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.log('couldnt load saved logs', err);
  }
  return [];
}

function saveMetricsRecord(summaryRecord) {
  let existing = loadSavedMetrics();
  let updated = existing.filter((r) => r.sessionId !== summaryRecord.sessionId);
  updated.push(summaryRecord);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.log('localStorage save failed', err);
  }

  return updated;
}

// blob download for csv/json
function downloadMetricsFile(records, format) {
  let isCsv = format !== 'json';
  let content = isCsv ? convertMetricsToCSV(records) : JSON.stringify(records, null, 2);
  let mimeType = isCsv ? 'text/csv;charset=utf-8;' : 'application/json;charset=utf-8;';
  let filename = isCsv ? 'pc_sim_logs.csv' : 'pc_sim_logs.json';

  let blob = new Blob([content], { type: mimeType });
  let url = URL.createObjectURL(blob);
  let link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
