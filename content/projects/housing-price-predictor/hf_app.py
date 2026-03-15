
import gradio as gr
import pandas as pd
import joblib

# Load model and encoders
# These files should be in the same directory on Hugging Face
model = joblib.load("model.pkl")
encoders = joblib.load("encoders.pkl")

FEATURES = ['city', 'province', 'latitude', 'longitude', 'lease_term', 'type', 'beds', 'baths', 'sq_feet',
            'furnishing', 'availability_date', 'smoking', 'cats', 'dogs', 'Walk Score', 'Bike Score', 'studio']

def predict(province, city, unit_type, beds, baths, sqft, furnishing, cats, dogs, studio):
    # Prepare data for prediction
    data = {
        'province': province.lower(),
        'city': city.lower(),
        'type': unit_type.lower(),
        'beds': float(beds),
        'baths': float(baths),
        'sq_feet': float(sqft),
        'furnishing': furnishing.lower(),
        'cats': 1 if cats.lower() == 'yes' else 0,
        'dogs': 1 if dogs.lower() == 'yes' else 0,
        'studio': 1 if studio.lower() == 'yes' else 0,
        # Default/Neutral values for fields not in simple UI
        'latitude': 45.4215, # Ottawa default
        'longitude': -75.6972,
        'lease_term': 'long term',
        'availability_date': 'immediate',
        'smoking': 'non-smoking',
        'Walk Score': 50,
        'Bike Score': 50
    }
    
    df_input = pd.DataFrame([data])
    
    # Apply encoders
    for col, le in encoders.items():
        if col in df_input:
            # Handle unknown labels gracefully if needed
            try:
                df_input[col] = le.transform(df_input[col].astype(str).str.lower().str.strip())
            except ValueError:
                # If label is unknown, use the first class as fallback
                df_input[col] = le.transform([le.classes_[0]])

    # Ensure correct column order
    df_input = df_input[FEATURES]
    
    prediction = model.predict(df_input)[0]
    return float(round(prediction, 2))

# Create Gradio Interface
iface = gr.Interface(
    fn=predict,
    inputs=[
        gr.Textbox(label="Province"),
        gr.Textbox(label="City"),
        gr.Textbox(label="Type"),
        gr.Number(label="Beds"),
        gr.Number(label="Baths"),
        gr.Number(label="Sq Feet"),
        gr.Textbox(label="Furnishing"),
        gr.Radio(["Yes", "No"], label="Cats"),
        gr.Radio(["Yes", "No"], label="Dogs"),
        gr.Radio(["Yes", "No"], label="Studio")
    ],
    outputs=gr.Number(label="Predicted Price"),
    title="Canadian Housing Price Predictor API",
    description="API for predicting rental prices in Canada."
)

if __name__ == "__main__":
    iface.launch()
