import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please check your Settings > Secrets panel.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function findMissingExpressions(
  beats: Array<{ englishLines: string }>,
  expressions: Array<{ expression: string }>
): string[] {
  const combined = beats.map((b) => b.englishLines).join(' ').toLowerCase();
  const missing: string[] = [];
  for (const item of expressions) {
    const target = item.expression.trim().toLowerCase();
    if (target && !combined.includes(target)) {
      missing.push(item.expression.trim());
    }
  }
  return missing;
}

function isRateLimitError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429');
}

function isAuthError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.includes('API_KEY_INVALID') || raw.includes('PERMISSION_DENIED') || raw.includes('403');
}

async function withTransientRetry<T>(fn: () => Promise<T>, maxRetries = 1): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      // Never spam retries on rate limits, invalid keys, or bad requests
      if (isRateLimitError(err) || isAuthError(err)) {
        throw err;
      }
      if (attempt < maxRetries) {
        const delayMs = 700 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

async function generateWithFallback(
  ai: GoogleGenAI,
  contents: string,
  config: {
    systemInstruction: string;
    responseMimeType: string;
    responseSchema: Record<string, unknown>;
  }
) {
  const models = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
  let lastErr: unknown;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      return await withTransientRetry(() =>
        ai.models.generateContent({
          model,
          contents,
          config,
        })
      );
    } catch (err: unknown) {
      lastErr = err;
      const raw = err instanceof Error ? err.message : String(err);
      console.warn(`[Gemini ${model} failed]`, raw);
      if (isRateLimitError(err) && i < models.length - 1) {
        // Fallback immediately to next free-tier model with separate quota
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  console.error('[Gemini API Error]', raw);
  if (isAuthError(err)) {
    return {
      status: 403,
      message: 'API key error or permission denied. Please check your GEMINI_API_KEY in the Settings > Secrets panel.',
    };
  }
  if (isRateLimitError(err)) {
    return {
      status: 429,
      message:
        'Gemini free-tier rate limit reached right now. Please wait 30–60 seconds and try again, or select another API key in Settings > Secrets.',
    };
  }
  if (raw.includes('GEMINI_API_KEY is not configured')) {
    return {
      status: 500,
      message: raw,
    };
  }
  return {
    status: 500,
    message: raw || 'Unexpected server error while calling Gemini.',
  };
}

const characterAppearanceSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: 'Original fictional first name (not a celebrity or movie character).' },
    hairColor: { type: Type.STRING, description: 'Hex color like #2C2623.' },
    hairStyle: {
      type: Type.STRING,
      description: 'One of: short-bob, ponytail, short-neat, wavy-medium.',
    },
    skinTone: { type: Type.STRING, description: 'Hex color like #F2C9AC.' },
    outfitTopColor: { type: Type.STRING, description: 'Calm hex color for top clothing like #8FB9AA.' },
    outfitBottomColor: { type: Type.STRING, description: 'Calm hex color for pants/skirt like #4A5D75.' },
    outfitStyle: {
      type: Type.STRING,
      description: 'One of: hoodie-overalls, cardigan-slacks, jacket-jeans, sweater-skirt.',
    },
    accessory: {
      type: Type.STRING,
      description: 'One of: drumsticks, coffee-cup, notebook, headphones, microphone, none.',
    },
  },
  required: [
    'name',
    'hairColor',
    'hairStyle',
    'skinTone',
    'outfitTopColor',
    'outfitBottomColor',
    'outfitStyle',
    'accessory',
  ],
};

const beatVisualCueSchema = {
  type: Type.OBJECT,
  properties: {
    cameraMotion: {
      type: Type.STRING,
      description: 'One of: zoom-in, pan-right, pan-left, zoom-out, gentle-bounce.',
    },
    timeOfDay: {
      type: Type.STRING,
      description: 'One of: morning, afternoon, sunset, evening.',
    },
    characterPose: {
      type: Type.STRING,
      description: 'One of: playing-drums, nervous, determined, celebrating, walking, talking, studying.',
    },
    characterEmotion: {
      type: Type.STRING,
      description: 'One of: happy, embarrassed, focused, confident, surprised, relieved.',
    },
    propAction: { type: Type.STRING, description: 'Short phrase describing the prop or action in this beat.' },
    lightingMood: {
      type: Type.STRING,
      description: 'One of: warm-bright, cool-tense, hopeful-amber, golden-triumph.',
    },
    showCompanion: { type: Type.BOOLEAN },
    crowdMood: {
      type: Type.STRING,
      description: 'One of: none, cheering, gasping, applauding.',
    },
  },
  required: [
    'cameraMotion',
    'timeOfDay',
    'characterPose',
    'characterEmotion',
    'propAction',
    'lightingMood',
    'showCompanion',
    'crowdMood',
  ],
};

const storyBeatSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING, description: 'One of: hook, problem, turn, close.' },
    label: { type: Type.STRING, description: 'One of: Hook, Problem, Turn, Close.' },
    timeRange: { type: Type.STRING, description: '0-7s, 7-15s, 15-23s, or 23-30s.' },
    startSec: { type: Type.INTEGER },
    endSec: { type: Type.INTEGER },
    sceneDescription: {
      type: Type.STRING,
      description: 'Clear 1-2 sentence visual description of what happens in this beat.',
    },
    englishLines: {
      type: Type.STRING,
      description: 'Natural spoken English dialogue/narration for this beat.',
    },
    subtitles: {
      type: Type.STRING,
      description: 'Exact word-for-word match of englishLines for subtitle display.',
    },
    assignedExpressions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Exact user expressions included in this beat.',
    },
    visualCue: beatVisualCueSchema,
  },
  required: [
    'id',
    'label',
    'timeRange',
    'startSec',
    'endSec',
    'sceneDescription',
    'englishLines',
    'subtitles',
    'assignedExpressions',
    'visualCue',
  ],
};

const storyboardResponseSchema = {
  type: Type.OBJECT,
  properties: {
    characterBible: {
      type: Type.OBJECT,
      properties: {
        lead: characterAppearanceSchema,
        companion: characterAppearanceSchema,
        environmentType: {
          type: Type.STRING,
          description: 'One of: stadium, cafe, library, rooftop, campus, street.',
        },
        palette: {
          type: Type.OBJECT,
          properties: {
            skyTop: { type: Type.STRING },
            skyBottom: { type: Type.STRING },
            backdropAccent: { type: Type.STRING },
            groundColor: { type: Type.STRING },
            highlightColor: { type: Type.STRING },
          },
          required: ['skyTop', 'skyBottom', 'backdropAccent', 'groundColor', 'highlightColor'],
        },
      },
      required: ['lead', 'environmentType', 'palette'],
    },
    beats: {
      type: Type.ARRAY,
      items: storyBeatSchema,
    },
  },
  required: ['characterBible', 'beats'],
};

const BEAT_TIMINGS = [
  { id: 'hook', label: 'Hook', timeRange: '0-7s', startSec: 0, endSec: 7 },
  { id: 'problem', label: 'Problem', timeRange: '7-15s', startSec: 7, endSec: 15 },
  { id: 'turn', label: 'Turn', timeRange: '15-23s', startSec: 15, endSec: 23 },
  { id: 'close', label: 'Close', timeRange: '23-30s', startSec: 23, endSec: 30 },
] as const;

function normalizeBeats(rawBeats: any[]): any[] {
  return BEAT_TIMINGS.map((timing, idx) => {
    const found = rawBeats.find((b) => b.id === timing.id) || rawBeats[idx] || {};
    const englishLines = String(found.englishLines ?? '').trim().replace(/\s+/g, ' ');
    return {
      ...found,
      id: timing.id,
      label: timing.label,
      timeRange: timing.timeRange,
      startSec: timing.startSec,
      endSec: timing.endSec,
      sceneDescription: String(found.sceneDescription ?? '').trim(),
      englishLines,
      subtitles: englishLines,
      assignedExpressions: Array.isArray(found.assignedExpressions) ? found.assignedExpressions : [],
    };
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  app.post('/api/storyboard/generate', async (req: Request, res: Response) => {
    try {
      const { expressions, scene } = req.body ?? {};
      if (!Array.isArray(expressions) || expressions.length < 5) {
        res.status(400).json({ error: 'Please provide at least 5 English expressions.' });
        return;
      }

      const validExpressions = expressions
        .map((e: any) => ({
          expression: String(e?.expression ?? '').trim(),
          meaningKo: String(e?.meaningKo ?? '').trim(),
          movie: String(e?.movie ?? '').trim(),
        }))
        .filter((e: any) => e.expression.length > 0 && e.movie.length > 0);

      if (validExpressions.length < 5) {
        res.status(400).json({ error: 'At least 5 complete expressions with movies are required.' });
        return;
      }

      const uniqueMovies = new Set(validExpressions.map((e: any) => e.movie.toLowerCase()));
      if (uniqueMovies.size <= 1) {
        res.status(400).json({ error: 'Please include expressions from at least 2 different movies.' });
        return;
      }

      const place = String(scene?.place ?? '').trim();
      const characters = String(scene?.characters ?? '').trim();
      const situation = String(scene?.situation ?? '').trim();
      const style = String(scene?.style ?? '2d-animation').trim();

      if (!place || !characters || !situation) {
        res.status(400).json({ error: 'Place, characters, and situation are required.' });
        return;
      }

      const ai = getAiClient();

      const exprListText = validExpressions
        .map(
          (e: any, i: number) =>
            `${i + 1}. "${e.expression}" (Korean meaning: ${e.meaningKo || 'natural context'}, Movie: ${e.movie})`
        )
        .join('\n');

      const systemInstruction = `You are a friendly short-film writer for Korean university students learning everyday English.
Strict rules:
1. Family-friendly, warm, relatable campus/everyday tone. NO real people, NO celebrities, NO copyrighted movie characters, NO brand logos.
2. Split the 30-second film into exactly 4 beats:
   - hook (0-7s, Hook)
   - problem (7-15s, Problem)
   - turn (15-23s, Turn)
   - close (23-30s, Close)
3. EVERY single user expression MUST appear VERBATIM inside englishLines across the 4 beats (exact words and spelling as typed by the user, preserving their wording).
4. Total word count of englishLines across all 4 beats combined MUST be strictly between 60 and 70 words (aim for 63-67 words).
5. Subtitles MUST match englishLines word-for-word.
6. CharacterBible must define calm, cohesive hex colors, outfits, and props that stay identical across all 4 beats.`;

      const prompt = `Create a 4-beat 30-second animated short-film storyboard.

Scene Setup:
- Place: ${place}
- Characters: ${characters}
- Situation: ${situation}
- Visual Style: ${style}

Required Expressions (use EVERY single one verbatim across the 4 beats):
${exprListText}

Remember:
- Aim for 15-17 words per beat so total words across all 4 beats' englishLines is strictly 60 to 70 words.
- Every single expression above must appear verbatim in englishLines.
- Keep sceneDescription vivid and natural (1-2 sentences per beat).`;

      const initialResponse = await generateWithFallback(ai, prompt, {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: storyboardResponseSchema,
      });

      let parsed = JSON.parse((initialResponse.text ?? '{}').trim());
      let beats = normalizeBeats(Array.isArray(parsed.beats) ? parsed.beats : []);
      let totalWords = beats.reduce((sum, b) => sum + countWords(b.englishLines), 0);
      let missing = findMissingExpressions(beats, validExpressions);

      if (missing.length > 0 || totalWords < 56 || totalWords > 74) {
        const fixPrompt = `Revise ONLY the englishLines (and matching subtitles/assignedExpressions) of these 4 beats so that:
1. Total word count of englishLines across all 4 beats combined is strictly between 62 and 68 words (currently ${totalWords} words).
2. ALL user expressions appear VERBATIM inside englishLines.
${missing.length > 0 ? `Missing expressions that MUST be inserted verbatim: ${missing.map((m) => `"${m}"`).join(', ')}` : ''}

Required expressions list:
${validExpressions.map((e: any) => `"${e.expression}"`).join(', ')}

Current storyboard JSON:
${JSON.stringify({ characterBible: parsed.characterBible, beats })}`;

        try {
          const fixedResponse = await generateWithFallback(ai, fixPrompt, {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: storyboardResponseSchema,
          });

          const fixedParsed = JSON.parse((fixedResponse.text ?? '{}').trim());
          if (Array.isArray(fixedParsed.beats) && fixedParsed.beats.length === 4) {
            parsed = {
              characterBible: fixedParsed.characterBible || parsed.characterBible,
              beats: fixedParsed.beats,
            };
            beats = normalizeBeats(parsed.beats);
            totalWords = beats.reduce((sum, b) => sum + countWords(b.englishLines), 0);
          }
        } catch (polishErr) {
          // Keep valid initial 4-beat storyboard if optional polish call hits rate limit
          console.warn('[Storyboard polish skipped]', polishErr instanceof Error ? polishErr.message : polishErr);
        }
      }

      res.json({
        characterBible: parsed.characterBible,
        beats,
        totalWords,
      });
    } catch (err: unknown) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/storyboard/regenerate-beat', async (req: Request, res: Response) => {
    try {
      const { beatId, beats, expressions, scene, feedback } = req.body ?? {};
      if (!beatId || !Array.isArray(beats) || beats.length !== 4) {
        res.status(400).json({ error: 'Valid beatId and 4-beat storyboard are required.' });
        return;
      }

      const targetBeat = beats.find((b: any) => b.id === beatId);
      if (!targetBeat) {
        res.status(400).json({ error: 'Beat not found.' });
        return;
      }

      const otherWords = beats
        .filter((b: any) => b.id !== beatId)
        .reduce((sum: number, b: any) => sum + countWords(String(b.englishLines ?? '')), 0);

      const targetWords = Math.max(10, Math.min(24, 65 - otherWords));
      const otherLinesCombined = beats
        .filter((b: any) => b.id !== beatId)
        .map((b: any) => String(b.englishLines ?? ''))
        .join(' ')
        .toLowerCase();

      const mustInclude = (Array.isArray(expressions) ? expressions : [])
        .map((e: any) => String(e?.expression ?? '').trim())
        .filter((expr: string) => expr && !otherLinesCombined.includes(expr.toLowerCase()));

      const ai = getAiClient();
      const timing = BEAT_TIMINGS.find((t) => t.id === beatId)!;

      const prompt = `Regenerate ONLY the "${timing.label}" (${timing.timeRange}) beat of this 30-second short film.
Keep continuity with the other 3 beats, the same characters, and the same setting.
No real people, celebrities, movie characters, or brand logos.

Scene Context:
- Place: ${scene?.place ?? ''}
- Characters: ${scene?.characters ?? ''}
- Situation: ${scene?.situation ?? ''}
- User note: ${feedback || 'Create a fresh variation that fits smoothly.'}

Full Storyboard for context:
${beats.map((b: any) => `[${b.label} ${b.timeRange}] Scene: ${b.sceneDescription} | Lines: ${b.englishLines}`).join('\n')}

Strict Requirements for this regenerated beat (${timing.id}):
1. englishLines MUST be around ${targetWords} words (so the whole 4-beat script stays 60-70 words).
2. MUST include these exact expressions verbatim: ${mustInclude.length > 0 ? mustInclude.map((m: string) => `"${m}"`).join(', ') : '(keep any expressions natural to this beat)'}.
3. subtitles MUST match englishLines word-for-word.`;

      const response = await generateWithFallback(ai, prompt, {
        systemInstruction:
          'You are a short-film scriptwriter for Korean university English learners. Output a single StoryBeat JSON object.',
        responseMimeType: 'application/json',
        responseSchema: storyBeatSchema,
      });

      const newBeat = JSON.parse((response.text ?? '{}').trim());
      const englishLines = String(newBeat.englishLines ?? '').trim().replace(/\s+/g, ' ');
      const normalizedBeat = {
        ...newBeat,
        id: timing.id,
        label: timing.label,
        timeRange: timing.timeRange,
        startSec: timing.startSec,
        endSec: timing.endSec,
        englishLines,
        subtitles: englishLines,
      };

      res.json({ beat: normalizedBeat });
    } catch (err: unknown) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SceneLines server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
