import json
import os
import sys
import warnings

import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms
from huggingface_hub import hf_hub_download

warnings.filterwarnings("ignore")

NUM_CLASSES = 30
HF_REPO = os.environ.get(
    "HF_MODEL_REPO", "suyashsahu00/pet-poultry-disease-classifier"
)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOCAL_MODEL = os.path.join(BASE_DIR, "best_model.pth")
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def resolve_model_path():
    if os.path.exists(LOCAL_MODEL):
        return LOCAL_MODEL

    try:
        return hf_hub_download(
            repo_id=HF_REPO,
            filename="best_model.pth",
            local_files_only=True,
        )
    except Exception:
        return hf_hub_download(repo_id=HF_REPO, filename="best_model.pth")


def build_model(num_classes):
    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3, inplace=False),
        nn.Linear(in_features, 512),
        nn.BatchNorm1d(512),
        nn.ReLU(inplace=False),
        nn.Dropout(p=0.3, inplace=False),
        nn.Linear(512, 256),
        nn.BatchNorm1d(256),
        nn.ReLU(inplace=False),
        nn.Dropout(p=0.2, inplace=False),
        nn.Linear(256, num_classes),
    )
    return model.to(DEVICE)


TRANSFORM = transforms.Compose(
    [
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ]
)


def load_resources():
    checkpoint = torch.load(resolve_model_path(), map_location=DEVICE)
    class_to_idx = checkpoint["class_to_idx"]
    idx_to_class = {v: k for k, v in class_to_idx.items()}

    model = build_model(NUM_CLASSES)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()
    return model, idx_to_class


def predict(image_path):
    model, idx_to_class = load_resources()

    img = Image.open(image_path).convert("RGB")
    tensor = TRANSFORM(img).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        outputs = model(tensor)
        probs = torch.softmax(outputs, dim=1)[0]
        top_probs, top_indices = torch.topk(probs, k=5)

    predictions = [
        {
            "class": idx_to_class[idx.item()],
            "confidence": round(prob.item() * 100, 2),
        }
        for prob, idx in zip(top_probs, top_indices)
    ]

    return {
        "top": predictions[0]["class"],
        "confidence": predictions[0]["confidence"],
        "predictions": predictions,
    }


def main():
    if len(sys.argv) < 2:
        raise ValueError("Image path argument is required.")

    image_path = sys.argv[1]

    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image file not found: {image_path}")

    result = predict(image_path)
    print(json.dumps(result))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)
