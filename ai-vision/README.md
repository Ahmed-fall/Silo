## AI Vision Service

### Model
Pre-trained Keras wheat disease classification model
Source: https://www.kaggle.com/datasets/freedomfighter1290/wheat-disease/data
Input size: 255x255
Validation accuracy: 78.22%

### Classes (alphabetical order — index matters)
0: Aphid
1: Black Rust
2: Blast
3: Brown Rust
4: Fusarium Head Blight
5: Healthy Wheat
6: Leaf Blight
7: Mildew
8: Mite
9: Septoria
10: Smut
11: Stem fly
12: Tan spot
13: Yellow Rust

### Run
uvicorn app.main:app --port 8001 --reload

### Download model weights
Place final_model.keras at: ai-vision/app/model/weights/final_model.keras
Download from: https://www.kaggle.com/models/freedomfighter1290/wheat-disease-prediction/Keras/default/1?select=Final_model.keras