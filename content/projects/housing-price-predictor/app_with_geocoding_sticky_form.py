
import pandas as pd
import joblib
from flask import Flask, request, render_template_string
from datetime import date
import requests

app = Flask(__name__)

# Load model, encoders, and dataset
model = joblib.load("model.pkl")
encoders = joblib.load("encoders.pkl")
df = pd.read_csv("cleaned_merged_with_scores.csv", low_memory=False)

# Define features
FEATURES = ['city', 'province', 'latitude', 'longitude', 'lease_term', 'type', 'beds', 'baths', 'sq_feet',
            'furnishing', 'availability_date', 'smoking', 'cats', 'dogs', 'Walk Score', 'Bike Score', 'studio']

# Extract dropdown values dynamically
dropdowns = {}
for col in ['province', 'city', 'lease_term', 'type', 'furnishing', 'availability_date', 'smoking']:
    dropdowns[col] = sorted(df[col].dropna().astype(str).unique().tolist())

dropdowns['studio'] = ['Yes', 'No']

# Group cities by province
province_city_map = df.dropna(subset=["city", "province"])
province_city_map = province_city_map.groupby("province")["city"].unique().apply(sorted).to_dict()

HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Housing Price Predictor</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1000px; margin: auto; padding: 2rem; }
        .form-grid { display: flex; flex-wrap: wrap; gap: 20px; }
        .form-group { flex: 1 1 45%; min-width: 300px; }
        label { display: block; font-weight: bold; margin-bottom: 5px; }
        input, select {
            width: 100%; padding: 10px; border-radius: 5px;
            border: 1px solid #ccc; box-sizing: border-box;
        }
        button {
            margin-top: 20px; padding: 12px 25px; font-size: 16px;
            background-color: #007bff; color: white; border: none; border-radius: 5px;
            cursor: pointer;
        }
        .result {
            margin-top: 30px; padding: 20px;
            background-color: #f1f1f1; border-radius: 10px;
            font-size: 20px; text-align: center;
        }
    </style>
    <script>
        const provinceCityMap = {{ province_city_map | tojson }};
        function updateCityOptions() {
            const province = document.querySelector('[name="province"]').value;
            const citySelect = document.querySelector('[name="city"]');
            citySelect.innerHTML = "";
            if (provinceCityMap[province]) {
                provinceCityMap[province].forEach(city => {
                    const opt = document.createElement("option");
                    opt.value = city;
                    opt.text = city;
                    citySelect.appendChild(opt);
                });
            }
        }

        async function fetchCoordinates() {
            const address = document.querySelector('[name="address"]').value;
            if (!address) return;
            const response = await fetch(`/geocode?q=` + encodeURIComponent(address));
            const data = await response.json();
            if (data.lat && data.lon) {
                document.querySelector('[name="latitude"]').value = data.lat;
                document.querySelector('[name="longitude"]').value = data.lon;
            } else {
                alert("Location not found. Try a different address.");
            }
        }

        document.addEventListener("DOMContentLoaded", () => {
            document.querySelector('[name="province"]').addEventListener("change", updateCityOptions);
            updateCityOptions();
        });
    </script>
</head>
<body>
    <h1>🏠 Housing Price Predictor</h1>
    <form method="POST">
        <div class="form-grid">
            <div class="form-group" style="flex: 1 1 100%;">
                <label>Address (optional – for coordinates)</label>
                <input type="text" name="address" id="address">
                <button type="button" onclick="fetchCoordinates()">Get Coordinates</button>
            </div>
            {% for field in features %}
                <div class="form-group">
                    <label>{{ field.replace("_", " ").title() }}</label>
                    {% if field == 'availability_date' %}
                        <input type="date" name="{{ field }}" min="{{ today }}" required>
                    {% elif field == 'province' %}
                        <select name="{{ field }}" required>
                            {% for option in dropdowns[field] %}
                                <option value="{{ option }}" {% if filled.get(field) == option %}selected{% endif %}>{{ option }}</option>
                            {% endfor %}
                        </select>
                    {% elif field == 'city' %}
                        <select name="{{ field }}" required></select>
                    {% elif field in dropdowns %}
                        <select name="{{ field }}" required>
                            {% for option in dropdowns[field] %}
                                <option value="{{ option }}" {% if filled.get(field) == option %}selected{% endif %}>{{ option }}</option>
                            {% endfor %}
                        </select>
                    {% else %}
                        <input type="text" name="{{ field }}" value="{{ filled.get(field, '') }}" required>
                    {% endif %}
                </div>
            {% endfor %}
        </div>
        <button type="submit">Predict Price</button>
    </form>

    {% if result is not none %}
        <div class="result">
            <strong>Predicted Rent:</strong> C${{ result }}
        </div>
    {% endif %}
</body>
</html>
"""

@app.route("/", methods=["GET", "POST"])
def home():
    result = None
    if request.method == "POST":
        data = {key: request.form[key] for key in FEATURES}
    filled = data.copy()
        data["studio"] = 1 if data["studio"].lower() == "yes" else 0
        df_input = pd.DataFrame([data])

        for col, le in encoders.items():
            if col in df_input:
                df_input[col] = le.transform([df_input[col].strip().lower()])[0]

        df_input = df_input.astype({
            "latitude": float, "longitude": float, "beds": float, "baths": float,
            "sq_feet": float, "cats": int, "dogs": int, "Walk Score": int,
            "Bike Score": int, "studio": int,
        })

        df_input = df_input[FEATURES]
        result = round(model.predict(df_input)[0], 2)

    return render_template_string(
        HTML_TEMPLATE,
        result=result,
        features=FEATURES,
        dropdowns=dropdowns,
        province_city_map=province_city_map,
        today=date.today().isoformat(),
        filled=filled
    )

@app.route("/geocode")
def geocode():
    from flask import request, jsonify
    address = request.args.get("q", "")
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": address, "format": "json", "limit": 1}
    headers = {"User-Agent": "HousingPredictionApp"}
    res = requests.get(url, params=params, headers=headers).json()
    if res:
        return jsonify(lat=res[0]["lat"], lon=res[0]["lon"])
    else:
        return jsonify(lat=None, lon=None)

if __name__ == '__main__':
    app.run(debug=True)
