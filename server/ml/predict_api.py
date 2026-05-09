from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import joblib
import os

app = Flask(__name__)
CORS(app)


def estimate_allocated_days(disaster_type, severity, affected_population):
    population = max(0, float(affected_population or 0))
    normalized_severity = str(severity or "medium").strip().lower()
    disaster_type_value = str(disaster_type or "").lower()

    severity_multipliers = {
        "low": 0.45,
        "medium": 0.75,
        "high": 1.1,
        "critical": 1.45,
    }
    severity_multiplier = severity_multipliers.get(normalized_severity, 0.75)

    if "flood" in disaster_type_value:
        disaster_type_multiplier = 1.1
    elif "earthquake" in disaster_type_value:
        disaster_type_multiplier = 1.25
    elif "cyclone" in disaster_type_value:
        disaster_type_multiplier = 1.2
    elif "fire" in disaster_type_value:
        disaster_type_multiplier = 0.9
    else:
        disaster_type_multiplier = 1

    days = (population / 1000.0) * (severity_multiplier / 0.75) * disaster_type_multiplier
    return max(1, int(days) if days.is_integer() else int(days) + 1)

# Load trained model
current_dir = os.path.dirname(__file__)
model_path = os.path.join(current_dir, "resource_prediction_model.pkl")
model = joblib.load(model_path)

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()

        disaster_type = data.get("disasterType")
        severity = data.get("severity")
        affected_population = data.get("affectedPopulation")

        if not disaster_type or not severity or affected_population is None:
            return jsonify({"message": "Missing required fields"}), 400

        # Create input row
        input_df = pd.DataFrame([{
            "disasterType": disaster_type,
            "severity": severity,
            "affectedPopulation": affected_population
        }])

        prediction = model.predict(input_df)[0]

        return jsonify({
            "foodNeeded": round(float(prediction[0])),
            "waterNeeded": round(float(prediction[1])),
            "medicineNeeded": round(float(prediction[2])),
            "allocatedDays": estimate_allocated_days(disaster_type, severity, affected_population)
        })

    except Exception as e:
        return jsonify({
            "message": "Prediction failed",
            "error": str(e)
        }), 500

if __name__ == "__main__":
    app.run(port=5001, debug=True)