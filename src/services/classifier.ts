import { GoogleGenerativeAI } from '@google/generative-ai';

export const KNOWN_CATEGORIES = [
  'pothole',
  'road_damage',
  'garbage',
  'open_manhole',
  'streetlight',
  'exposed_wiring',
  'water_leakage',
  'waterlogging',
  'fallen_tree',
  'park_maintenance',
  'other',
] as const;

export type Category = (typeof KNOWN_CATEGORIES)[number];
export type Severity = 'MINOR' | 'MODERATE' | 'SEVERE';

export interface ClassificationResult {
  category: string;
  severity: Severity;
  confidence: number;
  needsHumanReview: boolean;
}

/**
 * Fetch image buffer from a URL and format as an inline generative part
 */
async function urlToGenerativePart(url: string, mimeType: string = 'image/jpeg') {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image from URL: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: response.headers.get('content-type') || mimeType,
      },
    };
  } catch (error) {
    console.warn('Could not download image buffer for Gemini inlineData:', error);
    return null;
  }
}

/**
 * Fallback keyword heuristics if Gemini is unavailable or returns an invalid payload
 */
function heuristicFallback(description: string): ClassificationResult {
  const desc = (description || '').toLowerCase();
  let category: Category = 'other';
  let severity: Severity = 'MINOR';
  let confidence = 0.5;

  if (desc.includes('pothole') || desc.includes('crater') || desc.includes('asphalt')) {
    category = 'pothole';
    severity = 'MODERATE';
    confidence = 0.8;
  } else if (desc.includes('road') || desc.includes('crack') || desc.includes('pavement')) {
    category = 'road_damage';
    severity = 'MODERATE';
    confidence = 0.75;
  } else if (desc.includes('garbage') || desc.includes('trash') || desc.includes('waste') || desc.includes('dump')) {
    category = 'garbage';
    severity = 'MODERATE';
    confidence = 0.85;
  } else if (desc.includes('manhole') || desc.includes('drain cover') || desc.includes('open drain')) {
    category = 'open_manhole';
    severity = 'SEVERE';
    confidence = 0.9;
  } else if (desc.includes('streetlight') || desc.includes('lamp') || desc.includes('dark street') || desc.includes('light pole')) {
    category = 'streetlight';
    severity = 'MODERATE';
    confidence = 0.8;
  } else if (desc.includes('wire') || desc.includes('electric') || desc.includes('shock') || desc.includes('spark')) {
    category = 'exposed_wiring';
    severity = 'SEVERE';
    confidence = 0.9;
  } else if (desc.includes('leak') || desc.includes('pipe') || desc.includes('water supply') || desc.includes('burst')) {
    category = 'water_leakage';
    severity = 'MODERATE';
    confidence = 0.8;
  } else if (desc.includes('waterlog') || desc.includes('flood') || desc.includes('stagnant water')) {
    category = 'waterlogging';
    severity = 'SEVERE';
    confidence = 0.85;
  } else if (desc.includes('tree') || desc.includes('branch') || desc.includes('fallen branch')) {
    category = 'fallen_tree';
    severity = 'MODERATE';
    confidence = 0.85;
  } else if (desc.includes('park') || desc.includes('grass') || desc.includes('bench') || desc.includes('playground')) {
    category = 'park_maintenance';
    severity = 'MINOR';
    confidence = 0.75;
  }

  return {
    category,
    severity,
    confidence,
    needsHumanReview: confidence < 0.55,
  };
}

/**
 * AI Classification Service: Isolated Gemini Vision Pipeline
 */
export async function classifyComplaint(
  photoUrl: string,
  description: string
): Promise<ClassificationResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('⚠️ GEMINI_API_KEY not set. Using rule-based heuristic classification.');
    return heuristicFallback(description);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
You are an expert municipal AI civic complaint classifier for a city triage system.
Your task is to analyze the civic issue report (photo and/or description) and classify it into one of these exact categories:
[${KNOWN_CATEGORIES.map((c) => `"${c}"`).join(', ')}]

Assign a severity level:
- "MINOR": cosmetic or low-risk issues (e.g. small trash, overgrown grass, minor curb damage)
- "MODERATE": standard disruption (e.g. pothole, broken streetlight, water pipe leak)
- "SEVERE": immediate safety hazard or public emergency (e.g. exposed live wiring, missing manhole cover, deep flooding, blocked arterial road)

Assign a confidence score from 0.0 to 1.0 based on how clearly the photo/description indicates the category.

Return ONLY a valid, raw JSON object (with NO markdown formatting, NO backticks, NO extra text):
{
  "category": "string",
  "severity": "MINOR" | "MODERATE" | "SEVERE",
  "confidence": number
}

Citizen Description: "${description || 'No description provided'}"
`;

    const contents: any[] = [prompt];

    if (photoUrl && (photoUrl.startsWith('http://') || photoUrl.startsWith('https://'))) {
      const imagePart = await urlToGenerativePart(photoUrl);
      if (imagePart) {
        contents.push(imagePart);
      }
    }

    const result = await model.generateContent(contents);
    const text = result.response.text().trim();

    // Clean any accidental markdown backticks
    const cleanedJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedJson);

    let category = (parsed.category || '').toLowerCase().trim();
    if (!KNOWN_CATEGORIES.includes(category as Category)) {
      category = 'other';
    }

    let severity: Severity = 'MODERATE';
    if (['MINOR', 'MODERATE', 'SEVERE'].includes(parsed.severity?.toUpperCase())) {
      severity = parsed.severity.toUpperCase() as Severity;
    }

    let confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.75;
    if (confidence < 0 || confidence > 1) confidence = 0.5;

    const needsHumanReview = confidence < 0.55 || category === 'other';

    return {
      category,
      severity,
      confidence: Number(confidence.toFixed(2)),
      needsHumanReview,
    };
  } catch (error) {
    console.error('Gemini classification error, falling back:', error);
    const fallback = heuristicFallback(description);
    return {
      ...fallback,
      needsHumanReview: true,
    };
  }
}
