# src/dataset.py
import os
import torch
from PIL import Image
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
from torchvision import transforms
from collections import Counter
import numpy as np


# ─────────────────────────────────────────
# 1. DISCOVER ALL IMAGES & BUILD CLASS MAP
# ─────────────────────────────────────────
def discover_dataset(data_dir="data"):
    """
    Walks the data directory and collects (filepath, class_label) pairs.
    Handles both directory-based classes and filename-based classes (e.g., class.123.jpg).
    """
    supported = (".jpg", ".jpeg", ".png")
    samples = []

    for root, dirs, files in os.walk(data_dir):
        image_files = [f for f in files if f.lower().endswith(supported)]
        if not image_files:
            continue

        parent_folder = os.path.basename(root)
        
        # 1. Handle folders with filename-based classes (e.g. cocci.1.jpg)
        # Typically found in dataset downloads like the chicken one
        if parent_folder.lower() in {"train", "data"}:
            for f in image_files:
                if "." in f:
                    class_name = f.split(".")[0]
                    # Filter out very common non-class prefixes if any
                    samples.append((os.path.join(root, f), class_name))
                else:
                    # Fallback to folder name if no dots
                    samples.append((os.path.join(root, f), parent_folder))
            continue

        # 2. Handle folders that should be skipped as class names
        skip_names = {"test", "valid", "validation"}
        if parent_folder.lower() in skip_names:
            continue

        # 3. Standard Case: Parent folder name is the class label (Pet dataset)
        for f in image_files:
            samples.append((os.path.join(root, f), parent_folder))

    return samples


def build_class_map(samples):
    """Creates a {class_name: index} dictionary from discovered samples."""
    classes = sorted(set(label for _, label in samples))
    class_to_idx = {cls: idx for idx, cls in enumerate(classes)}
    print(f"\nTotal classes found: {len(classes)}")
    for cls, idx in class_to_idx.items():
        print(f"  [{idx:2d}] {cls}")
    return class_to_idx


# ─────────────────────────────────────────
# 2. PYTORCH DATASET CLASS
# ─────────────────────────────────────────
class DiseaseDataset(Dataset):
    """
    Custom PyTorch Dataset.
    Takes a list of (filepath, class_name) samples and returns
    (image_tensor, label_index) pairs.
    """

    def __init__(self, samples, class_to_idx, transform=None):
        self.samples = samples
        self.class_to_idx = class_to_idx
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        filepath, class_name = self.samples[idx]
        label = self.class_to_idx[class_name]

        try:
            image = Image.open(filepath).convert(
                "RGB"
            )  # Force RGB (fixes RGBA/grayscale)
        except Exception:
            # Return a blank image if file is corrupted
            image = Image.new("RGB", (224, 224), color=0)

        if self.transform:
            image = self.transform(image)

        return image, label


# ─────────────────────────────────────────
# 3. TRANSFORMS (Preprocessing + Augmentation)
# ─────────────────────────────────────────
def get_transforms():
    """Stronger augmentation to fight overfitting on small dataset."""
    train_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomCrop(224),                        # Random crop instead of center
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(p=0.2),
        transforms.RandomRotation(20),
        transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2, hue=0.1),
        transforms.RandomGrayscale(p=0.05),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225])
    ])

    val_test_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225])
    ])
    return train_transform, val_test_transform


# ─────────────────────────────────────────
# 4. TRAIN / VAL / TEST SPLIT (Stratified)
# ─────────────────────────────────────────
def stratified_split(samples, train_ratio=0.7, val_ratio=0.15):
    """
    Splits data class-by-class (stratified) to ensure every class
    is represented in train, val, and test sets proportionally.
    Prevents data leakage — split is done BEFORE creating datasets.
    """
    from collections import defaultdict
    import random

    random.seed(42)  # Reproducible splits

    # Group samples by class
    class_buckets = defaultdict(list)
    for sample in samples:
        class_buckets[sample[1]].append(sample)

    train_samples, val_samples, test_samples = [], [], []

    for cls, cls_samples in class_buckets.items():
        random.shuffle(cls_samples)
        n = len(cls_samples)
        train_end = int(n * train_ratio)
        val_end = int(n * (train_ratio + val_ratio))

        train_samples.extend(cls_samples[:train_end])
        val_samples.extend(cls_samples[train_end:val_end])
        test_samples.extend(cls_samples[val_end:])

    print(f"\nData Split:")
    print(f"  Train:      {len(train_samples)} images")
    print(f"  Validation: {len(val_samples)} images")
    print(f"  Test:       {len(test_samples)} images")
    return train_samples, val_samples, test_samples


# ─────────────────────────────────────────
# 5. CLASS IMBALANCE: WeightedRandomSampler
# ─────────────────────────────────────────
def make_weighted_sampler(train_samples, class_to_idx):
    """
    Gives rare classes a higher chance of being picked during training.
    This prevents the model from ignoring minority classes.
    """
    labels = [class_to_idx[label] for _, label in train_samples]
    class_counts = Counter(labels)
    # Weight for each class = 1 / frequency
    class_weights = {cls: 1.0 / count for cls, count in class_counts.items()}
    # Assign each sample its class weight
    sample_weights = [class_weights[label] for label in labels]
    sampler = WeightedRandomSampler(
        weights=torch.DoubleTensor(sample_weights),
        num_samples=len(sample_weights),
        replacement=True,
    )
    return sampler


# ─────────────────────────────────────────
# 6. BUILD DATALOADERS (Entry Point)
# ─────────────────────────────────────────
def get_dataloaders(data_dir=None, batch_size=32):
    # Auto-detect the data folder regardless of where you run the script from
    if data_dir is None:
        # Go up one level from src/ to find data/
        src_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(src_dir)
        data_dir = os.path.join(project_root, "data")

    print(f"Looking for data in: {data_dir}")  # Shows you the exact path it's checking
    """
    Main function to call from other scripts.
    Returns: train_loader, val_loader, test_loader, class_to_idx
    """
    # Discover all images
    all_samples = discover_dataset(data_dir)
    print(f"Total images discovered: {len(all_samples)}")

    # Build class map
    class_to_idx = build_class_map(all_samples)

    # Stratified split
    train_s, val_s, test_s = stratified_split(all_samples)

    # Transforms
    train_tf, val_test_tf = get_transforms()

    # Datasets
    train_dataset = DiseaseDataset(train_s, class_to_idx, transform=train_tf)
    val_dataset = DiseaseDataset(val_s, class_to_idx, transform=val_test_tf)
    test_dataset = DiseaseDataset(test_s, class_to_idx, transform=val_test_tf)

    # Sampler for class imbalance
    sampler = make_weighted_sampler(train_s, class_to_idx)

    # DataLoaders
    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        sampler=sampler,
        num_workers=0,
        pin_memory=True,
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=0,
        pin_memory=True,
    )
    test_loader = DataLoader(
        test_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=0,
        pin_memory=True,
    )

    return train_loader, val_loader, test_loader, class_to_idx


# ─────────────────────────────────────────
# 7. QUICK TEST — Run this file directly
# ─────────────────────────────────────────
if __name__ == "__main__":
    train_loader, val_loader, test_loader, class_to_idx = get_dataloaders()

    # Grab one batch and verify shapes
    images, labels = next(iter(train_loader))
    print(f"\nBatch verification:")
    print(f"  Image batch shape: {images.shape}")  # Should be [32, 3, 224, 224]
    print(f"  Label batch shape: {labels.shape}")  # Should be [32]
    print(f"  Number of classes: {len(class_to_idx)}")
    print(f"\n✅ Stage 2 Complete! DataLoaders are ready.")
