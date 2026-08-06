// Result page dynamic rendering

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${icons[type]}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function formatMarkValue(value) {
    return value === null || value === undefined || value === '' ? '—' : value;
}

function getOrderedSubjects(stream, combination, marks) {
  const normalizedStream = String(stream || '').trim().toLowerCase();
  const ordered = [];

  const addIfPresentKey = (key) => {
    if (marks[key] != null && marks[key] !== '' && !ordered.includes(key)) {
      ordered.push(key);
    }
  };

  // Only render Science subjects
  if (normalizedStream.includes('science')) {
        addIfPresentKey('physics');
        addIfPresentKey('chemistry');
        addIfPresentKey('mathematics');
        addIfPresentKey('biology');
        addIfPresentKey('computer_science');
        addIfPresentKey('english');
        addIfPresentKey('kannada');
  }

  return ordered;
}
function titleCase(str) {
    return String(str || '').replace(/[_\-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()).trim();
}

function normalizeMarks(rawMarks) {
    const marks = rawMarks || {};
    const normalized = {};
    const candidates = {
        Physics: ['Physics', 'physics'],
        Chemistry: ['Chemistry', 'chemistry'],
        Mathematics: ['Mathematics', 'mathematics', 'math', 'maths'],
        Biology: ['Biology', 'biology', 'bio'],
        'Computer Science': ['Computer Science', 'computer_science', 'computer', 'computerscience', 'computer science'],
        English: ['English', 'english'],
        Kannada: ['Kannada', 'kannada']
    };

    Object.entries(candidates).forEach(([display, keys]) => {
        for (const k of keys) {
            if (marks[k] != null && marks[k] !== '') {
                normalized[display] = marks[k];
                break;
            }
        }
    });

    // include any other keys present in rawMarks (title-cased)
    Object.keys(marks).forEach((k) => {
        const tc = titleCase(k);
        if (!normalized[tc]) normalized[tc] = marks[k];
    });

    return normalized;
}

function renderStudentInfo(data) {
    document.getElementById('studentName').textContent = data.name || '—';
    document.getElementById('studentRollNo').textContent = data.roll_no || data.rollNumber || '—';
    document.getElementById('studentClass').textContent = data.class_grade || '—';
    document.getElementById('studentStream').textContent = data.stream || 'Science';
    document.getElementById('studentCombination').textContent = data.combination || '—';
}

function renderMarksTable(data) {
    const marksBody = document.getElementById('marksBody');
    if (!marksBody) return;

    const rawMarks = data.marks || {};
    const marks = normalizeMarks(rawMarks);

    // If server returned subject columns too, merge them
    const columnMap = {
        Physics: data.physics, Chemistry: data.chemistry, Mathematics: data.mathematics,
        'Computer Science': data.computer_science, English: data.english, Kannada: data.kannada,
        Biology: data.biology
    };
    Object.entries(columnMap).forEach(([k, v]) => {
        if ((marks[k] == null || marks[k] === '') && v != null && v !== '') marks[k] = v;
    });

    // create a marks object that contains both snake_case and display keys for ordering
    const marksForOrdering = {};
    Object.entries(marks).forEach(([display, val]) => {
        const snake = String(display).toLowerCase().replace(/\s+/g, '_');
        marksForOrdering[snake] = val;
        marksForOrdering[display] = val;
    });

    const subjects = getOrderedSubjects(data.stream, data.combination, marksForOrdering).map((k) => {
        // getOrderedSubjects may return snake_case keys; map to display keys
        const mapping = {
            physics: 'Physics', chemistry: 'Chemistry', mathematics: 'Mathematics', biology: 'Biology', computer_science: 'Computer Science', english: 'English', kannada: 'Kannada'
        };
        return mapping[k] || titleCase(k) || k;
    });

    // fallback: if no subjects from ordering, show all marks keys
    const finalSubjects = subjects.length ? subjects : Object.keys(marks);

    if (finalSubjects.length === 0) {
        marksBody.innerHTML = '<tr><td colspan="2" style="text-align:center; color:#9CA3AF;">No marks available for this student.</td></tr>';
        return;
    }

    marksBody.innerHTML = finalSubjects.map((subject) => {
        return `
            <tr>
                <td>${subject}</td>
                <td>${formatMarkValue(marks[subject])}</td>
            </tr>
        `;
    }).join('');
}
function renderStats(data) {
    document.getElementById('statTotal').textContent = data.total_marks != null ? `${data.total_marks}` : '—';
    document.getElementById('statPercent').textContent = data.percentage != null ? `${data.percentage}%` : '—';
    const rankEl = document.getElementById('statRank');
    if (rankEl) rankEl.textContent = data.rank ?? data.Rank ?? '—';
}


async function loadResult() {
    const cachedRollNo = localStorage.getItem('student_roll_no');
    const rollNo = cachedRollNo ? String(cachedRollNo).trim().toUpperCase() : '';
    if (!rollNo) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const res = await fetch(`/api/student/result/${rollNo}`);
        const data = await res.json();
        console.log('STREAM:', JSON.stringify(data.data.stream));
console.log('MARK KEYS:', Object.keys(data.data.marks || {}));

        if (!res.ok || !data.success) {
            showToast(data.error || 'Failed to load results', 'error');
            return;
        }

        renderStudentInfo(data.data);
        renderMarksTable(data.data);
        renderStats(data.data);
    } catch (err) {
        showToast('Network error — could not load results', 'error');
    }
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('student_roll_no');
        window.location.href = 'index.html';
    });
}

loadResult();
