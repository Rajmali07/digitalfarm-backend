# evaluate.py
import os, sys, warnings
import torch
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (classification_report, confusion_matrix,
                             accuracy_score, f1_score)
warnings.filterwarnings("ignore")
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.dataset import get_dataloaders
from src.model import build_model

def main():
    NUM_CLASSES = 30
    MODEL_PATH  = os.path.join(os.path.dirname(os.path.abspath(__file__)), "best_model.pth")
    device      = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # ── Load Data & Model ──
    _, _, test_loader, class_to_idx = get_dataloaders(batch_size=64)
    idx_to_class = {v: k for k, v in class_to_idx.items()}

    model = build_model(NUM_CLASSES, device)
    checkpoint = torch.load(MODEL_PATH, map_location=device)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()
    print(f"Loaded model from epoch {checkpoint['epoch']} "
          f"(val_acc: {checkpoint['val_acc']:.2f}%)\n")

    # ── Collect Predictions ──
    all_preds, all_labels = [], []
    with torch.no_grad():
        for images, labels in test_loader:
            images = images.to(device)
            outputs = model(images)
            preds = outputs.argmax(dim=1).cpu().numpy()
            all_preds.extend(preds)
            all_labels.extend(labels.numpy())

    all_preds  = np.array(all_preds)
    all_labels = np.array(all_labels)
    class_names = [idx_to_class[i] for i in range(NUM_CLASSES)]

    # ── 1. Classification Report ──
    print("="*60)
    print("CLASSIFICATION REPORT")
    print("="*60)
    print(classification_report(all_labels, all_preds,
                                 target_names=class_names, digits=3))

    overall_acc = accuracy_score(all_labels, all_preds)
    macro_f1    = f1_score(all_labels, all_preds, average="macro")
    weighted_f1 = f1_score(all_labels, all_preds, average="weighted")

    # ── 2. Confusion Matrix ──
    cm = confusion_matrix(all_labels, all_preds)
    fig, ax = plt.subplots(figsize=(18, 16))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=class_names, yticklabels=class_names,
                linewidths=0.5, ax=ax)
    ax.set_xlabel("Predicted Label", fontsize=12)
    ax.set_ylabel("True Label", fontsize=12)
    ax.set_title("Confusion Matrix — Disease Classifier (30 Classes)", fontsize=14)
    plt.xticks(rotation=45, ha="right", fontsize=8)
    plt.yticks(rotation=0, fontsize=8)
    plt.tight_layout()
    plt.savefig("confusion_matrix.png", dpi=150)
    print("Saved → confusion_matrix.png")

    # ── 3. Per-Class Accuracy Bar Chart ──
    per_class_acc = cm.diagonal() / cm.sum(axis=1)
    sorted_idx    = np.argsort(per_class_acc)
    sorted_names  = [class_names[i] for i in sorted_idx]
    sorted_acc    = per_class_acc[sorted_idx]
    colors        = ["#e74c3c" if a < 0.6 else
                     "#f39c12" if a < 0.8 else
                     "#27ae60" for a in sorted_acc]

    fig, ax = plt.subplots(figsize=(10, 12))
    bars = ax.barh(sorted_names, sorted_acc * 100, color=colors)
    ax.axvline(x=80, color="gray", linestyle="--", alpha=0.7)
    ax.set_xlabel("Accuracy (%)")
    ax.set_title("Per-Class Accuracy\n🔴 <60%   🟡 60-80%   🟢 >80%")
    ax.set_xlim(0, 110)
    for bar, acc in zip(bars, sorted_acc):
        ax.text(bar.get_width() + 0.5, bar.get_y() + bar.get_height()/2,
                f"{acc*100:.1f}%", va="center", fontsize=8)
    plt.tight_layout()
    plt.savefig("per_class_accuracy.png", dpi=150)
    print("Saved → per_class_accuracy.png")

    # ── Final Summary ──
    print(f"\n{'='*60}")
    print(f"  FINAL MODEL PERFORMANCE")
    print(f"{'='*60}")
    print(f"  Test Accuracy  : {overall_acc*100:.2f}%")
    print(f"  Macro F1-Score : {macro_f1:.4f}")
    print(f"  Weighted F1    : {weighted_f1:.4f}")
    print(f"{'='*60}")
    print("\n✅ Stage 6 Complete!")


# ← YEH LINE SABSE IMPORTANT HAI — Windows pe multiprocessing ke liye zaruri
if __name__ == "__main__":
    main()