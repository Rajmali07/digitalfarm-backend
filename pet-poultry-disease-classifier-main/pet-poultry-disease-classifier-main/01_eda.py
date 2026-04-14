import os
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from PIL import Image
import warnings
warnings.filterwarnings('ignore')

def download_datasets(data_dir="data"):
    """Automates downloading datasets via Kaggle API."""
    os.makedirs(data_dir, exist_ok=True)
    print("Downloading Pet Disease Dataset...")
    os.system(f"kaggle datasets download -d smadive/pet-disease-images -p {data_dir} --unzip")
    print("Downloading Chicken Disease Dataset...")
    os.system(f"kaggle datasets download -d allandclive/chicken-disease-1 -p {data_dir} --unzip")
    print("Downloads complete!\n")

def perform_eda(data_dir="data"):
    """Extracts metadata from all images to understand shape, dtypes, and distributions."""
    print("Analyzing image metadata (this may take a minute)...")
    supported_formats = ('.jpg', '.jpeg', '.png')
    image_data = []
    
    # Traverse the data directory
    for root, _, files in os.walk(data_dir):
        for file in files:
            if file.lower().endswith(supported_formats):
                file_path = os.path.join(root, file)
                # Folder name is usually the class label
                class_name = os.path.basename(root)
                dataset_type = "Chicken" if "chicken" in root.lower() else "Pet"
                
                try:
                    with Image.open(file_path) as img:
                        width, height = img.size
                        mode = img.mode # Colorspace (e.g., RGB, L for grayscale, RGBA)
                        image_data.append({
                            "dataset": dataset_type,
                            "class": class_name,
                            "width": width,
                            "height": height,
                            "channels": mode,
                            "filepath": file_path
                        })
                except Exception as e:
                    print(f"Corrupted image found and skipped: {file_path}")
                    
    df = pd.DataFrame(image_data)
    
    # --- 1. Dataset Shape & Dtypes ---
    print("\n" + "="*40)
    print("STAGE 1: DATASET SUMMARY")
    print("="*40)
    print(f"Total Valid Images: {len(df)}")
    print("\nColorspaces (dtypes) present:")
    print(df['channels'].value_counts())
    
    # --- 2. Identify Outliers (Image sizes) ---
    print("\nImage Size Statistics:")
    print(df[['width', 'height']].describe().astype(int))
    
    # --- 3. Visualizations & Class Distribution ---
    plt.figure(figsize=(16, 6))
    
    # Subplot 1: Class Balance
    plt.subplot(1, 2, 1)
    class_counts = df['class'].value_counts()
    sns.barplot(x=class_counts.values, y=class_counts.index, palette="viridis")
    plt.title("Class Distribution (Check for Imbalance)")
    plt.xlabel("Number of Images")
    plt.ylabel("Disease Class")
    
    # Subplot 2: Resolution Scatter Plot (Outlier Detection)
    plt.subplot(1, 2, 2)
    sns.scatterplot(data=df, x='width', y='height', hue='dataset', alpha=0.6)
    plt.title("Image Dimensions (Detecting Outlier Resolutions)")
    plt.xlabel("Width (pixels)")
    plt.ylabel("Height (pixels)")
    
    plt.tight_layout()
    plt.savefig("eda_results.png")
    print("\nSaved visualizations to 'eda_results.png'.")
    plt.show()

if __name__ == "__main__":
    download_datasets()
    perform_eda()