import csv
import json
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


BASE_INVENTORY_ITEMS: Dict[str, Dict[str, str]] = {
    "new_cpu": {
        "id": "new_cpu",
        "name": "Second CPU (New)",
        "shortLabel": "Second CPU",
        "description": "New CPU",
    },
    "hand": {
        "id": "hand",
        "name": "Hand Tool",
        "shortLabel": "Hand Tool",
        "description": "Use your hands to unplug cables and move parts.",
    },
    "esd_strap": {
        "id": "esd_strap",
        "name": "Wrist Strap",
        "shortLabel": "Wrist Strap",
        "description": "Anti-static strap",
    },
    "screwdriver": {
        "id": "screwdriver",
        "name": "Screwdriver",
        "shortLabel": "Screwdriver",
        "description": "Phillips screwdriver for the cooler",
    },
    "wipe": {
        "id": "wipe",
        "name": "Alcohol Wipes",
        "shortLabel": "Alcohol Wipes",
        "description": "Used to clean old thermal paste off the cpu",
    },
    "thermal_paste": {
        "id": "thermal_paste",
        "name": "Thermal Paste",
        "shortLabel": "Thermal Paste",
        "description": "Put a small dot on the new CPU",
    },
    "cpu_cooler_item": {
        "id": "cpu_cooler_item",
        "name": "CPU Cooler",
        "shortLabel": "CPU Cooler",
        "description": "The cooler you took off earlier",
    },
    "old_cpu_item": {
        "id": "old_cpu_item",
        "name": "Old CPU (Removed)",
        "shortLabel": "Old CPU",
        "description": "The old CPU you took out",
    },
}

CPU_REPLACEMENT_STEPS: List[Dict[str, Any]] = [
    {
        "stepNumber": 1,
        "title": "Turn off PSU",
        "targetComponentId": "psu_plug",
        "requiredToolId": "hand",
        "acceptedToolIds": ["hand"],
        "hazardWarning": None,
        "inventoryNote": "",
    },
    {
        "stepNumber": 2,
        "title": "Put on wrist strap",
        "targetComponentId": "esd_ground",
        "requiredToolId": "esd_strap",
        "acceptedToolIds": ["esd_strap"],
        "hazardWarning": None,
        "inventoryNote": "",
    },
    {
        "stepNumber": 3,
        "title": "Unplug CPU fan",
        "targetComponentId": "fan_header",
        "requiredToolId": "hand",
        "acceptedToolIds": ["hand"],
        "hazardWarning": None,
        "inventoryNote": "",
    },
    {
        "stepNumber": 4,
        "title": "Take off cooler",
        "targetComponentId": "cpu_cooler",
        "requiredToolId": "screwdriver",
        "acceptedToolIds": ["screwdriver"],
        "hazardWarning": {
            "id": "hazard_hot_heatsink",
            "title": "Hold on - Heatsink is still hot!",
            "message": "The cooler is still hot from being on. Click OK before taking it off.",
        },
        "inventoryNote": " Cooler moved to inventory.",
    },
    {
        "stepNumber": 5,
        "title": "Clean old thermal paste",
        "targetComponentId": "cpu_socket",
        "requiredToolId": "wipe",
        "acceptedToolIds": ["wipe"],
        "hazardWarning": None,
        "inventoryNote": "",
    },
    {
        "stepNumber": 6,
        "title": "Open socket bar",
        "targetComponentId": "socket_lever",
        "requiredToolId": "hand",
        "acceptedToolIds": ["hand"],
        "hazardWarning": None,
        "inventoryNote": "",
    },
    {
        "stepNumber": 7,
        "title": "Take out old CPU",
        "targetComponentId": "cpu_socket",
        "requiredToolId": "hand",
        "acceptedToolIds": ["hand"],
        "hazardWarning": None,
        "inventoryNote": " Old CPU moved to inventory.",
    },
    {
        "stepNumber": 8,
        "title": "Put in new CPU",
        "targetComponentId": "cpu_socket",
        "requiredToolId": "new_cpu",
        "acceptedToolIds": ["new_cpu", "hand"],
        "hazardWarning": {
            "id": "hazard_bent_pins",
            "title": "Careful - Socket pins!",
            "message": "Be careful with the CPU pins in the socket. Click OK before putting the cpu in.",
        },
        "inventoryNote": " New CPU put in.",
    },
    {
        "stepNumber": 9,
        "title": "Close socket bar",
        "targetComponentId": "socket_lever",
        "requiredToolId": "hand",
        "acceptedToolIds": ["hand"],
        "hazardWarning": None,
        "inventoryNote": "",
    },
    {
        "stepNumber": 10,
        "title": "Put thermal paste",
        "targetComponentId": "cpu_socket",
        "requiredToolId": "thermal_paste",
        "acceptedToolIds": ["thermal_paste"],
        "hazardWarning": None,
        "inventoryNote": "",
    },
    {
        "stepNumber": 11,
        "title": "Put cooler back",
        "targetComponentId": "cpu_cooler",
        "requiredToolId": "cpu_cooler_item",
        "acceptedToolIds": ["cpu_cooler_item", "hand"],
        "hazardWarning": None,
        "inventoryNote": " Cooler placed back.",
    },
    {
        "stepNumber": 12,
        "title": "Screw cooler back in",
        "targetComponentId": "cpu_cooler",
        "requiredToolId": "screwdriver",
        "acceptedToolIds": ["screwdriver"],
        "hazardWarning": None,
        "inventoryNote": " Screws tightened.",
    },
    {
        "stepNumber": 13,
        "title": "Plug fan cable back in",
        "targetComponentId": "fan_header",
        "requiredToolId": "hand",
        "acceptedToolIds": ["hand"],
        "hazardWarning": None,
        "inventoryNote": "",
    },
    {
        "stepNumber": 14,
        "title": "Turn PSU back on",
        "targetComponentId": "psu_plug",
        "requiredToolId": "hand",
        "acceptedToolIds": ["hand"],
        "hazardWarning": None,
        "inventoryNote": "",
    },
]


class ResultsStorage:
    """Handles saving and exporting experiment results in JSON and CSV formats."""

    CSV_HEADERS = [
        "session_id",
        "timestamp",
        "player",
        "mode",
        "cpu_model",
        "total_time_sec",
        "avg_step_time_sec",
        "total_errors",
        "wrong_part_errors",
        "wrong_tool_errors",
        "safety_violations",
        "pause_count",
        "total_paused_sec",
        "hazards_acted_on",
        "avg_hazard_reaction_ms",
        "overheated",
    ]

    def __init__(self, output_dir: str = "results") -> None:
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.json_path = self.output_dir / "experiment_results.json"
        self.csv_path = self.output_dir / "experiment_results.csv"
        self._lock = threading.Lock()

    def load_all(self) -> List[Dict[str, Any]]:
        if not self.json_path.exists():
            return []
        try:
            return json.loads(self.json_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return []

    def save_record(self, summary: Dict[str, Any]) -> List[Dict[str, Any]]:
        with self._lock:
            records = [
                r for r in self.load_all() if r.get("sessionId") != summary["sessionId"]
            ]
            records.append(summary)

            # Save full structured log as JSON
            self.json_path.write_text(
                json.dumps(records, indent=2), encoding="utf-8"
            )

            # Rewrite CSV so it stays synchronized with JSON
            with self.csv_path.open("w", newline="", encoding="utf-8") as csv_file:
                writer = csv.writer(csv_file)
                writer.writerow(self.CSV_HEADERS)
                for r in records:
                    writer.writerow([
                        r["sessionId"],
                        r["timestampIso"],
                        r["participantId"],
                        r["condition"],
                        r["cpuModel"],
                        r["totalTimeSec"],
                        r["avgStepTimeSec"],
                        r["totalErrors"],
                        r["wrongComponentErrors"],
                        r["wrongToolErrors"],
                        r["safetyViolations"],
                        r["pauseCount"],
                        r["totalPausedSec"],
                        f"{r['hazardsActedOn']}/{r['hazardsTriggered']}",
                        r["avgHazardReactionMs"],
                        r["overheated"],
                    ])

            return records


class SimulationSession:
    """
    Manages simulation progress, action validation, mistake counting,
    completion timing, and pause tracking for a single experiment run.
    """

    def __init__(
        self,
        participant_id: str = "Player 1",
        condition: str = "ar_overlay",
        cpu_model: str = "intel_i5",
    ) -> None:
        now_epoch_ms = int(time.time() * 1000)
        now_mono = time.monotonic()

        self.session_id = f"run_{now_epoch_ms}"
        self.timestamp_iso = datetime.now(timezone.utc).isoformat()
        self.participant_id = participant_id
        self.condition = condition
        self.cpu_model = cpu_model
        self.total_steps = len(CPU_REPLACEMENT_STEPS)

        # Simulation progress state
        self.current_step_index = 0
        self.is_finished = False
        self.overheated = False
        self.final_summary: Optional[Dict[str, Any]] = None

        # Completion timing state (monotonic clock avoids system-time drift)
        self._start_time = now_mono
        self._step_start_time = now_mono
        self.step_times_sec: List[Dict[str, Any]] = []

        # Pause tracking state
        self.is_paused = False
        self._pause_start: Optional[float] = None
        self.total_paused_sec = 0.0
        self.pause_count = 0
        self.pause_log: List[Dict[str, Any]] = []

        # Mistake and hazard tracking state
        self.errors: List[Dict[str, Any]] = []
        self.hazard_events: List[Dict[str, Any]] = []
        self.active_hazard: Optional[Dict[str, Any]] = None

        self._sync_step_hazard()

    @property
    def current_step(self) -> Dict[str, Any]:
        return CPU_REPLACEMENT_STEPS[self.current_step_index]

    def _sync_step_hazard(self) -> None:
        """Activates the hazard banner if the current step defines one."""
        hazard = self.current_step.get("hazardWarning")
        if hazard:
            if not self.active_hazard or self.active_hazard["id"] != hazard["id"]:
                self.active_hazard = {
                    "id": hazard["id"],
                    "title": hazard["title"],
                    "message": hazard["message"],
                    "shown_at": time.monotonic(),
                    "acknowledged": False,
                }
        else:
            self.active_hazard = None

    def get_active_elapsed_sec(self) -> float:
        """Returns active elapsed time excluding paused intervals."""
        now = time.monotonic()
        ongoing_pause = (now - self._pause_start) if (self.is_paused and self._pause_start) else 0.0
        return round(max(0.0, (now - self._start_time) - (self.total_paused_sec + ongoing_pause)), 2)

    def _record_error(self, error_type: str, detail: str) -> Dict[str, Any]:
        entry = {
            "stepNumber": self.current_step["stepNumber"],
            "errorType": error_type,
            "detail": detail,
            "timestampMs": int(time.time() * 1000),
        }
        self.errors.append(entry)
        return entry

    def validate_action(
        self, clicked_component_id: str, selected_tool_id: str
    ) -> Dict[str, Any]:
        """Validates a user click + equipped tool against the current step."""
        if self.is_finished:
            return {
                "valid": False,
                "errorType": "session_finished",
                "message": "Simulation is already complete.",
                "state": self.get_state(),
            }

        # Do not count clicks while paused as mistakes
        if self.is_paused:
            return {
                "valid": False,
                "errorType": "paused_interaction",
                "message": "Game is paused! Click Resume first",
                "state": self.get_state(),
            }

        # Enforce hazard acknowledgement before interacting with parts
        if self.active_hazard and not self.active_hazard["acknowledged"]:
            msg = "Click OK on the warning banner before clicking anything."
            self._record_error("unacknowledged_hazard", msg)
            return {
                "valid": False,
                "errorType": "unacknowledged_hazard",
                "message": msg,
                "state": self.get_state(),
            }

        step = self.current_step

        # Check clicked component
        if clicked_component_id != step["targetComponentId"]:
            msg = "Wrong part!"
            self._record_error("wrong_component", msg)
            return {
                "valid": False,
                "errorType": "wrong_component",
                "message": msg,
                "state": self.get_state(),
            }

        # Check equipped tool
        accepted_tools = step.get("acceptedToolIds") or [step["requiredToolId"]]
        if selected_tool_id not in accepted_tools:
            req_item = BASE_INVENTORY_ITEMS.get(step["requiredToolId"])
            req_label = req_item["shortLabel"] if req_item else step["requiredToolId"]
            msg = f"Wrong tool! You need {req_label}"
            self._record_error("wrong_tool", msg)
            return {
                "valid": False,
                "errorType": "wrong_tool",
                "message": msg,
                "state": self.get_state(),
            }

        # Action is valid -> record step completion time and advance progress
        now = time.monotonic()
        step_duration = max(0.1, round(now - self._step_start_time, 2))
        step_errors = sum(
            1 for e in self.errors if e["stepNumber"] == step["stepNumber"]
        )

        self.step_times_sec.append({
            "stepNumber": step["stepNumber"],
            "stepTitle": step["title"],
            "durationSec": step_duration,
            "errorsOnStep": step_errors,
        })
        self._step_start_time = now

        message = f"Step {step['stepNumber']} done!{step['inventoryNote']}"
        completed_all = self.current_step_index >= self.total_steps - 1

        if not completed_all:
            self.current_step_index += 1
            self._sync_step_hazard()

        return {
            "valid": True,
            "errorType": None,
            "message": message,
            "completed": completed_all,
            "stepDurationSec": step_duration,
            "state": self.get_state(),
        }

    def toggle_pause(self) -> Dict[str, Any]:
        """Toggles pause/resume and tracks pause count and duration."""
        now = time.monotonic()

        if not self.is_paused:
            self.is_paused = True
            self.pause_count += 1
            self._pause_start = now
            self.pause_log.append({
                "stepNumber": self.current_step["stepNumber"],
                "startedAtIso": datetime.now(timezone.utc).isoformat(),
                "durationSec": None,
            })
            message = "Paused. Timer stopped until you click Resume"
        else:
            self.is_paused = False
            if self._pause_start is not None:
                paused_delta = now - self._pause_start
                self.total_paused_sec += paused_delta
                self._step_start_time += paused_delta
                self._pause_start = None
                if self.pause_log and self.pause_log[-1]["durationSec"] is None:
                    self.pause_log[-1]["durationSec"] = round(paused_delta, 2)
            message = "Resumed."

        return {
            "isPaused": self.is_paused,
            "message": message,
            "state": self.get_state(),
        }

    def acknowledge_hazard(self) -> Dict[str, Any]:
        """Records reaction time when the user acknowledges an active safety warning."""
        if not self.active_hazard:
            return {"acknowledged": False, "state": self.get_state()}

        reaction_ms = max(0, round((time.monotonic() - self.active_hazard["shown_at"]) * 1000))
        self.hazard_events.append({
            "hazardId": self.active_hazard["id"],
            "stepNumber": self.current_step["stepNumber"],
            "reactionTimeMs": reaction_ms,
            "actedProperly": True,
        })
        self.active_hazard["acknowledged"] = True
        self.pause_count += 1

        return {
            "acknowledged": True,
            "reactionTimeMs": reaction_ms,
            "message": "Ok, safe to continue",
            "state": self.get_state(),
        }

    def go_to_previous_step(self) -> Dict[str, Any]:
        """Moves simulation progress back one step."""
        if self.current_step_index > 0:
            self.current_step_index -= 1
            self.active_hazard = None
            self._sync_step_hazard()
            self._step_start_time = time.monotonic()

        return {
            "message": f"Went back to Step {self.current_step['stepNumber']}",
            "state": self.get_state(),
        }

    def finalize(self, overheated: bool = False) -> Dict[str, Any]:
        """Computes final experiment metrics and closes the session."""
        if self.is_finished and self.final_summary is not None:
            return self.final_summary

        # Close out any active pause before computing total active time
        if self.is_paused and self._pause_start is not None:
            paused_delta = time.monotonic() - self._pause_start
            self.total_paused_sec += paused_delta
            self._pause_start = None
            self.is_paused = False

        self.is_finished = True
        self.overheated = bool(overheated)

        total_time_sec = max(0.1, self.get_active_elapsed_sec())
        avg_step_time_sec = (
            round(
                sum(s["durationSec"] for s in self.step_times_sec)
                / len(self.step_times_sec),
                2,
            )
            if self.step_times_sec
            else 0.0
        )

        wrong_component_errors = sum(
            1 for e in self.errors if e["errorType"] == "wrong_component"
        )
        wrong_tool_errors = sum(
            1 for e in self.errors if e["errorType"] == "wrong_tool"
        )
        safety_violations = sum(
            1 for e in self.errors if e["errorType"] == "unacknowledged_hazard"
        )

        hazards_triggered = len(self.hazard_events)
        hazards_acted_on = sum(1 for h in self.hazard_events if h["actedProperly"])
        avg_hazard_reaction_ms = (
            round(
                sum(h["reactionTimeMs"] for h in self.hazard_events)
                / hazards_triggered
            )
            if hazards_triggered > 0
            else 0
        )

        self.final_summary = {
            "sessionId": self.session_id,
            "timestampIso": self.timestamp_iso,
            "participantId": self.participant_id,
            "condition": self.condition,
            "cpuModel": self.cpu_model,
            "totalSteps": self.total_steps,
            "totalTimeSec": total_time_sec,
            "avgStepTimeSec": avg_step_time_sec,
            "totalErrors": len(self.errors),
            "wrongComponentErrors": wrong_component_errors,
            "wrongToolErrors": wrong_tool_errors,
            "safetyViolations": safety_violations,
            "pauseCount": self.pause_count,
            "totalPausedSec": round(self.total_paused_sec, 2),
            "hazardsTriggered": hazards_triggered,
            "hazardsActedOn": hazards_acted_on,
            "avgHazardReactionMs": avg_hazard_reaction_ms,
            "overheated": self.overheated,
            "stepTimesSec": self.step_times_sec,
            "pauseLog": self.pause_log,
        }
        return self.final_summary

    def get_state(self) -> Dict[str, Any]:
        """Returns the current simulation state for frontend rendering."""
        hazard_payload = None
        if self.active_hazard and not self.active_hazard["acknowledged"]:
            hazard_payload = {
                "id": self.active_hazard["id"],
                "title": self.active_hazard["title"],
                "message": self.active_hazard["message"],
            }

        return {
            "sessionId": self.session_id,
            "currentStepIndex": self.current_step_index,
            "currentStepNumber": self.current_step["stepNumber"],
            "totalSteps": self.total_steps,
            "isPaused": self.is_paused,
            "isFinished": self.is_finished,
            "activeHazard": hazard_payload,
            "elapsedSec": self.get_active_elapsed_sec(),
            "errorCount": len(self.errors),
            "pauseCount": self.pause_count,
        }