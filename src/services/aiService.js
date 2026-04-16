const { GoogleGenerativeAI } = require("@google/generative-ai");
const { predictDiseaseFromImage } = require("./mlClassifierService");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const isProviderTemporaryError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("503") ||
    message.includes("service unavailable") ||
    message.includes("high demand") ||
    message.includes("overloaded") ||
    message.includes("temporarily")
  );
};

const extractJson = (text) => {
  const trimmed = String(text || "").trim();

  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch (_) {
    const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i) || trimmed.match(/```\s*([\s\S]*?)\s*```/i);
    const candidate = fencedMatch ? fencedMatch[1] : trimmed;
    const jsonMatch = candidate.match(/\{[\s\S]*\}/);

    if (!jsonMatch) return null;

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (_) {
      return null;
    }
  }
};

const normalizeConfidence = (value) => {
  if (typeof value === "number") return value;

  const parsed = parseFloat(String(value || "").replace("%", "").trim());

  return Number.isFinite(parsed) ? parsed : 0;
};

const buildFallbackFromML = (mlPrediction, reasonMessage) => {
  const hasMlResult = mlPrediction?.available;
  const fallbackDisease = hasMlResult ? mlPrediction.disease || "Unknown" : "Unknown";
  const fallbackConfidence = hasMlResult
    ? normalizeConfidence(mlPrediction.confidence)
    : 0;

  return {
    disease: fallbackDisease,
    confidence: fallbackConfidence,
    severity: "Medium",
    analysis: hasMlResult
      ? "Gemini symptom analysis is temporarily unavailable. Image-based prediction was used."
      : "AI provider is temporarily unavailable. Please retry shortly.",
    recommendation: "Isolate affected animals and consult a veterinarian.",
    gemini: {
      available: false,
      disease: "Unavailable",
      confidence: 0,
      severity: "Unknown",
      analysis: "Gemini service temporarily unavailable.",
      recommendation: "Retry later.",
      message: reasonMessage || "Gemini service temporarily unavailable.",
    },
    ml: mlPrediction,
  };
};

const analyzeRisk = async (farmData, file) => {
  const { animalType, symptoms } = farmData;

  let imagePart = null;

  if (file) {
    imagePart = {
      inlineData: {
        data: file.buffer.toString("base64"),
        mimeType: file.mimetype,
      },
    };
  }

  const mlPrediction = await predictDiseaseFromImage(file, animalType).catch((error) => ({
    available: false,
    skipped: true,
    message: error.message || "ML image prediction failed.",
  }));

  if (!genAI) {
    return buildFallbackFromML(mlPrediction, "GEMINI_API_KEY is not configured.");
  }

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
  });

const prompt = `
You are an expert Indian farm and pet veterinarian AI specialist.

STRICT RULES:
- ONLY diagnose FARM LIVESTOCK and PET diseases for Indian animals (cow/cattle, buffalo, poultry/chicken/duck, goat, sheep, pig/swine, cat, dog).
- Stick to common diseases for these animals.
- For 'other': assume common Indian livestock or pets.

Analyze this case:
Animal Type: ${animalType}
Symptoms: ${symptoms}

${file ? 'Visual image provided - describe any lesions/skin/eye abnormalities.' : ''}
${mlPrediction.available ? `The ML computer vision model predicted the disease as "${mlPrediction.disease}" with ${mlPrediction.confidence}% confidence. Please take this into consideration for your final analysis if it matches the symptoms.` : ''}

Return ONLY valid JSON (no other text):
{
  "disease": "Specific livestock disease name or 'Suspected undetermined infection'",
  "confidence": 65-95,
  "severity": "Low|Medium|High|Critical",
  "analysis": "Brief veterinary reasoning (2-4 sentences)",
  "recommendation": "Practical farm actions + when to call vet"
}
`;

  let response = "";
  let parsed = null;
  let geminiError = null;

  try {
    const result = await model.generateContent([
      prompt,
      ...(imagePart ? [imagePart] : []),
    ]);

    response = await result.response.text();
    parsed = extractJson(response);
  } catch (error) {
    geminiError = error;
  }

  if (parsed) {
    return {
      disease: parsed.disease || mlPrediction.disease || "Unknown",
      confidence: normalizeConfidence(parsed.confidence || mlPrediction.confidence),
      severity: parsed.severity || "Medium",
      analysis: parsed.analysis || "No detailed analysis returned.",
      recommendation: parsed.recommendation || "Consult vet",
      gemini: {
        disease: parsed.disease || "Unknown",
        confidence: normalizeConfidence(parsed.confidence),
        severity: parsed.severity || "Medium",
        analysis: parsed.analysis || "No detailed analysis returned.",
        recommendation: parsed.recommendation || "Consult vet",
      },
      ml: mlPrediction,
    };
  }

  if (geminiError && isProviderTemporaryError(geminiError)) {
    return buildFallbackFromML(mlPrediction, geminiError.message);
  }

  if (geminiError && mlPrediction?.available) {
    return buildFallbackFromML(mlPrediction, geminiError.message);
  }

  if (geminiError) {
    throw geminiError;
  }

  return {
    disease: "Unknown",
    confidence: 70,
    severity: "Medium",
    analysis: response,
    recommendation: "Consult vet",
    gemini: {
      disease: "Unknown",
      confidence: 70,
      severity: "Medium",
      analysis: response,
      recommendation: "Consult vet",
    },
    ml: mlPrediction,
  };
};

const buildNarrativeFallback = (payload = {}, reasonMessage = '') => {
  const score = Number(payload.score || 0);
  const level = String(payload.level || '').toUpperCase();

  let status = 'WATCH';
  if (level.includes('LOW') || score < 30) status = 'SAFE';
  else if (level.includes('MEDIUM') || score < 55) status = 'WATCH';
  else if (level.includes('HIGH') || score < 75) status = 'RISK';
  else status = 'CRITICAL';

  const headline = status === 'SAFE'
    ? 'Farm is currently stable'
    : status === 'WATCH'
      ? 'Farm needs closer observation'
      : status === 'RISK'
        ? 'Farm risk is elevated'
        : 'Farm requires immediate attention';

  return {
    status,
    headline,
    summary: `Overall risk score is ${score}. ${reasonMessage || 'Generated from live farm records.'}`,
    bullets: Array.isArray(payload.reasons) && payload.reasons.length
      ? payload.reasons.slice(0, 4)
      : ['Live records did not provide enough detail for expanded narrative.'],
    advice: status === 'SAFE'
      ? ['Continue routine biosecurity checks and vaccination schedule.', 'Monitor symptom reports daily.']
      : ['Review biosecurity checklist today.', 'Prioritize high-risk complaints and veterinary follow-up.']
  };
};

const analyzeDashboardRiskNarrative = async (payload = {}) => {
  if (!genAI) {
    return buildNarrativeFallback(payload, "GEMINI_API_KEY is not configured.");
  }

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
  });

  const prompt = `
You are a veterinary risk analyst.
Based on this live farm dashboard JSON, provide a short but clear risk narrative.

INPUT:
${JSON.stringify(payload, null, 2)}

Return only JSON in this exact format:
{
  "status": "SAFE|WATCH|RISK|CRITICAL",
  "headline": "",
  "summary": "",
  "bullets": ["", "", ""],
  "advice": ["", ""]
}

Rules:
- Keep language practical for a farmer dashboard.
- If risk is low, status should be SAFE.
- If risk is medium, status should be WATCH.
- If risk is high, status should be RISK.
- If risk is critical, status should be CRITICAL.
- Mention concrete factors from input data.
`;

  let geminiError = null;
  let parsed = null;

  try {
    const result = await model.generateContent([prompt]);
    const text = await result.response.text();
    parsed = extractJson(text);
  } catch (error) {
    geminiError = error;
  }

  if (parsed && typeof parsed === 'object') {
    return {
      status: String(parsed.status || 'WATCH').toUpperCase(),
      headline: String(parsed.headline || 'Farm risk summary'),
      summary: String(parsed.summary || 'Live risk narrative generated.'),
      bullets: Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 5) : [],
      advice: Array.isArray(parsed.advice) ? parsed.advice.slice(0, 3) : []
    };
  }

  if (geminiError && isProviderTemporaryError(geminiError)) {
    return buildNarrativeFallback(payload, geminiError.message);
  }

  if (geminiError) {
    throw geminiError;
  }

  return buildNarrativeFallback(payload, 'Gemini returned an unparsable response.');
};

module.exports = { analyzeRisk, analyzeDashboardRiskNarrative };
