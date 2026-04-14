# src/train.py
import os
import sys
import torch
import torch.nn as nn
import matplotlib.pyplot as plt
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR

# Add project root to path so we can import our own modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.dataset import get_dataloaders
from src.model import build_model


# ─────────────────────────────────────────
# 1. CONFIGURATION — change settings here
# ─────────────────────────────────────────
CONFIG = {
    "data_dir":    None,
    "batch_size":  64,            # Optimized for GPU utilization
    "num_epochs":  50,
    "lr":          3e-4,
    "num_classes": 30,
    "save_path":   "best_model.pth",
    "patience":    10,
}


# ─────────────────────────────────────────
# 2. TRAINING FUNCTION (one epoch)
# ─────────────────────────────────────────
def train_one_epoch(model, loader, criterion, optimizer, device):
    model.train()  # Enables dropout + batchnorm training mode
    total_loss, correct, total = 0.0, 0, 0

    for batch_idx, (images, labels) in enumerate(loader):
        images, labels = images.to(device), labels.to(device)

        optimizer.zero_grad()          # Clear old gradients
        outputs = model(images)        # Forward pass
        loss = criterion(outputs, labels)  # Compute loss
        loss.backward()                # Backpropagation
        optimizer.step()               # Update weights

        total_loss += loss.item()
        preds = outputs.argmax(dim=1)
        correct += (preds == labels).sum().item()
        total += labels.size(0)

        # Print progress every 10 batches
        if (batch_idx + 1) % 10 == 0:
            print(f"    Batch {batch_idx+1}/{len(loader)} | Loss: {loss.item():.4f}", end="\r")

    avg_loss = total_loss / len(loader)
    accuracy = 100.0 * correct / total
    return avg_loss, accuracy


# ─────────────────────────────────────────
# 3. VALIDATION FUNCTION (one epoch)
# ─────────────────────────────────────────
def validate(model, loader, criterion, device):
    model.eval()  # Disables dropout, uses running stats for batchnorm
    total_loss, correct, total = 0.0, 0, 0

    with torch.no_grad():  # No gradients needed — saves memory & speeds up
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            loss = criterion(outputs, labels)

            total_loss += loss.item()
            preds = outputs.argmax(dim=1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)

    avg_loss = total_loss / len(loader)
    accuracy = 100.0 * correct / total
    return avg_loss, accuracy


# ─────────────────────────────────────────
# 4. PLOT TRAINING CURVES
# ─────────────────────────────────────────
def plot_curves(history):
    epochs = range(1, len(history["train_loss"]) + 1)
    plt.figure(figsize=(14, 5))

    # Loss curve
    plt.subplot(1, 2, 1)
    plt.plot(epochs, history["train_loss"], label="Train Loss", marker='o', markersize=3)
    plt.plot(epochs, history["val_loss"],   label="Val Loss",   marker='o', markersize=3)
    plt.title("Loss vs Epochs")
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.legend()
    plt.grid(True, alpha=0.3)

    # Accuracy curve
    plt.subplot(1, 2, 2)
    plt.plot(epochs, history["train_acc"], label="Train Accuracy", marker='o', markersize=3)
    plt.plot(epochs, history["val_acc"],   label="Val Accuracy",   marker='o', markersize=3)
    plt.title("Accuracy vs Epochs")
    plt.xlabel("Epoch")
    plt.ylabel("Accuracy (%)")
    plt.legend()
    plt.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig("training_curves.png", dpi=150)
    print("\nSaved training curves to 'training_curves.png'")
    plt.show()


# ─────────────────────────────────────────
# 5. MAIN TRAINING LOOP
# ─────────────────────────────────────────
def main():
    import warnings
    warnings.filterwarnings("ignore", category=UserWarning)
    # Device
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on: {device}")
    if device.type == "cuda":
        print(f"GPU: {torch.cuda.get_device_name(0)}\n")

    # Data
    train_loader, val_loader, test_loader, class_to_idx = get_dataloaders(
        data_dir=CONFIG["data_dir"],
        batch_size=CONFIG["batch_size"]
    )

    # Model
    # Dynamically use the number of classes discovered from the dataset
    num_classes = len(class_to_idx)
    model = build_model(
        num_classes=num_classes,
        device=device
    )

    # ── Loss Function ──
    # CrossEntropyLoss: standard for multi-class classification
    # label_smoothing=0.1: prevents overconfidence, improves generalization
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)

    # ── Optimizer ──
    # REPLACE the optimizer block in main() with this:
    optimizer = AdamW([
        # Late feature blocks — small LR (fine-tuning pretrained weights carefully)
        {"params": model.features[6:].parameters(), "lr": CONFIG["lr"] * 0.1},
        # Custom classifier head — full LR (learning from scratch)
        {"params": model.classifier.parameters(),   "lr": CONFIG["lr"]},
    ], weight_decay=1e-4)

    # ── Learning Rate Scheduler ──
    # CosineAnnealing: smoothly decays LR from lr → 0 over T_max epochs
    # Helps model converge to a better minimum (avoids bouncing around)
    scheduler = CosineAnnealingLR(optimizer, T_max=CONFIG["num_epochs"], eta_min=1e-6)

    # ── Early Stopping Setup ──
    best_val_loss = float("inf")
    patience_counter = 0
    history = {"train_loss": [], "val_loss": [], "train_acc": [], "val_acc": []}

    print("\n" + "="*60)
    print("Starting Training...")
    print("="*60)

    for epoch in range(1, CONFIG["num_epochs"] + 1):
        print(f"\nEpoch [{epoch}/{CONFIG['num_epochs']}]")
        print("-" * 40)

        # Train
        train_loss, train_acc = train_one_epoch(
            model, train_loader, criterion, optimizer, device
        )

        # Validate
        val_loss, val_acc = validate(model, val_loader, criterion, device)

        # Step the scheduler
        scheduler.step()
        current_lr = scheduler.get_last_lr()[0]

        # Log
        history["train_loss"].append(train_loss)
        history["val_loss"].append(val_loss)
        history["train_acc"].append(train_acc)
        history["val_acc"].append(val_acc)

        print(f"  Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.2f}%")
        print(f"  Val   Loss: {val_loss:.4f} | Val   Acc: {val_acc:.2f}%")
        print(f"  LR: {current_lr:.6f}")

        # ── Save Best Model ──
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "val_loss": val_loss,
                "val_acc": val_acc,
                "class_to_idx": class_to_idx,
            }, CONFIG["save_path"])
            print(f"  ✅ Best model saved! (val_loss improved to {val_loss:.4f})")
            patience_counter = 0
        else:
            patience_counter += 1
            print(f"  No improvement. Patience: {patience_counter}/{CONFIG['patience']}")

        # ── Early Stopping ──
        if patience_counter >= CONFIG["patience"]:
            print(f"\n⛔ Early stopping triggered at epoch {epoch}.")
            print(f"   Best val_loss: {best_val_loss:.4f}")
            break

    print("\n" + "="*60)
    print("Training Complete!")
    print("="*60)

    # Plot curves
    plot_curves(history)

    # Final test evaluation
    print("\nEvaluating on Test Set...")
    checkpoint = torch.load(CONFIG["save_path"], map_location=device)
    model.load_state_dict(checkpoint["model_state_dict"])
    test_loss, test_acc = validate(model, test_loader, criterion, device)
    print(f"Test Loss: {test_loss:.4f} | Test Accuracy: {test_acc:.2f}%")
    print(f"\n✅ Stage 5 Complete! Best model saved to '{CONFIG['save_path']}'")


if __name__ == "__main__":
    main()