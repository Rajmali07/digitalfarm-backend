const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const fsPromises = require("fs/promises");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..", "..");
const ML_ROOT = process.env.ML_MODEL_ROOT || path.join(PROJECT_ROOT, "hf-space");
const ML_SCRIPT = process.env.ML_MODEL_SCRIPT || path.join(ML_ROOT, "predict_api.py");
const ML_SITE_PACKAGES = process.env.ML_SITE_PACKAGES || "";
const DEFAULT_ML_PYTHON_PATH = process.env.ML_PYTHON_PATH || "python";
const DEFAULT_HF_SPACE = "https://bihari04-pet-poultry-disease-classifier.hf.space/predict";
const HF_SPACE_ENDPOINT = process.env.HF_SPACE_ENDPOINT || DEFAULT_HF_SPACE;
const HF_TOKEN = process.env.HF_TOKEN || process.env.HUGGINGFACEHUB_API_TOKEN || "";

const SUPPORTED_ANIMAL_TYPES = new Set(['poultry', 'cat', 'dog']);

function supportsMlAnimalType(animalType) {
  return SUPPORTED_ANIMAL_TYPES.has(String(animalType || '').trim().toLowerCase());
}

function getFileExtension(file) {
  const originalExtension = path.extname(file?.originalname || "").trim();
  if (originalExtension) return originalExtension;

  const mimeType = String(file?.mimetype || "").toLowerCase();
  if (mimeType.includes("png")) return ".png";
  if (mimeType.includes("webp")) return ".webp";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return ".jpg";

  return ".jpg";
}

function runPythonClassifier(imagePath) {
  const pythonPathParts = [ML_ROOT, ML_SITE_PACKAGES, process.env.PYTHONPATH]
    .filter(Boolean)
    .join(path.delimiter);

  return new Promise((resolve, reject) => {
    execFile(
      DEFAULT_ML_PYTHON_PATH,
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
                "ML classifier execution failed"
            )
          );
          return;
        }

        try {
          resolve(JSON.parse(String(stdout || "").trim()));
        } catch (parseError) {
          reject(
            new Error(
              `ML classifier returned invalid JSON: ${String(stdout || "").trim() || parseError.message}`
            )
          );
        }
      }
    );
  });
}

function normalizeHfSpaceEndpoint(urlValue) {
  const raw = String(urlValue || "").trim();
  if (!raw) return "";

  // Already configured with a direct inference endpoint.
  if (/\/predict$|\/run\/predict$|\/call\/predict$/i.test(raw)) {
    return raw;
  }

  // Convert "https://huggingface.co/spaces/<owner>/<space>" to "https://<owner>-<space>.hf.space/predict"
  const hfMatch = raw.match(/huggingface\.co\/spaces\/([^/]+)\/([^/?#]+)/i);
  if (hfMatch) {
    const owner = hfMatch[1];
    const space = hfMatch[2];
    return `https://${owner}-${space}.hf.space/predict`;
  }

  // Convert base hf.space URL to Flask predict endpoint.
  if (/\.hf\.space\/?$/i.test(raw)) {
    return `${raw.replace(/\/+$/, "")}/predict`;
  }

  return raw;
}

function mapHfPredictionResult(result = {}) {
  // Flask response from hf-space/app.py
  if (result?.top || Array.isArray(result?.predictions)) {
    return {
      available: true,
      skipped: false,
      disease: result.top || "Unknown",
      confidence: Number(result.confidence) || 0,
      predictions: Array.isArray(result.predictions) ? result.predictions : [],
      source: "huggingface-space",
      message: "Prediction from Hugging Face Space",
    };
  }

  // Legacy Gradio-like response compatibility
  if (Array.isArray(result?.data)) {
    return {
      available: true,
      skipped: false,
      disease: result?.data?.[0]?.label || "Unknown",
      confidence: Number(result?.data?.[0]?.confidence) || 0,
      predictions: result.data,
      source: "huggingface-space",
      message: "Prediction from Hugging Face Space",
    };
  }

  return {
    available: false,
    skipped: false,
    message: "HF Space returned an unexpected response format.",
  };
}

async function predictViaHfSpace(file) {
  const endpoint = normalizeHfSpaceEndpoint(HF_SPACE_ENDPOINT);
  if (!endpoint) {
    throw new Error("HF space endpoint is not configured.");
  }

  const form = new FormData();
  form.append("image", file.buffer, {
    filename: file?.originalname || `upload${getFileExtension(file)}`,
    contentType: file?.mimetype || "image/jpeg",
  });

  const response = await axios.post(
    endpoint,
    form,
    {
      headers: {
        ...form.getHeaders(),
        ...(HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {}),
      },
      timeout: 60000,
    }
  );

  return mapHfPredictionResult(response.data);
}

async function predictDiseaseFromImage(file, animalType) {
  if (!file) {
    return {
      available: false,
      skipped: true,
      message: 'No image uploaded.',
    };
  }

  if (!supportsMlAnimalType(animalType)) {
    return {
      available: false,
      skipped: true,
      message: 'Supported only for poultry, cat, dog.',
    };
  }

  try {
    const tempDir = path.join(os.tmpdir(), "digitalfarm-ml");
    const tempFilePath = path.join(
      tempDir,
      `ai-${Date.now()}-${Math.random().toString(36).slice(2)}${getFileExtension(file)}`
    );

    await fsPromises.mkdir(tempDir, { recursive: true });
    await fsPromises.writeFile(tempFilePath, file.buffer);

    try {
      const prediction = await runPythonClassifier(tempFilePath);

      return {
        available: true,
        skipped: false,
        disease: prediction.top || "Unknown",
        confidence: Number(prediction.confidence) || 0,
        predictions: Array.isArray(prediction.predictions) ? prediction.predictions : [],
        source: "local-hf-space-model",
        message: "Prediction from local DL model",
      };
    } finally {
      await fsPromises.unlink(tempFilePath).catch(() => {});
    }
  } catch (localError) {
    if (HF_SPACE_ENDPOINT) {
      try {
        return await predictViaHfSpace(file);
      } catch (hfError) {
        console.error("HF SPACE ERROR:", hfError.response?.data || hfError.message);
      }
    }

    const details = [localError?.message].filter(Boolean).join(" | ");
    const localScriptFound = fs.existsSync(ML_SCRIPT);

    return {
      available: false,
      skipped: false,
      message: localScriptFound
        ? `Prediction failed. ${details}`
        : `Prediction failed. Local script not found at ${ML_SCRIPT}`,
    };
  }
}

module.exports = {
  predictDiseaseFromImage,
  supportsMlAnimalType,
};