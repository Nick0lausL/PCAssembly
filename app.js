
// state
let currentScreen = 'start';
let participantId = 'Player 1';
let cpuModel = 'intel_i5';
let condition = 'ar_overlay';
let enableSecondaryTask = true;

let currentStepIndex = 0;
let selectedToolId = 'hand';
let isPaused = false;
let activeHazard = null;
let coolantPsi = 50;

let metricsSession = null;
let sessionId = null;
let lastFinalizedSummary = null;
let savedRecords = [];
let uiTimerId = null;
let secondaryTimerId = null;



function initApp() {
  savedRecords = loadSavedMetrics();
  renderInventory();
  renderFullWrittenManual();
  bindEvents();
  updateStartScreenSummary();
}


// events
function bindEvents() {
  document.getElementById('brand-home-link').addEventListener('click', function (e) {
    e.preventDefault();
    switchScreen('start');
  });

  document.getElementById('nav-start-btn').addEventListener('click', function () {
    switchScreen('start');
  });

  document.getElementById('nav-sim-btn').addEventListener('click', function () {
      if (!sessionId) {
        startSimulation();
      } else {
        switchScreen('assembly');
      }
  });


  document.getElementById('nav-results-btn').addEventListener('click', function () {
    if (lastFinalizedSummary) {
      switchScreen('complete');
    } else {
      switchScreen('start');
    }
  });

  document.getElementById('top-export-csv-btn').addEventListener('click', function () {
    window.location.href = '/api/results/csv';
  });
  document.getElementById('complete-download-csv-btn').addEventListener('click', function () {
    window.location.href = '/api/results/csv';
  });
  document.getElementById('complete-download-json-btn').addEventListener('click', function () {
    window.location.href = '/api/results/json';
  });

  let modeButtons = document.querySelectorAll('[data-mode]');
  modeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      modeButtons.forEach(function (b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      condition = btn.getAttribute('data-mode') || 'ar_overlay';
      updateStartScreenSummary();
    });
  });

  let secondaryCheckbox = document.getElementById('secondary-task-checkbox');
  secondaryCheckbox.addEventListener('change', function (e) {
    enableSecondaryTask = e.target.checked;
  });





  document.getElementById('reset-config-btn').addEventListener('click', resetStartForm);
  document.getElementById('run-sim-btn').addEventListener('click', startSimulation);

  let cpuIconBtn = document.getElementById('cpu-icon-launch-btn');
  cpuIconBtn.addEventListener('click', startSimulation);

  let parts = document.querySelectorAll('.pc-part');
  parts.forEach(function (partEl) {
      partEl.addEventListener('click', function () {
        let compId = partEl.getAttribute('data-component-id');
        // console.log('clicked:', compId);
        if (compId) handleComponentInteraction(compId);
      });
  });

  document.getElementById('pause-resume-btn').addEventListener('click', togglePause);
  document.getElementById('acknowledge-hazard-btn').addEventListener('click', acknowledgeHazard);
  document.getElementById('step-back-btn').addEventListener('click', goToPreviousStep);

  // spacebar for coolant
  document.getElementById('stabilize-coolant-btn').addEventListener('click', stabilizeCoolant);
  window.addEventListener('keydown', function (e) {
    if (
      currentScreen === 'assembly' &&
      e.code === 'Space' &&
      document.activeElement.tagName !== 'BUTTON' &&
      document.activeElement.tagName !== 'INPUT'
    ) {
      e.preventDefault();
      stabilizeCoolant();
    }
  });

  document.getElementById('back-to-main-btn').addEventListener('click', function () {
    switchScreen('start');
  });
}



function switchScreen(screenName) {
    currentScreen = screenName;

    document.getElementById('start-screen').classList.toggle('active', screenName === 'start');
    document.getElementById('assembly-screen').classList.toggle('active', screenName === 'assembly');
    document.getElementById('complete-screen').classList.toggle('active', screenName === 'complete');

    document.getElementById('nav-start-btn').classList.toggle('active', screenName === 'start');
    document.getElementById('nav-sim-btn').classList.toggle('active', screenName === 'assembly');
    document.getElementById('nav-results-btn').classList.toggle('active', screenName === 'complete');

    if (screenName !== 'assembly') {
      stopSimulationTimers();
    }
}

function updateStartScreenSummary() {
  let condEl = document.getElementById('hero-summary-condition');
  if (condEl) {
    condEl.textContent = condition === 'written_manual' ? 'Mode: Written Manual' : 'Mode: AR Overlay';
  }
}

function resetStartForm() {
  condition = 'ar_overlay';
  enableSecondaryTask = true;

  document.getElementById('secondary-task-checkbox').checked = true;

  document.querySelectorAll('[data-mode]').forEach(function (b) {
    b.classList.toggle('active', b.getAttribute('data-mode') === 'ar_overlay');
  });

  updateStartScreenSummary();
}

async function startSimulation() {
  selectedToolId = 'hand';
  isPaused = false;
  activeHazard = null;
  coolantPsi = 50;

  const res = await fetch('/api/session/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participantId, condition, cpuModel })
  });
  const state = await res.json();

  sessionId = state.sessionId;
  currentStepIndex = state.currentStepIndex;

  let secCard = document.getElementById('secondary-task-card');
  secCard.style.display = enableSecondaryTask ? 'block' : 'none';

  let isManualOnly = condition === 'written_manual';
  document.getElementById('ar-step-panel').style.display = isManualOnly ? 'none' : 'block';
  document.getElementById('written-manual-panel').style.display = isManualOnly ? 'block' : 'none';

  switchScreen('assembly');
  syncHeaderFromState(state);
  renderCurrentStep();
  renderSecondaryTaskGauge();
  updateFeedbackBanner('Pick a tool and click a part', 'neutral');
  startSimulationTimers();
}



// icons
function getInventoryIconSvg(itemId) {
  if (itemId === 'new_cpu') {
    return `<svg width="24" height="24" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" fill="#0f5132" stroke="#10b981" stroke-width="1.5"/>
      <rect x="6" y="6" width="12" height="12" rx="1.5" fill="#cbd5e1"/>
      <polygon points="4.5,19.5 8,19.5 4.5,16" fill="#eab308"/>
    </svg>`;
  } else if (itemId === 'old_cpu_item') {
    return `<svg width="24" height="24" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>
      <rect x="6" y="6" width="12" height="12" rx="1.5" fill="#94a3b8"/>
    </svg>`;
  } else if (itemId === 'cpu_cooler_item') {
    return `<svg width="24" height="24" viewBox="0 0 24 24">
      <rect x="2" y="2" width="20" height="20" rx="3" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="7" fill="#090d16" stroke="#94a3b8" stroke-width="1.2"/>
      <circle cx="12" cy="12" r="2.5" fill="#38bdf8"/>
    </svg>`;
  } else if (itemId === 'hand') {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v0"/>
      <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v6"/>
      <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/>
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
    </svg>`;
  } else if (itemId === 'esd_strap') {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="1.8" stroke-linecap="round">
      <circle cx="10" cy="12" r="6"/>
      <path d="M16 12h3l-2 3 3 2-2 3"/>
    </svg>`;
  } else if (itemId === 'screwdriver') {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f8fafc" stroke-width="1.8" stroke-linecap="round">
      <path d="M14 10l7-7"/>
      <path d="M19 3h2v2"/>
      <rect x="4" y="13" width="8" height="5" rx="2" transform="rotate(-45 8 15.5)" fill="#0284c7" stroke="#38bdf8"/>
    </svg>`;
  } else if (itemId === 'wipe') {
    return `<svg width="24" height="24" viewBox="0 0 24 24">
      <rect x="4" y="4" width="16" height="16" rx="2" fill="#e0f2fe" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="12" y="14" text-anchor="middle" font-size="6.5" font-weight="700" fill="#0369a1">ALC</text>
    </svg>`;
  } else if (itemId === 'thermal_paste') {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round">
      <rect x="8" y="6" width="8" height="11" rx="1" fill="#334155"/>
      <path d="M12 2v4M9 2h6M10 17l2 5 2-5"/>
    </svg>`;
  }
  return '';
}

function renderInventory() {
  let container = document.getElementById('inventory-grid');
  if (!container) return;

  let currentStep = CPU_REPLACEMENT_STEPS[currentStepIndex] || CPU_REPLACEMENT_STEPS[0];
  let items = getInventoryItemsForStep(currentStep.stepNumber);

  // fallback to hand tool
  if (!items.some((item) => item.id === selectedToolId)) {
    selectedToolId = 'hand';
  }

  let showHint = condition !== 'written_manual';

  container.innerHTML = items
    .map(function (item) {
      let isSelected = item.id === selectedToolId;
      let isRecommended = showHint && currentStep.requiredToolId === item.id;
      let cls = 'inventory-slot';
      if (isSelected) cls += ' selected';
      if (isRecommended) cls += ' recommended';

      return `
        <button type="button" class="${cls}" data-inventory-id="${item.id}" title="${item.description}">
          ${getInventoryIconSvg(item.id)}
          <span>${item.shortLabel}</span>
        </button>
      `;
    })
    .join('');

  container.querySelectorAll('[data-inventory-id]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      let itemId = btn.getAttribute('data-inventory-id');
      if (itemId) selectInventoryItem(itemId);
    });
  });

  let activeItemObj = BASE_INVENTORY_ITEMS.find((i) => i.id === selectedToolId);
  let indicator = document.getElementById('active-tool-indicator');
  if (indicator && activeItemObj) {
    indicator.textContent = 'Equipped: ' + activeItemObj.shortLabel;
  }
}

function selectInventoryItem(itemId) {
  selectedToolId = itemId;
  renderInventory();
  let itemObj = BASE_INVENTORY_ITEMS.find((i) => i.id === itemId);
  if (itemObj) {
    updateFeedbackBanner('Equipped: ' + itemObj.shortLabel, 'neutral');
  }
}

function renderCurrentStep() {
  let step = CPU_REPLACEMENT_STEPS[currentStepIndex];
  if (!step) return;

  if (step.hazardWarning && (!activeHazard || activeHazard.id !== step.hazardWarning.id)) {
    triggerHazard(step.hazardWarning);
  } else if (!step.hazardWarning) {
    hideHazardBanner();
  }

  document.getElementById('assembly-step-heading').textContent =
    'Step ' + step.stepNumber + ' of ' + CPU_REPLACEMENT_STEPS.length + ': ' + step.title;

  document.getElementById('sim-condition-label').textContent =
    condition === 'written_manual' ? 'Mode: Written Manual' : 'Mode: AR Overlay';

  document.getElementById('sim-cpu-label').textContent =
    'CPU: ' + (CPU_MODELS[cpuModel] ? CPU_MODELS[cpuModel].name : 'Intel Core i5');

  let subtasksList = document.getElementById('current-step-subtasks');
  subtasksList.innerHTML = step.subtasks.map((st) => '<li>' + st + '</li>').join('');

  document.getElementById('step-back-btn').disabled = currentStepIndex === 0;

  updateMotherboardVisuals(step.stepNumber);
  renderAROverlay(step);
  renderInventory();
}


// update svg
function updateMotherboardVisuals(stepNumber) {
  let psuRocker = document.getElementById('svg-psu-rocker');
  if (psuRocker) {
    psuRocker.setAttribute('fill', stepNumber === 1 ? '#ef4444' : '#334155');
    psuRocker.setAttribute('stroke', stepNumber === 1 ? '#fca5a5' : '#64748b');
  }

  let esdCircle = document.getElementById('svg-esd-circle');
  if (esdCircle) {
    esdCircle.setAttribute('fill', stepNumber >= 3 ? '#10b981' : '#eab308');
    esdCircle.setAttribute('stroke', stepNumber >= 3 ? '#6ee7b7' : '#fef08a');
  }

  let fanWire = document.getElementById('svg-fan-wire');
  let isFanUnplugged = stepNumber >= 4 && stepNumber <= 13;
  if (fanWire) {
    fanWire.setAttribute('opacity', isFanUnplugged ? '0.18' : '1');
  }

  let coolerGroup = document.getElementById('svg-cooler-group');
  if (coolerGroup) {
    if (stepNumber >= 5 && stepNumber <= 10) {
      coolerGroup.style.opacity = '0.06';
      coolerGroup.style.pointerEvents = 'none';
    } else if (stepNumber === 11) {
      coolerGroup.style.opacity = '0.58';
      coolerGroup.style.pointerEvents = 'auto';
    } else if (stepNumber === 12) {
      coolerGroup.style.opacity = '0.9';
      coolerGroup.style.pointerEvents = 'auto';
    } else {
      coolerGroup.style.opacity = '1';
      coolerGroup.style.pointerEvents = 'auto';
    }
  }

  let oldPasteSmudge = document.getElementById('svg-old-paste-smudge');
  if (oldPasteSmudge) {
    oldPasteSmudge.setAttribute('opacity', stepNumber === 5 ? '0.92' : '0');
  }

  let leverState = document.getElementById('svg-lever-state');
  let leverBar = document.getElementById('svg-lever-bar');
  let isBarOpen = stepNumber >= 7 && stepNumber <= 9;
  if (leverState) {
    leverState.textContent = isBarOpen ? 'OPEN' : 'LOCKED';
    leverState.setAttribute('fill', isBarOpen ? '#38bdf8' : '#cbd5e1');
  }
  if (leverBar) {
    leverBar.setAttribute(
      'd',
      isBarOpen ? 'M 476 292 H 492 V 148 L 508 140' : 'M 476 292 H 492 V 184 L 502 178'
    );
  }

  let installedCpuGroup = document.getElementById('svg-installed-cpu-group');
  let socketLabel = document.getElementById('svg-socket-label');
  let freshPasteDot = document.getElementById('svg-thermal-paste-dot');

  if (installedCpuGroup) {
    installedCpuGroup.setAttribute('opacity', stepNumber === 8 ? '0.12' : '1');
  }

  if (socketLabel) {
    if (stepNumber <= 7) {
      socketLabel.textContent = 'OLD CPU';
    } else if (stepNumber === 8) {
      socketLabel.textContent = 'SOCKET';
    } else {
      socketLabel.textContent = 'NEW CPU';
    }
  }

  if (freshPasteDot) {
    freshPasteDot.setAttribute('opacity', stepNumber >= 11 ? '1' : '0');
  }
}

function renderAROverlay(step) {
  let overlayGroup = document.getElementById('ar-overlay-group');
  if (!overlayGroup) return;

  if (condition === 'written_manual') {
    overlayGroup.style.display = 'none';
    return;
  }

  overlayGroup.style.display = 'block';
  let targetComp = PC_COMPONENTS.find((c) => c.id === step.targetComponentId);
  if (!targetComp) return;

  let pad = 6;
  let rectEl = document.getElementById('ar-highlight-rect');
  if (rectEl) {
    rectEl.setAttribute('x', targetComp.x - pad);
    rectEl.setAttribute('y', targetComp.y - pad);
    rectEl.setAttribute('width', targetComp.width + pad * 2);
    rectEl.setAttribute('height', targetComp.height + pad * 2);
  }
}

function renderFullWrittenManual() {
  let container = document.getElementById('manual-full-text');
  if (!container) return;

  container.innerHTML = CPU_REPLACEMENT_STEPS.map(function (s) {
    return `
      <div class="manual-entry">
        <strong>Step ${s.stepNumber}: ${s.title}</strong>
        <p style="margin-top: 4px;">${s.instructionManual}</p>
      </div>
    `;
  }).join('');
}

async function handleComponentInteraction(clickedComponentId) {
  if (!sessionId) return;

  const res = await fetch(`/api/session/${sessionId}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      componentId: clickedComponentId,
      toolId: selectedToolId
    })
  });
  const result = await res.json();

  syncHeaderFromState(result.state);

  if (!result.valid) {
    updateFeedbackBanner(result.message, 'error');
    return;
  }

  updateFeedbackBanner(result.message, 'success');

  if (result.completed && result.summary) {
    stopSimulationTimers();
    lastFinalizedSummary = result.summary;
    renderCompleteScreen(result.summary);
    switchScreen('complete');
  } else {
    currentStepIndex = result.state.currentStepIndex;
    renderCurrentStep();
  }
}

async function goToPreviousStep() {
  if (!sessionId || currentStepIndex === 0) return;

  const res = await fetch(`/api/session/${sessionId}/back`, { method: 'POST' });
  const data = await res.json();

  currentStepIndex = data.state.currentStepIndex;
  activeHazard = null;
  syncHeaderFromState(data.state);
  renderCurrentStep();
  updateFeedbackBanner(data.message, 'neutral');
}

function updateFeedbackBanner(message, statusType) {
  let banner = document.getElementById('action-feedback');
  if (!banner) return;
  banner.textContent = message;
  banner.className = 'feedback-banner';
  if (statusType === 'success') banner.classList.add('success');
  if (statusType === 'error') banner.classList.add('error');
  if (statusType === 'warning') banner.classList.add('warning');
}



function triggerHazard(hazardObj) {
  activeHazard = {
    id: hazardObj.id,
    title: hazardObj.title,
    message: hazardObj.message,
    shownAtMs: Date.now(),
    acknowledged: false
  };

  document.getElementById('hazard-title-text').textContent = '▲ ' + hazardObj.title;
  document.getElementById('hazard-desc-text').textContent = hazardObj.message;
  document.getElementById('hazard-banner').classList.add('visible');

  updateFeedbackBanner('Wait! Click "OK, got it" on the warning first', 'warning');
}

function hideHazardBanner() {
  document.getElementById('hazard-banner').classList.remove('visible');
}

async function acknowledgeHazard() {
  if (!activeHazard || !sessionId) return;

  const res = await fetch(`/api/session/${sessionId}/hazard`, { method: 'POST' });
  const data = await res.json();

  activeHazard.acknowledged = true;
  hideHazardBanner();
  syncHeaderFromState(data.state);
  updateFeedbackBanner(data.message, 'success');
}

async function togglePause() {
  if (!sessionId) return;

  const res = await fetch(`/api/session/${sessionId}/pause`, { method: 'POST' });
  const data = await res.json();

  isPaused = data.isPaused;
  document.getElementById('pause-resume-btn').textContent = isPaused ? 'Resume' : 'Pause';
  document.getElementById('sim-status-label').textContent = isPaused ? '❚❚ PAUSED' : '● ACTIVE';
  syncHeaderFromState(data.state);
  updateFeedbackBanner(data.message, isPaused ? 'warning' : 'neutral');
}



// timers
function startSimulationTimers() {
  stopSimulationTimers();

  uiTimerId = setInterval(function () {
    if (isPaused || !sessionId) return;
    updateLiveMetricsHeader();
  }, 200);

  // coolant psi rises, game over at 100
  secondaryTimerId = setInterval(function () {
    if (isPaused || !sessionId || !enableSecondaryTask) return;

    coolantPsi = Math.min(100, coolantPsi + 4);
    renderSecondaryTaskGauge();

    if (coolantPsi >= 100) {
      finishSimulation(true);
    }
  }, 3600);
}

function stopSimulationTimers() {
  if (uiTimerId) {
    clearInterval(uiTimerId);
    uiTimerId = null;
  }
  if (secondaryTimerId) {
    clearInterval(secondaryTimerId);
    secondaryTimerId = null;
  }
}

function stabilizeCoolant() {
  if (isPaused || !sessionId) return;
  coolantPsi = 45;
  renderSecondaryTaskGauge();
}

function renderSecondaryTaskGauge() {
  let fillEl = document.getElementById('coolant-gauge-fill');
  let statusEl = document.getElementById('coolant-status-text');

  if (fillEl) {
    fillEl.style.width = coolantPsi + '%';
    fillEl.classList.toggle('elevated', coolantPsi > 65);
  }
  if (statusEl) {
    if (coolantPsi > 65) {
      statusEl.textContent = '▲ TOO HIGH (' + coolantPsi + ' PSI - Stabilize!)';
      statusEl.style.color = '#fca5a5';
    } else {
      statusEl.textContent = '● OK (' + coolantPsi + ' PSI)';
      statusEl.style.color = '#6ee7b7';
    }
  }
}
function syncHeaderFromState(state) {
  if (!state) return;
  document.getElementById('live-timer').textContent = state.elapsedSec.toFixed(1) + 's';
  document.getElementById('live-errors').textContent = state.errorCount;
  document.getElementById('live-pauses').textContent = state.pauseCount;
}

async function updateLiveMetricsHeader() {
  if (!sessionId || isPaused) return;
  const res = await fetch(`/api/session/${sessionId}/status`);
  if (res.ok) {
    const state = await res.json();
    syncHeaderFromState(state);
  }
}

async function finishSimulation(overheated) {
  stopSimulationTimers();
  if (!sessionId) return;

  const res = await fetch(`/api/session/${sessionId}/finish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ overheated: Boolean(overheated) })
  });
  const summary = await res.json();

  lastFinalizedSummary = summary;
  renderCompleteScreen(summary);
  switchScreen('complete');
}

function renderCompleteScreen(summary) {
  let headingEl = document.getElementById('complete-heading');
  let subtextEl = document.getElementById('complete-subtext');

  if (summary.overheated) {
    headingEl.textContent = 'Game Over! Coolant pressure hit 100 PSI';
    subtextEl.textContent =
      'The PC overheated before you finished. Press Spacebar to keep the coolant pressure down next time';
  } else {
    headingEl.textContent = 'Nice! You replaced the CPU!';
    subtextEl.textContent =
      'Your run is saved in your browser. You can also download the log below';
  }

  document.getElementById('log-participant-cond').textContent =
    summary.participantId + ' · ' + summary.condition;
  document.getElementById('log-total-time').textContent = summary.totalTimeSec + 's';
  document.getElementById('log-total-errors').textContent =
    summary.totalErrors + ' (' + summary.wrongComponentErrors + ' wrong part, ' + summary.wrongToolErrors + ' wrong tool)';
  document.getElementById('log-pauses-hazards').textContent =
    summary.pauseCount + ' Pauses · ' + summary.avgHazardReactionMs + ' ms avg reaction';
}

document.addEventListener('DOMContentLoaded', initApp);
