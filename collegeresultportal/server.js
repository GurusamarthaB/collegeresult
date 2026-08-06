require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').trim();
const SUPABASE_KEY = String(process.env.SUPABASE_KEY || '').trim();

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_KEY are required.');
  console.error('Copy .env.example to .env and configure your Supabase credentials before starting the server.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const upload = multer({ storage: multer.memoryStorage() });

// Admin Middleware
function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── ADMIN ENDPOINTS ──────────────────────────────────────

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password is required' });
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Incorrect password' });

  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ success: true, token, message: 'Admin login successful' });
});

// POST /api/upload-excel — Auto-calculates Total Marks, Percentage, College Rank & Stream Rank
app.post('/api/upload-excel', verifyAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (rows.length === 0) return res.status(400).json({ error: 'Excel file is empty' });

    // Columns that are metadata, not subject marks
    const nonSubjectKeys = new Set([
      'rollno', 'roll_no', 'rollnumber', 'rollnumber', 'name', 'studentname',
      'class', 'class_grade', 'classgrade', 'stream', 'combination', 'totalmarks',
      'total_marks', 'maxmarks', 'max_marks', 'percentage', 'collegerank',
      'college_rank', 'streamrank', 'stream_rank'
    ]);

    const subjectKeyMap = {
      physics: 'Physics', chemistry: 'Chemistry', math: 'Mathematics', maths: 'Mathematics', mathematics: 'Mathematics',
      biology: 'Biology', computer: 'Computer Science', computerscience: 'Computer Science', 'computer science': 'Computer Science',
      english: 'English', kannada: 'Kannada'
    };

    function normalizeKey(key) {
      return String(key || '').trim().toLowerCase().replace(/[\s_]/g, '');
    }

    function getRowValue(row, aliases) {
      const candidates = aliases.map((alias) => normalizeKey(alias));
      for (const [key, value] of Object.entries(row)) {
        if (candidates.includes(normalizeKey(key))) {
          return value;
        }
      }
      return '';
    }

    function titleCase(key) {
      return String(key || '')
        .replace(/[_\-]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase())
        .trim();
    }

    const parsedRows = rows.map((row) => {
      const rollNo = String(getRowValue(row, ['Roll No', 'RollNo', 'roll_no', 'rollno', 'roll number']) || '').trim().toUpperCase();
      const name = String(getRowValue(row, ['Name', 'name', 'Student Name', 'studentname']) || '').trim();
      const classGrade = String(getRowValue(row, ['Class', 'class', 'class_grade', 'classgrade']) || '').trim();

      let stream = String(getRowValue(row, ['Stream', 'stream']) || 'Science').trim();
      if (stream.toLowerCase().includes('sci')) stream = 'Science';
      else stream = 'Science';

      const combination = String(getRowValue(row, ['Combination', 'combination', 'comb']) || '').trim();

      if (!rollNo || !name) return null;

      const marks = {};
      Object.entries(row).forEach(([key, value]) => {
        const normalizedKey = normalizeKey(key);
        if (nonSubjectKeys.has(normalizedKey)) return;
        if (value === undefined || value === null || value === '') return;

        const mark = parseInt(value, 10);
        if (Number.isNaN(mark)) return;

        const displayName = subjectKeyMap[normalizedKey] || titleCase(key);
        marks[displayName] = mark;
      });

      if (Object.keys(marks).length === 0) return null;

      const totalMarks = Object.values(marks).reduce((sum, value) => sum + value, 0);
      const subjectCount = Object.keys(marks).length;
      const maxMarks = parseInt(row['MaxMarks'] || row['max_marks'], 10) || (subjectCount * 100);
      const percentage = maxMarks ? parseFloat(((totalMarks / maxMarks) * 100).toFixed(2)) : 0;

      return {
        rollNo,
        name,
        classGrade,
        stream,
        combination,
        marks,
        totalMarks,
        percentage
      };
    }).filter(Boolean).filter((item) => item.stream === 'Science');

    // 2. Calculate Stream Rank for Science students (kept for compatibility)
    // 3. Calculate year-specific rank and attach it as yearRank on each item
    function parseYearFromClass(classGrade) {
      const s = String(classGrade || '').toLowerCase();
      if (/\b1\b|\b1st\b|first|year\s*1/.test(s)) return 1;
      if (/\b2\b|\b2nd\b|second|year\s*2/.test(s)) return 2;
      const m = s.match(/(\d+)/);
      if (m) return parseInt(m[1], 10);
      return null;
    }

    const groupsByYear = {};
    parsedRows.forEach((item) => {
      item.year = parseYearFromClass(item.classGrade) || 'unknown';
      const key = String(item.year);
      if (!groupsByYear[key]) groupsByYear[key] = [];
      groupsByYear[key].push(item);
    });

    Object.values(groupsByYear).forEach((group) => {
      group.sort((a, b) => b.totalMarks - a.totalMarks);
      group.forEach((it, i) => { it.yearRank = i + 1; });
    });

    let successCount = 0;
    let hasResultsYearRankColumn = false;

    // determine whether the results table already supports year_rank
    try {
      const { error: yearRankError } = await supabase.from('results').select('year_rank').limit(1);
      if (!yearRankError) hasResultsYearRankColumn = true;
    } catch (e) {
      hasResultsYearRankColumn = false;
    }

    // 4. Save/Update records in Supabase
    for (const item of parsedRows) {
      await supabase.from('students').upsert({
        roll_no: item.rollNo,
        name: item.name,
        password: item.rollNo,
        class_grade: item.classGrade,
        stream: item.stream,
        combination: item.combination
      }, { onConflict: 'roll_no' });

      const resultPayload = {
        roll_no: item.rollNo,
        physics: item.marks.Physics ?? null,
        chemistry: item.marks.Chemistry ?? null,
        mathematics: item.marks.Mathematics ?? null,
        computer_science: item.marks['Computer Science'] ?? null,
        english: item.marks.English ?? null,
        kannada: item.marks.Kannada ?? null,
        total_marks: item.totalMarks,
        percentage: item.percentage
      };

      if (hasResultsYearRankColumn) {
        resultPayload.year_rank = item.yearRank;
      }

      await supabase.from('results').upsert(resultPayload, { onConflict: 'roll_no' });

      successCount++;
    }

    res.json({
      success: true,
      message: `Uploaded and ranked ${successCount} Science students!`,
      successCount
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to process upload' });
  }
});

// List Students
app.get('/api/admin/students', verifyAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('students')
    .select('roll_no, name, class_grade, stream, combination')
    .eq('stream', 'Science')
    .order('roll_no', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, students: data });
});

// Add Single Student
app.post('/api/admin/student', verifyAdmin, async (req, res) => {
  const { roll_no, name, password, class_grade, stream, combination } = req.body;
  if (!roll_no || !name) return res.status(400).json({ error: 'Roll number and name required' });

  if (String(stream || '').trim().toLowerCase() !== 'science') {
    return res.status(400).json({ error: 'Only Science students are supported' });
  }

  const { error } = await supabase.from('students').upsert({
    roll_no, name, password: password || roll_no, class_grade, stream, combination
  }, { onConflict: 'roll_no' });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, message: `Student ${roll_no} added` });
});

// ── STUDENT ENDPOINTS ────────────────────────────────────

// Student Login
app.post('/api/student/login', async (req, res) => {
  try {
    const { roll_no, password } = req.body;
    if (!roll_no || !password) return res.status(400).json({ error: 'Roll number and password required' });

    const normalizedRollNo = String(roll_no || '').trim().toUpperCase();
    console.log('[POST /api/student/login] roll_no:', roll_no, 'normalized:', normalizedRollNo);

    const { data, error } = await supabase
      .from('students')
      .select('roll_no, name, password, stream')
      .eq('stream', 'Science')
      .ilike('roll_no', normalizedRollNo)
      .single();

    console.log('[POST /api/student/login] student query', { data, error });

    if (error || !data) return res.status(404).json({ error: 'Student not found' });
    if (data.password !== password) return res.status(401).json({ error: 'Incorrect password' });

    res.json({ success: true, student: { roll_no: data.roll_no, name: data.name } });
  } catch (err) {
    console.error('[POST /api/student/login] failed', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get Student Result
app.get('/api/student/result/:roll_no', async (req, res) => {
  try {
    const roll_no = String(req.params.roll_no || '').trim();
    const normalizedRollNo = roll_no.toUpperCase();
    console.log('[GET /api/student/result] input roll_no:', roll_no, 'normalized:', normalizedRollNo);

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('roll_no, name, class_grade, stream, combination')
      .eq('stream', 'Science')
      .ilike('roll_no', normalizedRollNo)
      .single();

    console.log('[GET /api/student/result] student query', { student, studentError });
    if (studentError || !student) return res.status(404).json({ error: 'Student not found' });

    const { data: result, error: resultError } = await supabase
      .from('results')
      .select('*')
      .ilike('roll_no', normalizedRollNo)
      .single();

    console.log('[GET /api/student/result] result query', { result, resultError });
    if (resultError || !result) return res.status(404).json({ error: 'Results not found for this student' });

    const marks = {};
    if (result.marks && typeof result.marks === 'object') {
      Object.assign(marks, result.marks);
    }

    const subjectColumns = [
      ['Physics', result.physics],
      ['Chemistry', result.chemistry],
      ['Mathematics', result.mathematics],
      ['Computer Science', result.computer_science],
      ['English', result.english],
      ['Kannada', result.kannada]
    ];

    subjectColumns.forEach(([subject, value]) => {
      if (value !== null && value !== undefined && value !== '') marks[subject] = value;
    });

    // Compute year rank dynamically (do not rely on a DB column)
    function parseYearFromClass(classGrade) {
      const s = String(classGrade || '').toLowerCase();
      if (/\b1\b|\b1st\b|first|year\s*1/.test(s)) return 1;
      if (/\b2\b|\b2nd\b|second|year\s*2/.test(s)) return 2;
      const m = s.match(/(\d+)/);
      if (m) return parseInt(m[1], 10);
      return null;
    }

    const studentYear = parseYearFromClass(student.class_grade) || student.class_grade || 'unknown';

    // Fetch results for students in the same class_grade to compute ranking within the year
    const { data: sameYearStudents } = await supabase.from('students')
      .select('roll_no')
      .eq('class_grade', student.class_grade)
      .eq('stream', student.stream || 'Science');

    const sameYearRolls = (sameYearStudents || []).map(s => s.roll_no);

    let yearRank = null;
    if (sameYearRolls.length > 0) {
      const { data: yearResults } = await supabase.from('results').select('roll_no, total_marks').in('roll_no', sameYearRolls);
      const sorted = (yearResults || []).sort((a, b) => (b.total_marks || 0) - (a.total_marks || 0));
      const idx = sorted.findIndex(r => String(r.roll_no).toUpperCase() === String(normalizedRollNo).toUpperCase());
      if (idx >= 0) yearRank = idx + 1;
    }

    const { college_rank, stream_rank, ...resultWithoutRankFields } = result;

    res.json({ success: true, data: {
      ...resultWithoutRankFields,
      ...student,
      marks,
      total_marks: result.total_marks ?? null,
      percentage: result.percentage ?? null,
      rank: yearRank,
      stream: student.stream ?? result.stream ?? null,
      combination: student.combination ?? result.combination ?? null
    }});
  } catch (err) {
    console.error('[GET /api/student/result] failed', err);
    res.status(500).json({ error: 'Failed to fetch result' });
  }
});

app.listen(PORT, () => {
  console.log(`\n  🎓 Result Portal running at: http://localhost:${PORT}\n`);
});