import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from env automatically

app.use(cors());
app.use(express.json());

const VALID_LEVELS = ['easy', 'intermediate', 'hard', 'master'];
const levelRank = { easy: 1, intermediate: 2, hard: 3, master: 4 };

// ---------- Claude coaching commentary ----------
// Frontend sends the current position + last move; we ask Claude for a short,
// plain-language read on what's happening. This is commentary, not gameplay —
// the actual computer opponent's moves are decided client-side (see Step 2),
// since a real engine or minimax is far more reliable for legal, sane play
// than asking an LLM to output moves directly.
app.post('/api/coach', async (req, res) => {
  const { fen, lastMoveSan, history } = req.body || {};
  if (!fen || typeof fen !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "fen".' });
  }

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content:
          `You are a friendly chess coach watching a casual game.\n` +
          `Position (FEN): ${fen}\n` +
          `Last move played: ${lastMoveSan || 'none yet'}\n` +
          `Move history so far: ${Array.isArray(history) ? history.join(' ') : 'none'}\n\n` +
          `In 2-3 short sentences, explain what's happening in this position ` +
          `for a casual player — no move notation dumps, just plain language. ` +
          `If one side has a clear advantage or threat, mention it.`
      }]
    });

    const commentary = msg.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n')
      .trim();

    res.json({ commentary });
  } catch (err) {
    console.error('Coach endpoint error:', err.message);
    res.status(502).json({ error: 'Could not reach the coach right now. Try again shortly.' });
  }
});

// ---------- Shared Hall of Fame ----------
app.get('/api/scores', async (req, res) => {
  try {
    const scores = await prisma.score.findMany({
      orderBy: [{ createdAt: 'desc' }],
      take: 200 // pull a generous batch, then rank properly below
    });
    scores.sort((a, b) => levelRank[b.level] - levelRank[a.level] || a.moves - b.moves);
    res.json(scores.slice(0, 20));
  } catch (err) {
    console.error('GET /api/scores error:', err.message);
    res.status(500).json({ error: 'Could not load the Hall of Fame.' });
  }
});

app.post('/api/scores', async (req, res) => {
  const { name, level, moves } = req.body || {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'A name is required.' });
  }
  if (!VALID_LEVELS.includes(level)) {
    return res.status(400).json({ error: 'Invalid level.' });
  }
  if (!Number.isInteger(moves) || moves < 1) {
    return res.status(400).json({ error: 'Invalid move count.' });
  }

  try {
    const entry = await prisma.score.create({
      data: { name: name.trim().slice(0, 24), level, moves }
    });
    res.status(201).json(entry);
  } catch (err) {
    console.error('POST /api/scores error:', err.message);
    res.status(500).json({ error: 'Could not save the score.' });
  }
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Chess Playground server running on port ${PORT}`));
