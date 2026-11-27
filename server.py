from typing import Dict
from flask import Flask, jsonify, request, send_file, send_from_directory
from simulation import ResultsStorage, SimulationSession

app = Flask(__name__, static_folder=".", static_url_path="")

storage = ResultsStorage(output_dir="results")
active_sessions: Dict[str, SimulationSession] = {}


# --- Serve existing HTML / CSS / JS frontend ---
@app.route("/")
def serve_index():
    return send_from_directory(".", "index.html")


# --- Simulation API Endpoints ---
@app.route("/api/session/start", methods=["POST"])
def start_session():
    data = request.get_json(silent=True) or {}
    session = SimulationSession(
        participant_id=data.get("participantId", "Player 1"),
        condition=data.get("condition", "ar_overlay"),
        cpu_model=data.get("cpuModel", "intel_i5"),
    )
    active_sessions[session.session_id] = session
    return jsonify(session.get_state()), 201


@app.route("/api/session/<session_id>/status", methods=["GET"])
def get_session_status(session_id: str):
    session = active_sessions.get(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    return jsonify(session.get_state())


@app.route("/api/session/<session_id>/action", methods=["POST"])
def handle_action(session_id: str):
    session = active_sessions.get(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404

    data = request.get_json(silent=True) or {}
    clicked_component = data.get("componentId", "")
    selected_tool = data.get("toolId", "hand")

    result = session.validate_action(clicked_component, selected_tool)

    # Automatically finalize and save results when the final step succeeds
    if result.get("valid") and result.get("completed"):
        summary = session.finalize(overheated=False)
        storage.save_record(summary)
        result["summary"] = summary

    return jsonify(result)


@app.route("/api/session/<session_id>/pause", methods=["POST"])
def toggle_pause(session_id: str):
    session = active_sessions.get(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    return jsonify(session.toggle_pause())


@app.route("/api/session/<session_id>/hazard", methods=["POST"])
def acknowledge_hazard(session_id: str):
    session = active_sessions.get(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    return jsonify(session.acknowledge_hazard())


@app.route("/api/session/<session_id>/back", methods=["POST"])
def previous_step(session_id: str):
    session = active_sessions.get(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    return jsonify(session.go_to_previous_step())


@app.route("/api/session/<session_id>/finish", methods=["POST"])
def finish_session(session_id: str):
    """Used when the simulation ends early (e.g., coolant overheat)."""
    session = active_sessions.get(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404

    data = request.get_json(silent=True) or {}
    summary = session.finalize(overheated=bool(data.get("overheated", False)))
    storage.save_record(summary)
    return jsonify(summary)


# --- Export saved experiment results ---
@app.route("/api/results/json", methods=["GET"])
def export_results_json():
    if not storage.json_path.exists():
        return jsonify([])
    return send_file(storage.json_path, as_attachment=True, download_name="pc_sim_logs.json")


@app.route("/api/results/csv", methods=["GET"])
def export_results_csv():
    if not storage.csv_path.exists():
        return "No experiment results recorded yet.", 404
    return send_file(storage.csv_path, as_attachment=True, download_name="pc_sim_logs.csv")


if __name__ == "__main__":
    app.run(debug=True, port=5000)