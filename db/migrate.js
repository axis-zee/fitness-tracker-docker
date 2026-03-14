/**
 * migrate.js — Import existing JSON data into Postgres
 * Run once: node db/migrate.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'fitness_tracker',
  user: 'fitness',
  password: 'fitness_secret',
});

const DATA_DIR = path.join(__dirname, '..', 'data');

function load(file, fallback) {
  try {
    const p = path.join(DATA_DIR, file);
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch { return fallback; }
}

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // --- Exercises ---
    const exercises = load('exercises.json', []);
    console.log(`Migrating ${exercises.length} exercises...`);
    for (const ex of exercises) {
      await client.query(`
        INSERT INTO exercises (id, name, category, equipment, custom)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING
      `, [ex.id, ex.name, ex.category, ex.equipment || 'Other', ex.custom || false]);
    }
    console.log('✓ Exercises done');

    // --- Routines ---
    const routines = load('routines.json', []);
    console.log(`Migrating ${routines.length} routines...`);
    for (const r of routines) {
      await client.query(`
        INSERT INTO routines (id, name, created_at, updated_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO NOTHING
      `, [r.id, r.name, r.createdAt || new Date(), r.updatedAt || new Date()]);

      for (let i = 0; i < (r.exercises || []).length; i++) {
        const re = r.exercises[i];
        await client.query(`
          INSERT INTO routine_exercises (routine_id, exercise_id, position, default_sets, default_reps, default_weight, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [r.id, re.exerciseId, i, re.sets || 3, re.reps || 10, re.weight || 0, re.notes || '']);
      }
    }
    console.log('✓ Routines done');

    // --- Sessions ---
    const sessions = load('sessions.json', []);
    console.log(`Migrating ${sessions.length} workout sessions...`);
    for (const s of sessions) {
      await client.query(`
        INSERT INTO workout_sessions (id, routine_id, routine_name, notes, started_at, finished_at, duration_secs)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, [s.id, s.routineId || null, s.routineName || 'Free Workout', s.notes || '',
          s.startedAt, s.finishedAt, s.duration || 0]);

      for (let ei = 0; ei < (s.exercises || []).length; ei++) {
        const ex = s.exercises[ei];
        const { rows } = await client.query(`
          INSERT INTO session_exercises (session_id, exercise_id, exercise_name, position)
          VALUES ($1, $2, $3, $4) RETURNING id
        `, [s.id, ex.exerciseId || null, ex.exerciseName || '?', ei]);

        const seId = rows[0].id;
        for (let si = 0; si < (ex.sets || []).length; si++) {
          const set = ex.sets[si];
          await client.query(`
            INSERT INTO session_sets (session_exercise_id, set_number, weight, reps)
            VALUES ($1, $2, $3, $4)
          `, [seId, si + 1, set.weight || 0, set.reps || 0]);
        }
      }
    }
    console.log('✓ Sessions done');

    await client.query('COMMIT');
    console.log('\n✅ Migration complete!');

    // Summary
    const counts = await Promise.all([
      client.query('SELECT COUNT(*) FROM exercises'),
      client.query('SELECT COUNT(*) FROM routines'),
      client.query('SELECT COUNT(*) FROM workout_sessions'),
      client.query('SELECT COUNT(*) FROM session_sets'),
    ]);
    console.log(`   Exercises:  ${counts[0].rows[0].count}`);
    console.log(`   Routines:   ${counts[1].rows[0].count}`);
    console.log(`   Sessions:   ${counts[2].rows[0].count}`);
    console.log(`   Sets:       ${counts[3].rows[0].count}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
