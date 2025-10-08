

import json
import subprocess
import os
import re
# Import the 'sys' module to check the operating system
import sys
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
# Force redeploy

# --- Configuration ---
# MODIFIED AGAIN: We need the full, absolute path to the Groovy executable.
GROOVY_PATH = "groovy"

DATA_DIR = "data"
# ... the rest of your app.py file remains exactly the same ...
QUESTIONS_FILE = os.path.join(DATA_DIR, "assigned_questions.json")
RESULTS_FILE = os.path.join(DATA_DIR, "results.json")
MARKS_PER_TEST_CASE = 5

# --- Boilerplate for setup ---
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)
if not os.path.exists(QUESTIONS_FILE):
    with open(QUESTIONS_FILE, 'w') as f: json.dump({}, f, indent=4)
if not os.path.exists(RESULTS_FILE):
    with open(RESULTS_FILE, 'w') as f: json.dump({}, f, indent=4)
try:
    with open(QUESTIONS_FILE, 'r') as f:
        all_assignments = json.load(f)
except (FileNotFoundError, json.JSONDecodeError) as e:
    print(f"ERROR: Could not load questions from '{QUESTIONS_FILE}'. Error: {e}")
    all_assignments = {}

def parse_groovy_error(stderr_string):
    if not stderr_string:
        return ""
    match = re.search(r"startup failed:((.|\n)*)", stderr_string)
    if not match:
        if stderr_string.startswith("Execution Error:"):
            return stderr_string
        return "An unknown error occurred during execution."
    error_details = match.group(1).strip()
    lines = error_details.splitlines()
    cleaned_lines = []
    for line in lines:
        cleaned_line = re.sub(r".*temp_runner\.groovy: \d+: ", "", line).strip()
        if cleaned_line and "1 error" not in cleaned_line:
            try:
                line_num_match = re.search(r"@ line (\d+)", cleaned_line)
                if line_num_match:
                    original_line_num = int(line_num_match.group(1))
                    user_code_line = original_line_num - 4
                    if user_code_line > 0:
                        cleaned_line = re.sub(r"@ line \d+", f"@ line {user_code_line}", cleaned_line)
            except (ValueError, IndexError):
                pass
            cleaned_lines.append(cleaned_line)
    return "Compilation Error:\n" + "\n".join(cleaned_lines) if cleaned_lines else "A compilation error occurred."

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/questions/<user_id>")
def get_questions(user_id):
    user_questions = all_assignments.get(user_id)
    if not user_questions:
        return jsonify({"error": f"No questions found for user '{user_id}'"}), 404
    questions_for_client = [q.copy() for q in user_questions]
    for q in questions_for_client:
        q.pop('hidden_test_cases', None)
    return jsonify(questions_for_client)

def run_groovy_script(script_content):
    temp_file = "temp_runner.groovy"
    with open(temp_file, "w", encoding='utf-8') as f:
        f.write(script_content)
    try:
        process = subprocess.Popen(
            [GROOVY_PATH, temp_file],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding='utf-8'
        )
        stdout, stderr = process.communicate(timeout=15)
        return stdout, stderr
    except subprocess.TimeoutExpired:
        return "", "Execution Error: Your code took too long to run and was terminated."
    finally:
        if os.path.exists(temp_file):
            os.remove(temp_file)

def get_canonical_json_from_groovy(groovy_literal):
    script = f"import groovy.json.JsonOutput; println JsonOutput.toJson({groovy_literal})"
    stdout, stderr = run_groovy_script(script)
    if stderr:
        print(f"SERVER ERROR: Could not convert expected_output to JSON. Error: {stderr}")
        return None
    return stdout.strip()

def run_groovy_test(user_code, test_input):
    full_code = f"""
import groovy.json.JsonOutput;
def input = {test_input}
// --- User's full script starts below ---
{user_code}
"""
    stdout, stderr = run_groovy_script(full_code)
    if stderr:
        cleaned_error = parse_groovy_error(stderr)
        return cleaned_error, "Error"
    return stdout.strip(), "Success"

@app.route("/api/run", methods=["POST"])
def run_code():
    data = request.json
    user_code = data.get("code", "")
    question_id = data.get("question_id")
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error": "User ID is missing."}), 400
    user_questions = all_assignments.get(user_id)
    if not user_questions:
        return jsonify({"error": f"Invalid user '{user_id}'"}), 404
    try:
        question = next(q for q in user_questions if q["question_id"] == question_id)
    except StopIteration:
        return jsonify({"error": "Question not found."}), 404
    all_test_cases = question.get("sample_test_cases", []) + question.get("hidden_test_cases", [])
    results = []
    all_passed = bool(all_test_cases)
    current_score = 0
    for i, test_case in enumerate(all_test_cases):
        is_hidden = i >= len(question.get("sample_test_cases", []))
        user_output_json, run_status = run_groovy_test(user_code, test_case["input"])
        test_result = {"test_case_id": i + 1, "hidden": is_hidden}
        if run_status == "Error":
            status = "Error"
            all_passed = False
            if not is_hidden:
                test_result["user_output"] = user_output_json
        else:
            expected_output_json = get_canonical_json_from_groovy(test_case["expected_output"])
            if expected_output_json is None:
                status = "Error"
                all_passed = False
                test_result["user_output"] = "Server Error: Could not parse expected output."
            elif user_output_json == expected_output_json:
                status = "Accepted"
                current_score += MARKS_PER_TEST_CASE
            else:
                status = "Failed"
                all_passed = False
        if not is_hidden:
            test_result["user_output"] = user_output_json
            test_result["input"] = test_case["input"]
            test_result["expected_output"] = test_case["expected_output"]
        test_result["status"] = status
        results.append(test_result)
    if not all_test_cases:
        overall_status = "No Test Cases"
        max_score = 0
    else:
        max_score = len(all_test_cases) * MARKS_PER_TEST_CASE
        if all_passed:
            overall_status = "Accepted"
        elif any(r['status'] == 'Error' for r in results):
            overall_status = "Error"
        else:
            overall_status = "Failed"
    return jsonify({
        "overall_status": overall_status,
        "results": results,
        "score": current_score,
        "max_score": max_score
    })

@app.route("/api/custom_run", methods=["POST"])
def custom_run():
    data = request.json
    user_code = data.get("code", "")
    custom_input = data.get("input", "")
    if not user_code:
        return jsonify({"output": "Your code is empty.", "status": "Error"})
    if not custom_input:
        custom_input = 'null'
    full_code = f"""
import groovy.json.JsonOutput;
def input = {custom_input}
// --- User's full script starts below ---
{user_code}
"""
    stdout, stderr = run_groovy_script(full_code)
    status = "Error" if stderr else "Success"
    output = parse_groovy_error(stderr) if stderr else stdout.strip()
    return jsonify({"output": output, "status": status})

@app.route("/api/save_results", methods=["POST"])
def save_results():
    data = request.json
    user_id = data.get("user_id")
    user_results = data.get("results")
    if not user_id or user_results is None:
        return jsonify({"error": "Missing user_id or results data."}), 400
    try:
        try:
            with open(RESULTS_FILE, 'r') as f:
                all_results = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            all_results = {}
        all_results[user_id] = user_results
        with open(RESULTS_FILE, 'w') as f:
            json.dump(all_results, f, indent=4)
        return jsonify({"message": "Test completed and results saved successfully!"}), 200
    except Exception as e:
        print(f"SERVER ERROR: Could not save results. Error: {e}")
        return jsonify({"error": "An error occurred while saving your results on the server."}), 500

# if __name__ == "__main__":
#     app.run(debug=True, host='0.0.0.0')
