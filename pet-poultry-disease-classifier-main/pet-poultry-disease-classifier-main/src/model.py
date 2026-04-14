# src/model.py
import torch
import torch.nn as nn
from torchvision import models

def build_model(num_classes, device):
    """
    EfficientNet-B0 with custom classifier head.
    Better than ResNet-50 for small-medium datasets.
    Fix: use nn.ReLU(inplace=False) to avoid gradient computation conflict.
    """
    model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)

    # Freeze early feature extraction layers
    for param in model.features[:6].parameters():
        param.requires_grad = False

    # Unfreeze last 2 feature blocks for fine-tuning
    for param in model.features[6:].parameters():
        param.requires_grad = True

    # EfficientNet-B0 outputs 1280 features before classifier
    in_features = model.classifier[1].in_features  # = 1280

    # Replace classifier head
    # KEY FIX: inplace=False on all ReLU layers
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3, inplace=False),
        nn.Linear(in_features, 512),
        nn.BatchNorm1d(512),
        nn.ReLU(inplace=False),        # ← inplace=False fixes the gradient error
        nn.Dropout(p=0.3, inplace=False),
        nn.Linear(512, 256),
        nn.BatchNorm1d(256),
        nn.ReLU(inplace=False),        # ← inplace=False fixes the gradient error
        nn.Dropout(p=0.2, inplace=False),
        nn.Linear(256, num_classes)
    )

    model = model.to(device)

    total     = sum(p.numel() for p in model.parameters())
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    frozen    = total - trainable
    print(f"\nModel: EfficientNet-B0 with Custom Head")
    print(f"  Total parameters:     {total:,}")
    print(f"  Trainable parameters: {trainable:,}  ← only these update during training")
    print(f"  Frozen parameters:    {frozen:,}  ← pretrained backbone, kept as-is")
    print(f"  Output classes:       {num_classes}")

    return model


if __name__ == "__main__":
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    if device.type == "cuda":
        print(f"GPU: {torch.cuda.get_device_name(0)}")

    model = build_model(num_classes=30, device=device)

    dummy_input = torch.randn(4, 3, 224, 224).to(device)
    output = model(dummy_input)
    print(f"\nForward pass: Input {dummy_input.shape} → Output {output.shape}")
    print("✅ Model ready!")