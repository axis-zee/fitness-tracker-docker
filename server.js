const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 4001;
const DATA_DIR = path.join(__dirname, 'data');
const EXERCISES_FILE = path.join(DATA_DIR, 'exercises.json');
const ROUTINES_FILE = path.join(DATA_DIR, 'routines.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Storage helpers ---
function load(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { return fallback; }
}

function save(file, data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// --- Seed default exercises ---
function seedExercises() {
  if (fs.existsSync(EXERCISES_FILE)) return;
  const defaults = [
    // Chest
    { id: uuidv4(), name: 'Bench Press', category: 'Chest', equipment: 'Barbell', custom: false },
    { id: uuidv4(), name: 'Incline Bench Press', category: 'Chest', equipment: 'Barbell', custom: false },
    { id: uuidv4(), name: 'Dumbbell Fly', category: 'Chest', equipment: 'Dumbbell', custom: false },
    { id: uuidv4(), name: 'Push-up', category: 'Chest', equipment: 'Bodyweight', custom: false },
    // Back
    { id: uuidv4(), name: 'Deadlift', category: 'Back', equipment: 'Barbell', custom: false },
    { id: uuidv4(), name: 'Pull-up', category: 'Back', equipment: 'Bodyweight', custom: false },
    { id: uuidv4(), name: 'Barbell Row', category: 'Back', equipment: 'Barbell', custom: false },
    { id: uuidv4(), name: 'Lat Pulldown', category: 'Back', equipment: 'Cable', custom: false },
    { id: uuidv4(), name: 'Seated Cable Row', category: 'Back', equipment: 'Cable', custom: false },
    // Shoulders
    { id: uuidv4(), name: 'Overhead Press', category: 'Shoulders', equipment: 'Barbell', custom: false },
    { id: uuidv4(), name: 'Dumbbell Lateral Raise', category: 'Shoulders', equipment: 'Dumbbell', custom: false },
    { id: uuidv4(), name: 'Face Pull', category: 'Shoulders', equipment: 'Cable', custom: false },
    // Arms
    { id: uuidv4(), name: 'Barbell Curl', category: 'Biceps', equipment: 'Barbell', custom: false },
    { id: uuidv4(), name: 'Hammer Curl', category: 'Biceps', equipment: 'Dumbbell', custom: false },
    { id: uuidv4(), name: 'Tricep Pushdown', category: 'Triceps', equipment: 'Cable', custom: false },
    { id: uuidv4(), name: 'Skull Crusher', category: 'Triceps', equipment: 'Barbell', custom: false },
    // Legs
    { id: uuidv4(), name: 'Squat', category: 'Legs', equipment: 'Barbell', custom: false },
    { id: uuidv4(), name: 'Leg Press', category: 'Legs', equipment: 'Machine', custom: false },
    { id: uuidv4(), name: 'Romanian Deadlift', category: 'Legs', equipment: 'Barbell', custom: false },
    { id: uuidv4(), name: 'Leg Curl', category: 'Legs', equipment: 'Machine', custom: false },
    { id: uuidv4(), name: 'Calf Raise', category: 'Legs', equipment: 'Machine', custom: false },
    { id: uuidv4(), name: 'Lunges', category: 'Legs', equipment: 'Bodyweight', custom: false },
    // Core
    { id: uuidv4(), name: 'Plank', category: 'Core', equipment: 'Bodyweight', custom: false },
    { id: uuidv4(), name: 'Crunch', category: 'Core', equipment: 'Bodyweight', custom: false },
    { id: uuidv4(), name: 'Cable Crunch', category: 'Core', equipment: 'Cable', custom: false },
  ];
  save(EXERCISES_FILE, defaults);
}

seedExercises();

// ==================== EXERCISES ====================

app.get('/api/exercises', (req, res) => {
  const exercises = load(EXERCISES_FILE, []);
  const { category, q } = req.query;
  let result = exercises;
  if (category) result = result.filter(e => e.category === category);
  if (q) result = result.filter(e => e.name.toLowerCase().includes(q.toLowerCase()));
  result.sort((a, b) => a.name.localeCompare(b.name));
  res.json(result);
});

app.post('/api/exercises', (req, res) => {
  const { name, category, equipment } = req.body;
  if (!name || !category) return res.status(400).json({ error: 'name and category required' });
  const exercises = load(EXERCISES_FILE, []);
  const ex = { id: uuidv4(), name, category, equipment: equipment || 'Other', custom: true };
  exercises.push(ex);
  save(EXERCISES_FILE, exercises);
  res.status(201).json(ex);
});

app.delete('/api/exercises/:id', (req, res) => {
  let exercises = load(EXERCISES_FILE, []);
  const ex = exercises.find(e => e.id === req.params.id);
  if (!ex) return res.status(404).json({ error: 'Not found' });
  if (!ex.custom) return res.status(403).json({ error: 'Cannot delete built-in exercises' });
  exercises = exercises.filter(e => e.id !== req.params.id);
  save(EXERCISES_FILE, exercises);
  res.json({ ok: true });
});

// ==================== ROUTINES ====================

app.get('/api/routines', (req, res) => {
  const routines = load(ROUTINES_FILE, []);
  res.json(routines);
});

app.get('/api/routines/:id', (req, res) => {
  const routines = load(ROUTINES_FILE, []);
  const r = routines.find(r => r.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  res.json(r);
});

app.post('/api/routines', (req, res) => {
  const { name, exercises } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const routines = load(ROUTINES_FILE, []);
  const routine = {
    id: uuidv4(),
    name,
    exercises: exercises || [], // [{ exerciseId, sets, reps, weight, notes }]
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  routines.push(routine);
  save(ROUTINES_FILE, routines);
  res.status(201).json(routine);
});

app.patch('/api/routines/:id', (req, res) => {
  const routines = load(ROUTINES_FILE, []);
  const idx = routines.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const { name, exercises } = req.body;
  if (name) routines[idx].name = name;
  if (exercises) routines[idx].exercises = exercises;
  routines[idx].updatedAt = new Date().toISOString();
  save(ROUTINES_FILE, routines);
  res.json(routines[idx]);
});

app.delete('/api/routines/:id', (req, res) => {
  let routines = load(ROUTINES_FILE, []);
  if (!routines.find(r => r.id === req.params.id)) return res.status(404).json({ error: 'Not found' });
  routines = routines.filter(r => r.id !== req.params.id);
  save(ROUTINES_FILE, routines);
  res.json({ ok: true });
});

// ==================== WORKOUT SESSIONS ====================

app.get('/api/sessions', (req, res) => {
  const sessions = load(SESSIONS_FILE, []);
  sessions.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  res.json(sessions);
});

app.get('/api/sessions/:id', (req, res) => {
  const sessions = load(SESSIONS_FILE, []);
  const s = sessions.find(s => s.id === req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  res.json(s);
});

app.post('/api/sessions', (req, res) => {
  const { routineId, routineName, exercises, notes, startedAt, finishedAt, duration } = req.body;
  const sessions = load(SESSIONS_FILE, []);
  const session = {
    id: uuidv4(),
    routineId: routineId || null,
    routineName: routineName || 'Free Workout',
    exercises: exercises || [],
    notes: notes || '',
    startedAt: startedAt || new Date().toISOString(),
    finishedAt: finishedAt || new Date().toISOString(),
    duration: duration || 0, // seconds
  };
  sessions.push(session);
  save(SESSIONS_FILE, sessions);
  res.status(201).json(session);
});

app.delete('/api/sessions/:id', (req, res) => {
  let sessions = load(SESSIONS_FILE, []);
  if (!sessions.find(s => s.id === req.params.id)) return res.status(404).json({ error: 'Not found' });
  sessions = sessions.filter(s => s.id !== req.params.id);
  save(SESSIONS_FILE, sessions);
  res.json({ ok: true });
});

// ==================== PROGRESS ====================
// GET /api/progress/:exerciseId — returns all sets for that exercise across sessions, sorted by date

app.get('/api/progress/:exerciseId', (req, res) => {
  const sessions = load(SESSIONS_FILE, []);
  const data = [];
  for (const session of sessions) {
    for (const ex of (session.exercises || [])) {
      if (ex.exerciseId === req.params.exerciseId) {
        for (const set of (ex.sets || [])) {
          data.push({
            date: session.startedAt,
            sessionId: session.id,
            routineName: session.routineName,
            weight: set.weight,
            reps: set.reps,
            volume: (set.weight || 0) * (set.reps || 0),
          });
        }
      }
    }
  }
  data.sort((a, b) => new Date(a.date) - new Date(b.date));
  res.json(data);
});

app.get('/health', (req, res) => res.json({ status: 'ok', app: 'fitness-tracker' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Fitness Tracker running on http://0.0.0.0:${PORT}`);
});
