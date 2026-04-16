const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const ML_ROOT = path.join(
  PROJECT_ROOT,
  'pet-poultry-disease-classifier-main',
  'pet-poultry-disease-classifier-main'
);
const ML_SCRIPT = path.join(ML_ROOT, 'predict_api.py');
const ML_SITE_PACKAGES = '';
// const DEFAULT_ML_PYTHON_PATH = 'C:\\Users\\user\\AppData\\Local\\Programs\\Python\\Python311\\python.exe';
const DEFAULT_ML_PYTHON_PATH = 'python';

const SUPPORTED_ANIMAL_TYPES = new Set(['poultry', 'cat', 'dog']);

function supportsMlAnimalType(animalType) {
  return SUPPORTED_ANIMAL_TYPES.has(String(animalType || '').trim().toLowerCase());
}

function getFileExtension(file) {
  const originalExtension = path.extname(file?.originalname || '').trim();

  if (originalExtension) return originalExtension;

  const mimeType = String(file?.mimetype || '').toLowerCase();

  if (mimeType.includes('png')) return '.png';
  if (mimeType.includes('webp')) return '.webp';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return '.jpg';

  return '.jpg';
}

function runPythonClassifier(imagePath) {
  const pythonExecutable = process.env.ML_PYTHON_PATH || DEFAULT_ML_PYTHON_PATH;
  const pythonPathParts = [ML_ROOT, ML_SITE_PACKAGES, process.env.PYTHONPATH]
    .filter(Boolean)
    .join(path.delimiter);

  return new Promise((resolve, reject) => {
    execFile(
      pythonExecutable,
      [ML_SCRIPT, imagePath],
      {
        cwd: ML_ROOT,
        timeout: 120000,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
        env: {
          ...process.env,
          PYTHONPATH: pythonPathParts,
        },
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              stderr?.trim() ||
                stdout?.trim() ||
                error.message ||
                'ML classifier execution failed'
            )
          );
          return;
        }

        try {
          resolve(JSON.parse(stdout.trim()));
        } catch (parseError) {
          reject(
            new Error(
              `ML classifier returned invalid JSON: ${stdout?.trim() || parseError.message}`
            )
          );
        }
      }
    );
  });
}

async function predictDiseaseFromImage(file, animalType) {
  if (!file) {
    return {
      available: false,
      skipped: true,
      message: 'ML image prediction skipped because no image was uploaded.',
    };
  }

  if (!supportsMlAnimalType(animalType)) {
    return {
      available: false,
      skipped: true,
      message: 'ML image model currently supports poultry, cat, and dog image prediction only on this page.',
    };
  }

  const tempDir = path.join(os.tmpdir(), 'digitalfarm-ml');
  const tempFilePath = path.join(
    tempDir,
    `ai-${Date.now()}-${Math.random().toString(36).slice(2)}${getFileExtension(file)}`
  );

  await fs.mkdir(tempDir, { recursive: true });
  await fs.writeFile(tempFilePath, file.buffer);

  try {
    const prediction = await runPythonClassifier(tempFilePath);

    return {
      available: true,
      skipped: false,
      disease: prediction.top || 'Unknown',
      confidence: Number(prediction.confidence) || 0,
      predictions: Array.isArray(prediction.predictions) ? prediction.predictions : [],
      source: 'pet-poultry-image-model',
      message: 'ML image classifier prediction generated successfully.',
    };
  } finally {
    await fs.unlink(tempFilePath).catch(() => {});
  }
}

module.exports = {
  predictDiseaseFromImage,
  supportsMlAnimalType,
};
