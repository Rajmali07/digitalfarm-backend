# predict.py
import os, sys, warnings
import torch
from torchvision import transforms
from PIL import Image
warnings.filterwarnings("ignore")
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.model import build_model

# ── Config ──
NUM_CLASSES = 30
MODEL_PATH  = os.path.join(os.path.dirname(os.path.abspath(__file__)), "best_model.pth")
device      = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ── Load model ONCE at startup ──
def load_model():
    checkpoint = torch.load(MODEL_PATH, map_location=device)
    class_to_idx = checkpoint["class_to_idx"]
    idx_to_class = {v: k for k, v in class_to_idx.items()}

    model = build_model(NUM_CLASSES, device)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()
    return model, idx_to_class

# ── Image Preprocessing ──
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])

# ── Main Inference Function ──
def predict(image_path, model, idx_to_class, top_k=5):
    """
    Takes an image path, returns top-K predicted diseases with confidence %.
    """
    # Load & preprocess image
    img = Image.open(image_path).convert("RGB")
    tensor = transform(img).unsqueeze(0).to(device)  # Add batch dim: [1,3,224,224]

    with torch.no_grad():
        outputs = model(tensor)                        # Raw logits [1, 30]
        probs   = torch.softmax(outputs, dim=1)[0]    # Convert to probabilities
        top_probs, top_indices = torch.topk(probs, k=top_k)

    print(f"\n{'='*45}")
    print(f"  Image: {os.path.basename(image_path)}")
    print(f"{'='*45}")
    print(f"  Top {top_k} Predictions:")
    print(f"  {'─'*40}")

    results = []
    for rank, (prob, idx) in enumerate(zip(top_probs, top_indices), 1):
        class_name = idx_to_class[idx.item()]
        confidence = prob.item() * 100
        bar = "█" * int(confidence / 5)  # Visual bar
        print(f"  {rank}. {class_name:<35} {confidence:5.1f}% {bar}")
        results.append({"class": class_name, "confidence": confidence})

    print(f"{'='*45}")
    print(f"  ✅ Prediction: {results[0]['class']}")
    print(f"  🎯 Confidence: {results[0]['confidence']:.1f}%")
    print(f"{'='*45}\n")
    return results


if __name__ == "__main__":
    import sys

    # Load model
    print("Loading model...")
    model, idx_to_class = load_model()
    print("Model ready!\n")

    # Check if image path given as argument
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
        predict(image_path, model, idx_to_class)
    else:
        # Interactive mode
        print("Enter image path to predict (or 'quit' to exit):")
        while True:
            path = input("\n📁 Image path: ").strip().strip('"')
            if path.lower() == 'quit':
                break
            if not os.path.exists(path):
                print(f"❌ File not found: {path}")
                continue
            predict(path, model, idx_to_class)