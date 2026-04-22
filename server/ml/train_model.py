import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.multioutput import MultiOutputRegressor
import joblib
import os

# Get current folder
current_dir = os.path.dirname(__file__)

# Path to dataset
data_path = os.path.join(current_dir, "..", "data", "disaster_resource_dataset.csv")

# Read CSV file
df = pd.read_csv(data_path)

print("Dataset loaded successfully.")
print(df.head())

# Input features
X = df[["disasterType", "severity", "affectedPopulation"]]

# Output targets
y = df[["foodNeeded", "waterNeeded", "medicineNeeded"]]

# Preprocessing
categorical_features = ["disasterType", "severity"]
numeric_features = ["affectedPopulation"]

preprocessor = ColumnTransformer(
    transformers=[
        ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features),
        ("num", "passthrough", numeric_features),
    ]
)

# Model pipeline
model = Pipeline(steps=[
    ("preprocessor", preprocessor),
    ("regressor", MultiOutputRegressor(
        RandomForestRegressor(n_estimators=100, random_state=42)
    ))
])

# Train model
model.fit(X, y)

# Save model file
model_path = os.path.join(current_dir, "resource_prediction_model.pkl")
joblib.dump(model, model_path)

print("Model trained successfully.")
print(f"Model saved at: {model_path}")