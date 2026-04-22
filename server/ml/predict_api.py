from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import joblib
import os

app = Flask(__name__)
CORS(app)

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
            "medicineNeeded": round(float(prediction[2]))
        })

    except Exception as e:
        return jsonify({
            "message": "Prediction failed",
            "error": str(e)
        }), 500

if __name__ == "__main__":
    app.run(port=5001, debug=True)