// Keyword aliases for common habit names
const HABIT_KEYWORD_MAP = [
  { keywords: ['water', 'drink', 'drinking', 'glass', 'glasses', 'hydrat'], hints: ['drink water', 'water'] },
  { keywords: ['exercise', 'workout', 'gym', 'training', 'train', 'lift', 'run', 'jog', 'yoga'], hints: ['exercise'] },
  { keywords: ['sleep', 'sleeping', 'bed', 'bedtime', 'night'], hints: ['sleep'] },
  { keywords: ['wake', 'woke', 'waking', 'morning', 'rise', 'alarm'], hints: ['wake up'] },
  { keywords: ['read', 'reading', 'book', 'books', 'page', 'pages', 'chapter'], hints: ['read'] },
  { keywords: ['meditat', 'meditation', 'mindful', 'breathe', 'breathing'], hints: ['meditate'] },
  { keywords: ['walk', 'walked', 'walking', 'step', 'steps', 'stroll'], hints: ['walk', 'daily walk'] },
  { keywords: ['medicine', 'medication', 'pill', 'pills', 'dose', 'doses', 'drug', 'supplement'], hints: ['medicine', 'take medicine'] },
  { keywords: ['journal', 'journaling', 'diary', 'wrote', 'write', 'writing'], hints: ['journal'] },
  { keywords: ['stretch', 'stretching', 'flexibility'], hints: ['stretch'] },
];

const WORD_TO_NUMBER = {
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
  'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
  'ten': 10, 'eleven': 11, 'twelve': 12, 'a': 1, 'an': 1,
};

/**
 * Extract number from text – checks digit patterns and word numbers
 */
function extractNumber(text) {
  // Numeric digits first
  const digitMatch = text.match(/\b(\d+(?:,\d{3})*(?:\.\d+)?)\b/);
  if (digitMatch) return parseFloat(digitMatch[1].replace(',', ''));

  // Word-based number
  const words = text.split(/\s+/);
  for (const word of words) {
    if (WORD_TO_NUMBER[word] !== undefined) {
      return WORD_TO_NUMBER[word];
    }
  }
  return null;
}

/**
 * Build per-habit keyword set from its name + static aliases
 */
function buildHabitKeywords(habit) {
  const nameWords = habit.name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const aliasEntry = HABIT_KEYWORD_MAP.find(entry =>
    entry.hints.some(h => habit.name.toLowerCase().includes(h))
  );
  const aliasKeywords = aliasEntry ? aliasEntry.keywords : [];
  return [...new Set([...nameWords, ...aliasKeywords])];
}

/**
 * Score how well a habit matches the text
 */
function scoreHabitMatch(habit, text) {
  const keywords = buildHabitKeywords(habit);
  return keywords.filter(kw => text.includes(kw)).length;
}

/**
 * Main parser. Returns a parsed command object or null.
 */
export function parseVoiceCommand(text, habits) {
  if (!text || !habits || habits.length === 0) return null;
  text = text.toLowerCase().trim();

  // Find best matching habit
  let bestHabit = null;
  let bestScore = 0;

  for (const habit of habits) {
    if (habit.paused) continue;
    const score = scoreHabitMatch(habit, text);
    if (score > bestScore) {
      bestScore = score;
      bestHabit = habit;
    }
  }

  if (!bestHabit || bestScore === 0) return null;

  const h = bestHabit;
  const name = h.name;

  // ── PATTERN 3: Wake-up / Sleep (time-locked) ──────────────────────────────
  if (h.type === 'time_locked') {
    const isWake = /woke up|waking up|woke|wake up/.test(text);
    const isSleep = /going to sleep|sleeping|sleep/.test(text);

    if (isWake || isSleep) {
      return {
        habitId: h.id,
        action: 'complete',
        feedback: isWake ? 'Wake up logged ⏰' : 'Sleep logged 😴',
      };
    }
  }

  // ── PATTERN 4: Big number habits ─────────────────────────────────────────
  if (h.type === 'big_number') {
    const num = extractNumber(text);
    if (num !== null) {
      return {
        habitId: h.id,
        action: 'set',
        value: num,
        feedback: `${num} ${h.unit || 'logged'} 🚶`,
      };
    }
  }

  // ── PATTERN 2: One-time habits ────────────────────────────────────────────
  if (h.type === 'one_time') {
    const oneTimeTriggers = /\b(done|finished|completed|did|marked|complete)\b/.test(text);
    if (oneTimeTriggers || bestScore >= 1) {
      return {
        habitId: h.id,
        action: 'complete',
        feedback: `${name} marked done 💪`,
      };
    }
  }

  // ── PATTERN 1: Countable habits ───────────────────────────────────────────
  if (h.type === 'countable' || h.type === 'big_number') {
    const num = extractNumber(text);
    const hasTrigger = /\b(logged|drank|drunk|had|did|added|drank|took|drunk|consumed)\b/.test(text);

    if (num !== null && (hasTrigger || bestScore >= 1)) {
      return {
        habitId: h.id,
        action: 'set',
        value: num,
        feedback: `Logged ${num} ${h.unit || name} ${getEmoji(h)}`,
      };
    }

    if (hasTrigger || bestScore >= 1) {
      return {
        habitId: h.id,
        action: 'increment',
        value: 1,
        feedback: `Added 1 ${h.unit ? h.unit.replace(/s$/, '') : name} ${getEmoji(h)}`,
      };
    }
  }

  // Generic fallback for any matched habit
  return {
    habitId: h.id,
    action: 'complete',
    feedback: `${name} logged ✅`,
  };
}

function getEmoji(habit) {
  const name = habit.name.toLowerCase();
  if (name.includes('water') || name.includes('drink')) return '💧';
  if (name.includes('exercise') || name.includes('workout')) return '💪';
  if (name.includes('read')) return '📚';
  if (name.includes('meditat')) return '🧘';
  if (name.includes('walk') || name.includes('step')) return '🚶';
  if (name.includes('medicine') || name.includes('pill')) return '💊';
  if (name.includes('sleep')) return '😴';
  if (name.includes('wake')) return '⏰';
  return '✅';
}
