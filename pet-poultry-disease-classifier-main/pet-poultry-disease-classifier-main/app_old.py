import os, sys, warnings
import torch
from torchvision import transforms
from PIL import Image
from flask import Flask, request, jsonify, render_template
import io
warnings.filterwarnings("ignore")
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.model import build_model

app = Flask(__name__)

NUM_CLASSES = 30
MODEL_PATH  = os.path.join(os.path.dirname(os.path.abspath(__file__)), "best_model.pth")
device      = torch.device("cuda" if torch.cuda.is_available() else "cpu")

print("Loading model...")
checkpoint   = torch.load(MODEL_PATH, map_location=device)
class_to_idx = checkpoint["class_to_idx"]
idx_to_class = {v: k for k, v in class_to_idx.items()}

model = build_model(NUM_CLASSES, device)
model.load_state_dict(checkpoint["model_state_dict"])
model.eval()
print(f"✅ Model loaded! Device: {device}")

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/predict", methods=["POST"])
def predict():
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file   = request.files["image"]
    img    = Image.open(io.BytesIO(file.read())).convert("RGB")
    tensor = transform(img).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs = model(tensor)
        probs   = torch.softmax(outputs, dim=1)[0]
        top_probs, top_indices = torch.topk(probs, k=5)

    results = []
    for prob, idx in zip(top_probs, top_indices):
        results.append({
            "class":      idx_to_class[idx.item()],
            "confidence": round(prob.item() * 100, 2)
        })

    return jsonify({
        "top":         results[0]["class"],
        "confidence":  results[0]["confidence"],
        "predictions": results
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)
