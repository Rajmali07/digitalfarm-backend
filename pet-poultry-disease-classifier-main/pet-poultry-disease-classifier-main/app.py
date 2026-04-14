import os, sys, warnings, io
import torch
from torchvision import transforms
from PIL import Image
from flask import Flask, request, jsonify, render_template
from huggingface_hub import hf_hub_download

warnings.filterwarnings("ignore")
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from src.model import build_model

app = Flask(__name__)

NUM_CLASSES = 30
HF_REPO     = os.environ.get("HF_MODEL_REPO",
              "suyashsahu00/pet-poultry-disease-classifier")
LOCAL_MODEL = "best_model.pth"
device      = torch.device("cuda" if torch.cuda.is_available() else "cpu")

if not os.path.exists(LOCAL_MODEL):
    print(f"Downloading model from Hugging Face: {HF_REPO} ...")
    LOCAL_MODEL = hf_hub_download(
        repo_id=HF_REPO,
        filename="best_model.pth"
    )
    print("Model downloaded!")

print("Loading model...")
checkpoint   = torch.load(LOCAL_MODEL, map_location=device)
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
    results = [
        {"class": idx_to_class[idx.item()],
         "confidence": round(prob.item() * 100, 2)}
        for prob, idx in zip(top_probs, top_indices)
    ]
    return jsonify({
        "top":         results[0]["class"],
        "confidence":  results[0]["confidence"],
        "predictions": results
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)