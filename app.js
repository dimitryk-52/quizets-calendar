// =========================================================
//  Квиз-календарь — логика приложения
//  Клиент Supabase приходит как глобал `sb` из supabase.js
// =========================================================
const VERSION = 5;

// Палитра цветов для отметки квиза (значение сохраняется в game.color)
const SWATCH_COLORS = [
  { key: 'purple', hex: '#7c6af7' },
  { key: 'blue',   hex: '#4f8cff' },
  { key: 'teal',   hex: '#2dd4bf' },
  { key: 'green',  hex: '#34d399' },
  { key: 'amber',  hex: '#e0a83b' },
  { key: 'rose',   hex: '#f472b6' },
  { key: 'red',    hex: '#f87171' },
];

const monthNamesRu = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const weekdayNames = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];

// ---------- DOM ----------
const loginScreen = document.getElementById('login-screen');
const appEl       = document.getElementById('app');
const loginBtn    = document.getElementById('login-btn');
const loginError  = document.getElementById('login-error');
const emailInput  = document.getElementById('email');
const passwordInput = document.getElementById('password');
const signoutBtn  = document.getElementById('signout');

const monthLabel = document.getElementById('month-label');
const weeksEl    = document.getElementById('weeks');
const prevBtn    = document.getElementById('prev-month');
const nextBtn    = document.getElementById('next-month');

const modalBackdrop = document.getElementById('modal-backdrop');
const modalClose = document.getElementById('modal-close');
const modalHeading = document.getElementById('modal-heading');
const modalDateLabel = document.getElementById('modal-date-label');
const fNumber = document.getElementById('f-number');
const fTitle = document.getElementById('f-title');
const fPlatform = document.getElementById('f-platform');
const fDetails = document.getElementById('f-details');
const swatchesEl = document.getElementById('swatches');
const saveBtn = document.getElementById('save-btn');
const cancelBtn = document.getElementById('cancel-btn');
const deleteBtn = document.getElementById('delete-btn');
const saveStatus = document.getElementById('save-status');

document.getElementById('version-tag').textContent = 'v' + VERSION;

// ---------- State ----------
let currentMonth = new Date();
currentMonth.setDate(1);
let entriesByDate = {};        // 'YYYY-MM-DD' -> { id, date, game }
let activeCellDate = null;
let activeEntryId = null;
let selectedColor = null;

// ---------- Date helpers ----------
function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

function daysInMonthOf(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

// Последняя пятница месяца, которому принадлежит дата d
function isLastFriday(d) {
  return d.getDay() === 5 && (d.getDate() + 7) > daysInMonthOf(d);
}

// Крупный «квадрат»: четверг или последняя пятница месяца
function isBigDay(d) {
  return d.getDay() === 4 || isLastFriday(d);
}

// Строим сетку недель (Пн-первый), включая хвосты соседних месяцев
function buildGrid() {
  const y = currentMonth.getFullYear();
  const m = currentMonth.getMonth();
  const first = new Date(y, m, 1);
  const startOffset = (first.getDay() + 6) % 7; // Пн = 0

  const gridStart = new Date(y, m, 1 - startOffset);
  const totalCells = Math.ceil((startOffset + daysInMonthOf(first)) / 7) * 7;

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    cells.push({
      date: d,
      dateStr: fmtDate(d),
      inMonth: d.getMonth() === m,
      big: isBigDay(d),
    });
  }
  // разбиваем на недели по 7
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { weeks, gridStart, gridEnd: cells[cells.length - 1].date };
}

// ---------- Auth ----------
async function checkSession() {
  const { data: { session } } = await sb.auth.getSession();
  session ? showApp() : showLogin();
}

function showLogin() {
  loginScreen.style.display = 'flex';
  appEl.style.display = 'none';
}

function showApp() {
  loginScreen.style.display = 'none';
  appEl.style.display = 'block';
  renderMonth();
}

loginBtn.addEventListener('click', async () => {
  loginError.textContent = '';
  const { error } = await sb.auth.signInWithPassword({
    email: emailInput.value.trim(),
    password: passwordInput.value,
  });
  if (error) {
    loginError.textContent = 'Не удалось войти: проверь email и пароль.';
    return;
  }
  showApp();
});

passwordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loginBtn.click();
});

signoutBtn.addEventListener('click', async () => {
  await sb.auth.signOut();
  showLogin();
});

// ---------- Data ----------
async function fetchEntries(startStr, endStr) {
  const { data, error } = await sb
    .from('calendar')
    .select('id, date, game')
    .gte('date', startStr)
    .lte('date', endStr);

  entriesByDate = {};
  if (!error && data) data.forEach(row => { entriesByDate[row.date] = row; });
}

// ---------- Render ----------
async function renderMonth() {
  const { weeks, gridStart, gridEnd } = buildGrid();
  await fetchEntries(fmtDate(gridStart), fmtDate(gridEnd));

  monthLabel.textContent = `${monthNamesRu[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
  weeksEl.innerHTML = '';

  const today = new Date();

  weeks.forEach(week => {
    const row = document.createElement('div');
    row.className = 'week';

    week.forEach(cell => {
      const { date: d, dateStr, inMonth, big } = cell;
      const entry = entriesByDate[dateStr];
      const el = document.createElement('div');

      el.className = 'day ' + (big ? 'day--big' : 'day--sm');
      if (!inMonth) el.classList.add('day--adjacent');
      if (isSameDay(d, today)) el.classList.add('day--today');

      if (big) {
        const wd = document.createElement('div');
        wd.className = 'wd';
        wd.textContent = d.getDay() === 4 ? 'ЧТ' : 'ПТ';
        el.appendChild(wd);
      }

      const num = document.createElement('div');
      num.className = 'dnum';
      num.textContent = d.getDate();
      el.appendChild(num);

      if (big && entry && entry.game) {
        const g = entry.game;
        el.classList.add('has-game');
        if (g.color) el.style.setProperty('--c', colorHex(g.color));
        if (g.title) {
          const t = document.createElement('div');
          t.className = 'game-title';
          t.textContent = g.title;
          el.appendChild(t);
        }
      }

      // кликабельны только крупные дни текущего месяца
      if (big && inMonth) {
        el.tabIndex = 0;
        el.addEventListener('click', () => openModal(dateStr, d, entry));
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(dateStr, d, entry); }
        });
      }

      row.appendChild(el);
    });

    weeksEl.appendChild(row);
  });
}

function colorHex(key) {
  const found = SWATCH_COLORS.find(c => c.key === key);
  return found ? found.hex : key; // допускаем и прямой hex
}

// ---------- Month navigation ----------
function changeMonth(delta) {
  currentMonth.setMonth(currentMonth.getMonth() + delta);
  // короткая анимация сдвига
  weeksEl.classList.add(delta > 0 ? 'slide-left' : 'slide-right');
  setTimeout(() => {
    renderMonth().then(() => {
      weeksEl.classList.remove('slide-left', 'slide-right');
    });
  }, 120);
}

prevBtn.addEventListener('click', () => changeMonth(-1));
nextBtn.addEventListener('click', () => changeMonth(1));

// свайп влево/вправо по сетке (мобилки)
let touchX = null, touchY = null;
weeksEl.addEventListener('touchstart', (e) => {
  touchX = e.changedTouches[0].clientX;
  touchY = e.changedTouches[0].clientY;
}, { passive: true });

weeksEl.addEventListener('touchend', (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  const dy = e.changedTouches[0].clientY - touchY;
  touchX = touchY = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    changeMonth(dx < 0 ? 1 : -1); // свайп влево → следующий месяц
  }
}, { passive: true });

// стрелки клавиатуры на десктопе
document.addEventListener('keydown', (e) => {
  if (appEl.style.display === 'none') return;
  if (modalBackdrop.classList.contains('show')) return;
  if (e.key === 'ArrowLeft') changeMonth(-1);
  if (e.key === 'ArrowRight') changeMonth(1);
});

// ---------- Color swatches ----------
function renderSwatches() {
  swatchesEl.innerHTML = '';
  SWATCH_COLORS.forEach(c => {
    const s = document.createElement('button');
    s.type = 'button';
    s.className = 'swatch' + (selectedColor === c.key ? ' selected' : '');
    s.style.setProperty('--sc', c.hex);
    s.setAttribute('aria-label', c.key);
    s.addEventListener('click', () => {
      selectedColor = (selectedColor === c.key) ? null : c.key;
      renderSwatches();
    });
    swatchesEl.appendChild(s);
  });
}

// ---------- Modal ----------
function openModal(dateStr, dateObj, entry) {
  activeCellDate = dateStr;
  activeEntryId = entry ? entry.id : null;

  modalDateLabel.textContent =
    `${dateObj.getDate()} ${monthNamesRu[dateObj.getMonth()].toLowerCase()}, ${weekdayNames[dateObj.getDay()]}`;
  modalHeading.textContent = entry ? 'Квиз запланирован' : 'Новый квиз';

  const game = entry && entry.game ? entry.game : {};
  fNumber.value = game.number || '';
  fTitle.value = game.title || '';
  fPlatform.value = game.platform || '';
  fDetails.value = game.details || '';
  selectedColor = game.color || 'purple';
  renderSwatches();

  deleteBtn.style.display = entry ? 'inline-block' : 'none';
  saveStatus.textContent = '';
  modalBackdrop.classList.add('show');
}

function closeModal() {
  modalBackdrop.classList.remove('show');
  activeCellDate = null;
  activeEntryId = null;
}

modalClose.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalBackdrop.classList.contains('show')) closeModal();
});

saveBtn.addEventListener('click', async () => {
  saveStatus.textContent = 'Сохраняю…';
  const { data: { user } } = await sb.auth.getUser();

  const gamePayload = {
    number: fNumber.value.trim(),
    title: fTitle.value.trim(),
    platform: fPlatform.value.trim(),
    details: fDetails.value.trim(),
    color: selectedColor,
  };

  let error;
  if (activeEntryId) {
    ({ error } = await sb.from('calendar').update({ game: gamePayload }).eq('id', activeEntryId));
  } else {
    ({ error } = await sb.from('calendar').insert({ date: activeCellDate, game: gamePayload, created_by: user.id }));
  }

  if (error) {
    saveStatus.textContent = 'Ошибка сохранения: ' + error.message;
    return;
  }
  closeModal();
  renderMonth();
});

deleteBtn.addEventListener('click', async () => {
  if (!activeEntryId) return;
  saveStatus.textContent = 'Удаляю…';
  const { error } = await sb.from('calendar').delete().eq('id', activeEntryId);
  if (error) {
    saveStatus.textContent = 'Ошибка удаления: ' + error.message;
    return;
  }
  closeModal();
  renderMonth();
});

// ---------- Go ----------
checkSession();
