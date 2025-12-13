/* ------------------ original functions (kept) ------------------ */
function saveReview() {
  const input = document.getElementById("review-input")?.value;
  if (!input || input.trim() === "") return;
  const reviews = JSON.parse(localStorage.getItem("reviews") || "[]");
  reviews.push(input);
  localStorage.setItem("reviews", JSON.stringify(reviews));
  const el = document.getElementById("review-input");
  if(el) el.value = "";
  loadReviews();
}

function loadReviews() {
  const reviews = JSON.parse(localStorage.getItem("reviews") || "[]");
  const container = document.getElementById("review-list");
  if (container) container.innerHTML = reviews.map(r => `<p>${r}</p>`).join("");
}

function saveDiary() {
  const inputEl = document.getElementById("diary-input");
  const input = inputEl ? inputEl.value : "";
  if (input.trim() === "") return;
  const diaries = JSON.parse(localStorage.getItem("diaries") || "[]");
  diaries.push({ date: new Date().toLocaleDateString(), text: input });
  localStorage.setItem("diaries", JSON.stringify(diaries));
  if(inputEl) inputEl.value = "";
  loadDiaries();
}

function loadDiaries() {
  const diaries = JSON.parse(localStorage.getItem("diaries") || "[]");
  const container = document.getElementById("diary-list");
  if (container) container.innerHTML = diaries
    .map(d => `<p><b>${d.date}</b>: ${d.text}</p>`)
    .join("");
}

/* ------------------ new/extended diary features ------------------ */

/* state */
let diaries = JSON.parse(localStorage.getItem('diaries') || '[]'); // will contain extended entries too
let folders = JSON.parse(localStorage.getItem('folders') || '[]'); // {name}
let calendarYear, calendarMonth;
const today = new Date();

/* elements */
const diaryDateEl = () => document.getElementById('diary-date');
const weatherFixedEl = () => document.getElementById('weather-fixed');
const diaryTitleEl = () => document.getElementById('diary-title');
const diaryTextEl = () => document.getElementById('diaryText');
const diaryImgInput = () => document.getElementById('diary-img');
const diaryImageFile = () => document.getElementById('diary-image-file');

const diaryFlatList = () => document.getElementById('diary-flat-list');
const folderListEl = () => document.getElementById('folderList');
const searchInputEl = () => document.getElementById('searchInput');
const selectedDayListEl = () => document.getElementById('selected-day-list');

const modal = () => document.getElementById('modal');
const modalClose = () => document.getElementById('modalClose');

/* helpers */
function saveState(){
  localStorage.setItem('diaries', JSON.stringify(diaries));
  localStorage.setItem('folders', JSON.stringify(folders));
}

function formatISO(d){ return d.toISOString().split('T')[0]; } // YYYY-MM-DD
function formatDisplayISO(iso){
  if(!iso) return '';
  const dd = new Date(iso + 'T00:00:00');
  return dd.toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'});
}

/* calendar generation */
function renderCalendar(y,m){
  calendarYear = y; calendarMonth = m;
  const firstDay = new Date(y,m,1).getDay();
  const lastDate = new Date(y,m+1,0).getDate();
  const cal = document.getElementById('calendar');
  document.getElementById('monthLabel').textContent = `${y}년 ${m+1}월`;
  cal.innerHTML = '';

  // weekday headers
  const days = ['일','월','화','수','목','금','토'];
  const headerRow = document.createElement('div');
  headerRow.style.display='grid';
  headerRow.style.gridTemplateColumns='repeat(7,1fr)';
  headerRow.style.marginBottom='6px';
  days.forEach(d=>{
    const el = document.createElement('div');
    el.textContent = d;
    el.style.fontWeight = '700';
    el.style.textAlign='center';
    cal.appendChild(el);
  });

  // create day cells grid container (we'll append 7*rows)
  const grid = document.createElement('div');
  grid.style.display='grid';
  grid.style.gridTemplateColumns='repeat(7,1fr)';
  grid.style.gap='6px';

  // empty leading
  for(let i=0;i<firstDay;i++){
    const empty = document.createElement('div');
    empty.className='day-cell';
    grid.appendChild(empty);
  }

  for(let d=1; d<=lastDate; d++){
    const dateObj = new Date(y,m,d);
    const iso = formatISO(dateObj);
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    cell.textContent = d;
    // mark if entries exist
    const count = diaries.filter(it => it.date === iso).length;
    if(count>0) cell.classList.add('has-entry');
    if(iso === formatISO(new Date())) cell.classList.add('today');
    cell.addEventListener('click', ()=> onDayClick(iso, cell));
    grid.appendChild(cell);
  }

  cal.appendChild(grid);
}

/* day click */
let selectedISO = null;
function onDayClick(iso, cellEl){
  selectedISO = iso;
  // highlight selected cell
  qAll('.day-cell').forEach(c => c.classList.remove('selected'));
  cellEl.classList.add('selected');
  // update date display
  const dEl = diaryDateEl();
  if(dEl) dEl.textContent = `${formatDisplayISO(iso)} (${new Date(iso).toLocaleDateString('ko-KR',{weekday:'short'})})`;
  // render selected-date list
  renderSelectedDateList();
}

/* render selected-date list */
function renderSelectedDateList(){
  const wrap = selectedDayListEl();
  wrap.innerHTML = '';
  if(!selectedISO){
    wrap.innerHTML = '<div style="color:#666;padding:8px">달력에서 날짜를 선택하세요</div>';
    return;
  }
  const items = diaries.filter(d => d.date === selectedISO);
  if(items.length === 0){
    wrap.innerHTML = '<div style="color:#666;padding:8px">해당 날짜의 일기가 없습니다</div>';
    return;
  }
  items.forEach((it, idx)=>{
    const row = document.createElement('div');
    row.className='flat-item';
    row.innerHTML = `<div><div style="font-size:0.9rem;color:#666">${formatDisplayISO(it.date)}</div><div style="font-weight:700">${escapeHTML(it.title||'(제목 없음)')}</div></div>
                     <div style="color:#666">${escapeHTML(it.folder||'기본')}</div>`;
    row.addEventListener('click', ()=> openModalById(it._id));
    wrap.appendChild(row);
  });
}

/* show main flat list (search or all) */
function loadDiaryList(keyword=''){
  const wrap = diaryFlatList();
  const q = (keyword || '').toLowerCase();
  const list = diaries.filter(it => {
    if(!q) return true;
    return (it.title && it.title.toLowerCase().includes(q)) ||
           (it.content && it.content.toLowerCase().includes(q)) ||
           (it.date && it.date.includes(q));
  }).sort((a,b)=> b.createdAt - a.createdAt);

  if(list.length === 0){
    wrap.innerHTML = '<div style="padding:10px;color:#666">저장된 일기가 없습니다</div>';
    return;
  }
  wrap.innerHTML = '';
  list.forEach((it, idx)=>{
    const row = document.createElement('div');
    row.className = 'flat-item';
    row.innerHTML = `<div style="min-width:120px;color:#666">${formatDisplayISO(it.date)}</div><div style="font-weight:700">${escapeHTML(it.title||'(제목 없음)')}</div><div style="opacity:0.8">${escapeHTML(it.folder||'기본')}</div>`;
    row.addEventListener('click', ()=> openModalById(it._id));
    wrap.appendChild(row);
  });
}

/* open modal detail by _id */
function openModalById(id){
  const data = diaries.find(d => d._id === id);
  if(!data) return;
  document.getElementById('modalDate').textContent = formatDisplayISO(data.date);
  document.getElementById('modalWeather').textContent = data.weather || '';
  const imgEl = document.getElementById('modalImage');
  if(data.image){
    imgEl.style.display='block';
    imgEl.src = data.image;
  } else {
    imgEl.style.display='none';
    imgEl.src = '';
  }
  document.getElementById('modalTitle').textContent = data.title || '(제목 없음)';
  document.getElementById('modalContent').textContent = data.content || '(내용 없음)';
  document.getElementById('modalFolder').textContent = `폴더: ${data.folder||'기본'}`;

  // attach actions
  document.getElementById('modalDeleteBtn').onclick = ()=>{
    if(!confirm('삭제하시겠습니까?')) return;
    diaries = diaries.filter(x => x._id !== id);
    saveState();
    renderSelectedDateList();
    loadDiaryList(searchInputEl().value);
    renderCalendar(calendarYear, calendarMonth);
    closeModal();
  };
  document.getElementById('modalEditBtn').onclick = ()=>{
    // populate form and remove existing item (will save as new on save)
    diaryTitleEl().value = data.title || '';
    diaryTextEl().value = data.content || '';
    diaryImgInput().value = data.image || '';
    // if there's image base64, keep file input empty (can't populate File)
    // set selected date to this date
    selectedISO = data.date;
    // highlight date cell
    highlightCalendarDate(data.date);
    diaryDateEl().textContent = `${formatDisplayISO(data.date)} (${new Date(data.date).toLocaleDateString('ko-KR',{weekday:'short'})})`;
    // set folder selection via prompt (we didn't implement folder select dropdown, so keep folder text input)
    document.getElementById('folderName').value = data.folder || '';
    // remove the item (we'll re-save when user clicks 저장)
    diaries = diaries.filter(x => x._id !== id);
    saveState();
    loadDiaryList(searchInputEl().value);
    renderSelectedDateList();
    renderCalendar(calendarYear, calendarMonth);
    closeModal();
  };

  modal().style.display = 'flex';
}

/* modal close */
function closeModal(){ modal().style.display = 'none'; }

/* helper: highlight calendar date */
function highlightCalendarDate(iso){
  qAll('.day-cell').forEach(c=>{
    if(c.classList.contains('selected')) c.classList.remove('selected');
  });
  qAll('.day-cell').forEach(c=>{
    // compare by text and month/year
    const day = parseInt(c.textContent,10);
    if(!day) return;
    const cand = formatISO(new Date(calendarYear, calendarMonth, day));
    if(cand === iso) c.classList.add('selected');
  });
}

/* utilities */
function qAll(sel){ return Array.from(document.querySelectorAll(sel)); }
function escapeHTML(s){ return String(s||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

/* Save diary (full) - supports file input -> base64, or image URL field */
async function readFileAsDataURL(file){
  return new Promise((res,rej)=>{
    if(!file) return res('');
    const fr = new FileReader();
    fr.onload = e => res(e.target.result);
    fr.onerror = e => rej(e);
    fr.readAsDataURL(file);
  });
}

async function saveDiaryFull(){
  // ensure a date is selected
  if(!selectedISO){
    alert('달력에서 날짜를 선택하세요. 날짜는 필수입니다.');
    return;
  }
  const title = diaryTitleEl().value.trim();
  const content = diaryTextEl().value.trim();
  // prefer file input if provided
  const fileInput = diaryImageFile();
  let imageData = '';
  if(fileInput && fileInput.files && fileInput.files[0]){
    try{
      imageData = await readFileAsDataURL(fileInput.files[0]);
    }catch(e){ console.warn('file read err', e); imageData = ''; }
  } else {
    // fallback to URL input
    imageData = diaryImgInput().value.trim();
  }
  const folderName = (document.getElementById('folderName').value || '').trim() || '기본';
  // collect weather text if exists
  const weatherTxt = weatherFixedEl() ? weatherFixedEl().textContent : '';

  const entry = {
    _id: (Date.now().toString(36) + Math.random().toString(36).slice(2,8)),
    date: selectedISO,
    title: title || '(제목 없음)',
    content: content || '',
    image: imageData || '',
    folder: folderName,
    weather: weatherTxt,
    createdAt: Date.now()
  };

  diaries.push(entry);
  saveState();
  // reset form except selected date
  diaryTitleEl().value = '';
  diaryTextEl().value = '';
  diaryImgInput().value = '';
  if(diaryImageFile()) diaryImageFile().value = '';

  // ensure folder is saved in folder list
  if(folderName && folderName !== '기본' && !folders.includes(folderName)){
    folders.push(folderName);
    saveState();
  }

  renderSelectedDateList();
  loadDiaryList(searchInputEl().value);
  renderCalendar(calendarYear, calendarMonth);
  alert('저장되었습니다.');
}

/* prev/next month */
document.getElementById('prevMonth').addEventListener('click', ()=>{
  calendarMonth--;
  if(calendarMonth < 0){ calendarMonth = 11; calendarYear--; }
  renderCalendar(calendarYear, calendarMonth);
});
document.getElementById('nextMonth').addEventListener('click', ()=>{
  calendarMonth++;
  if(calendarMonth > 11){ calendarMonth = 0; calendarYear++; }
  renderCalendar(calendarYear, calendarMonth);
});

/* folder creation & view toggle */
document.getElementById('addFolderBtn').addEventListener('click', ()=>{
  const name = (document.getElementById('folderName').value || '').trim();
  if(!name){ alert('폴더 이름을 입력하세요'); return; }
  if(!folders.includes(name)) folders.push(name);
  saveState();
  renderFolders();
  document.getElementById('folderName').value = '';
});

function renderFolders(){
  const el = folderListEl();
  if(!el) return;
  if(folders.length === 0){
    el.innerHTML = '<div style="padding:10px;color:#888">폴더가 없습니다</div>';
    return;
  }
  el.innerHTML = '';
  folders.forEach(fn=>{
    const div = document.createElement('div');
    div.className = 'flat-item';
    div.textContent = fn + ` (${diaries.filter(d=>d.folder===fn).length})`;
    div.addEventListener('click', ()=> showFolderItems(fn));
    el.appendChild(div);
  });
}

function showFolderItems(folderName){
  const items = diaries.filter(d => d.folder === folderName).sort((a,b)=> b.createdAt - a.createdAt);
  diaryFlatList().innerHTML = '';
  if(items.length===0){
    diaryFlatList().innerHTML = '<div style="padding:10px;color:#666">폴더에 일기가 없습니다</div>';
    return;
  }
  items.forEach(it=>{
    const row = document.createElement('div');
    row.className='flat-item';
    row.innerHTML = `<div style="min-width:120px;color:#666">${formatDisplayISO(it.date)}</div><div style="font-weight:700">${escapeHTML(it.title)}</div><div style="opacity:0.8">${escapeHTML(it.folder)}</div>`;
    row.addEventListener('click', ()=> openModalById(it._id));
    diaryFlatList().appendChild(row);
  });
}

/* toggle buttons */
document.getElementById('allToggle').addEventListener('click', ()=>{
  document.getElementById('allToggle').classList.add('active');
  document.getElementById('folderToggle').classList.remove('active');
  document.getElementById('folderList').style.display = 'none';
  document.getElementById('diary-flat-list').style.display = 'block';
  loadDiaryList(searchInputEl().value);
});
document.getElementById('folderToggle').addEventListener('click', ()=>{
  document.getElementById('folderToggle').classList.add('active');
  document.getElementById('allToggle').classList.remove('active');
  document.getElementById('folderList').style.display = 'block';
  document.getElementById('diary-flat-list').style.display = 'none';
  renderFolders();
});

/* search */
searchInputEl().addEventListener('input', (e)=> loadDiaryList(e.target.value) );

/* small helpers */
function q(el){ return document.querySelector(el); }

/* modal close */
modalClose().addEventListener('click', closeModal);
modal().addEventListener('click', (ev)=>{ if(ev.target === modal()) closeModal(); });

/* highlight today's date & init */
function init(){
  // load existing raw diaries from localStorage (keep compatibility)
  const raw = JSON.parse(localStorage.getItem('diaries') || '[]');
  // If raw items are the old simple format (date,text), convert to extended schema only if needed
  if(raw.length && raw[0].text !== undefined && raw[0].date !== undefined && raw[0].title === undefined){
    // convert old entries to extended entries _id + title empty
    diaries = raw.map(r => ({
      _id: (Date.now().toString(36) + Math.random().toString(36).slice(2,6)),
      date: (new Date(r.date)).toISOString().split('T')[0],
      title: '(기존 일기)',
      content: r.text || '',
      image: '',
      folder: '기본',
      weather: '',
      createdAt: Date.now()
    }));
    saveState();
  } else {
    // if already extended, keep as-is
    diaries = raw;
  }

  folders = JSON.parse(localStorage.getItem('folders') || '[]');

  // calendar start at current month
  calendarYear = today.getFullYear();
  calendarMonth = today.getMonth();
  renderCalendar(calendarYear, calendarMonth);

  // default selected date = today
  selectedISO = formatISO(today);
  diaryDateEl().textContent = `${formatDisplayISO(selectedISO)} (${today.toLocaleDateString('ko-KR',{weekday:'short'})})`;
  highlightCalendarDate(selectedISO);
  renderSelectedDateList();

  // initial lists
  loadDiaryList();
  renderFolders();

  // attach save buttons
  document.getElementById('saveBtnTop').addEventListener('click', saveDiaryFull);
  // keep compatibility with existing saveDiary function (if another UI uses it)
}

/* init on load (replace previous onload definitions safely) */
window.addEventListener('DOMContentLoaded', () => {
  // call original loaders if exist
  try{ loadReviews(); }catch(e){/*ignore*/ }
  try{ loadDiaries(); }catch(e){/*ignore*/ }

  init();

  // set weather-fixed from any existing #weather element (if other pages set it)
  const w = document.getElementById('weather')?.textContent;
  if(w) document.getElementById('weather-fixed').textContent = w;
});

/* expose some functions globally used by inline handlers */
window.prevMonth = ()=> { calendarMonth--; if(calendarMonth<0){calendarMonth=11;calendarYear--;} renderCalendar(calendarYear,calendarMonth); };
window.nextMonth = ()=> { calendarMonth++; if(calendarMonth>11){calendarMonth=0;calendarYear++;} renderCalendar(calendarYear,calendarMonth); };
window.saveDiaryFull = saveDiaryFull;
window.createFolder = ()=> document.getElementById('addFolderBtn').click();
window.toggleView = (v)=> { if(v==='all') document.getElementById('allToggle').click(); else document.getElementById('folderToggle').click(); };
window.openModalById = openModalById;
(function(){
  // 안전한 네임스페이스
  const KEY = 'diaries'; // 기존 key 유지
  const FOLDER_KEY = 'diaryFolders';

  // 상태
  let diaries = []; // 확장 형식으로 유지
  let folders = JSON.parse(localStorage.getItem(FOLDER_KEY) || '[]');
  let calendarYear, calendarMonth;
  let selectedISO = null; // YYYY-MM-DD

  // 유틸
  function loadRaw(){
    try{
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    }catch(e){ return []; }
  }
  function saveRaw(){
    localStorage.setItem(KEY, JSON.stringify(diaries));
  }
  function toISODateFromAny(s){
    if(!s) return null;
    // if already YYYY-MM-DD
    if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // try parsing Date and format
    const d = new Date(s);
    if(isNaN(d)) return null;
    return d.toISOString().split('T')[0];
  }
  function formatDisplayISO(iso){
    if(!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit', weekday:'short'});
  }
  function escapeHTML(s){ return String(s||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  // 자동 변환: 기존 형식 -> 확장형
  function migrateIfNeeded(){
    const raw = loadRaw();
    if(!raw || raw.length===0){
      diaries = [];
      return;
    }
    // decide whether already extended (has .title or .content or _id)
    const isExtended = raw.some(it => it && (it._id || it.title || it.content || it.image || it.folder));
    if(isExtended){
      // normalize date format to YYYY-MM-DD
      diaries = raw.map(it=>{
        if(it && it.date) it.date = toISODateFromAny(it.date) || it.date;
        return it;
      });
      return;
    }
    // old format assumed: [{date, text}, ...] or similar simple structure
    diaries = raw.map((it)=>{
      const iso = toISODateFromAny(it.date) || toISODateFromAny(new Date());
      return {
        _id: (Date.now().toString(36) + Math.random().toString(36).slice(2,6)),
        date: iso,
        title: '(제목 없음)',
        content: it.text || it.content || '',
        image: '',
        folder: '',
        weather: '',
        createdAt: Date.now()
      };
    });
    saveRaw();
  }

  // DOM helpers
  function q(id){ return document.getElementById(id); }
  function qAll(sel){ return Array.from(document.querySelectorAll(sel)); }

  /* ------------------ Calendar render ------------------ */
  function renderCalendar(y,m){
    calendarYear = y; calendarMonth = m;
    const cal = q('calendar');
    if(!cal) return;
    q('monthLabel').textContent = `${y}년 ${m+1}월`;

    cal.innerHTML = ''; // we'll produce weekday header externally in HTML

    const firstDay = new Date(y,m,1).getDay();
    const lastDate = new Date(y,m+1,0).getDate();

    // fill empties
    for(let i=0;i<firstDay;i++){
      const empty = document.createElement('div');
      empty.className = 'day-cell empty';
      cal.appendChild(empty);
    }
    for(let d=1; d<=lastDate; d++){
      const iso = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const cell = document.createElement('div');
      cell.className = 'day-cell';
      cell.textContent = d;
      // mark has entries
      const cnt = diaries.filter(it => it.date === iso).length;
      if(cnt>0) cell.classList.add('has-entry');
      // mark today
      const todayIso = (new Date()).toISOString().split('T')[0];
      if(iso===todayIso) cell.classList.add('today');

      cell.addEventListener('click', ()=>{
        // clear previous selection
        qAll('.day-cell.selected').forEach(n=>n.classList.remove('selected'));
        cell.classList.add('selected');
        selectedISO = iso;
        // update displayed date in top
        const dEl = q('diary-date');
        if(dEl) dEl.textContent = `${formatDisplayISO(iso)}`;
        renderSelectedDateList();
      });
      cal.appendChild(cell);
    }
  }

  function prevMonth(){
    calendarMonth--;
    if(calendarMonth<0){ calendarMonth=11; calendarYear--; }
    renderCalendar(calendarYear, calendarMonth);
  }
  function nextMonth(){
    calendarMonth++;
    if(calendarMonth>11){ calendarMonth=0; calendarYear++; }
    renderCalendar(calendarYear, calendarMonth);
  }

  /* ------------------ Selected date list (beneath calendar) ------------------ */
  function renderSelectedDateList(){
    const wrap = q('selected-day-list');
    if(!wrap) return;
    wrap.innerHTML = '';
    if(!selectedISO){
      wrap.innerHTML = '<div style="padding:8px;color:#666">달력에서 날짜를 선택하세요</div>';
      return;
    }
    const items = diaries.filter(d => d.date === selectedISO).sort((a,b)=> b.createdAt - a.createdAt);
    if(items.length===0){
      wrap.innerHTML = '<div style="padding:8px;color:#666">해당 날짜의 일기가 없습니다</div>';
      return;
    }
    items.forEach(it=>{
      const row = document.createElement('div');
      row.className = 'flat-item';
      row.innerHTML = `<div style="display:flex;flex-direction:column">
                          <span style="font-size:0.9rem;color:#666">${formatDisplayISO(it.date)}</span>
                          <strong>${escapeHTML(it.title || '(제목 없음)')}</strong>
                       </div>
                       <div style="display:flex;align-items:center;gap:8px">
                         <button class="btn-small" data-id="${it._id}" data-action="view">보기</button>
                         <button class="btn-small" data-id="${it._id}" data-action="edit">수정</button>
                         <button class="btn-small" data-id="${it._id}" data-action="delete">삭제</button>
                       </div>`;
      wrap.appendChild(row);
    });
  }

  /* ------------------ Flat global list (search results / all) ------------------ */
  function loadDiaryList(query=''){
    const wrap = q('diary-flat-list');
    if(!wrap) return;
    const qstr = (query||'').toLowerCase();
    const list = diaries.filter(it=>{
      if(!qstr) return true;
      return (it.title||'').toLowerCase().includes(qstr) ||
             (it.content||'').toLowerCase().includes(qstr) ||
             (it.date||'').includes(qstr);
    }).sort((a,b)=> b.createdAt - a.createdAt);

    wrap.innerHTML = '';
    if(list.length===0){
      wrap.innerHTML = '<div style="padding:10px;color:#666">저장된 일기가 없습니다</div>';
      return;
    }
    list.forEach(it => {
      const card = document.createElement('div');
      card.className = 'list-review-card';
      card.addEventListener('click', () => openModalById(it._id));

      card.innerHTML = `
        <div class="card-date">${formatDisplayISO(it.date)}</div>
        <div class="card-title">${escapeHTML(it.title || '(제목 없음)')}</div>
        <div class="card-folder">${escapeHTML(it.folder || '기본')}</div>
      `;
      wrap.appendChild(card);
    });
  }

  /* ------------------ Save diary (from left form) ------------------ */
  async function saveDiaryFull(){
    // require selectedISO
    if(!selectedISO){
      alert('달력에서 날짜를 선택하세요. 날짜는 필수입니다.');
      return;
    }
    const title = (q('diary-title')?.value || '').trim();
    const content = (q('diaryText')?.value || '').trim();
    // image preference: file input > URL
    let imageData = '';
    const fileInput = q('diary-image-file');
    if(fileInput && fileInput.files && fileInput.files[0]){
      imageData = await readFileAsDataURL(fileInput.files[0]);
    } else {
      imageData = (q('diary-img')?.value || '').trim();
    }
    const folderName = (q('folderName')?.value || '').trim() || '';
    const weatherTxt = q('weather-fixed') ? q('weather-fixed').textContent : '';

    const entry = {
      _id: (Date.now().toString(36) + Math.random().toString(36).slice(2,6)),
      date: selectedISO,
      title: title || '(제목 없음)',
      content: content || '',
      image: imageData || '',
      folder: folderName,
      weather: weatherTxt || '',
      createdAt: Date.now()
    };
    diaries.push(entry);
    saveRaw();
    // add folder if new
    if(folderName && !folders.includes(folderName)){
      folders.push(folderName);
      localStorage.setItem(FOLDER_KEY, JSON.stringify(folders));
    }
    // reset fields (keep selected date)
    if(q('diary-title')) q('diary-title').value='';
    if(q('diaryText')) q('diaryText').value='';
    if(q('diary-img')) q('diary-img').value='';
    if(fileInput) fileInput.value='';

    renderSelectedDateList();
    loadDiaryList(q('searchInput')?.value || '');
    renderCalendar(calendarYear, calendarMonth);
    alert('저장되었습니다.');
  }

  function readFileAsDataURL(file){
    return new Promise((res,rej)=>{
      const fr = new FileReader();
      fr.onload = e => res(e.target.result);
      fr.onerror = e => rej(e);
      fr.readAsDataURL(file);
    });
  }

  /* ------------------ Modal (view/edit/delete) ------------------ */
  function openModalById(id){
    const data = diaries.find(d => d._id === id);
    if(!data) return;
    // fill modal elements (assumes modal exists in HTML)
    if(q('modalDate')) q('modalDate').textContent = formatDisplayISO(data.date);
    if(q('modalWeather')) q('modalWeather').textContent = data.weather || '';
    if(q('modalTitle')) q('modalTitle').textContent = data.title || '(제목 없음)';
    if(q('modalContent')) q('modalContent').textContent = data.content || '(내용 없음)';
    const imgEl = q('modalImage');
    if(imgEl){
      if(data.image){ imgEl.src = data.image; imgEl.style.display='block'; }
      else { imgEl.src=''; imgEl.style.display='none'; }
    }
    if(q('modalFolder')) q('modalFolder').textContent = `폴더: ${data.folder||'기본'}`;

    // attach edit/delete handlers
    if(q('modalDeleteBtn')) q('modalDeleteBtn').onclick = ()=>{
      if(!confirm('삭제하시겠습니까?')) return;
      diaries = diaries.filter(x => x._id !== id);
      saveRaw();
      renderSelectedDateList();
      loadDiaryList(q('searchInput')?.value || '');
      renderCalendar(calendarYear, calendarMonth);
      closeModal();
    };
    if(q('modalEditBtn')) q('modalEditBtn').onclick = ()=>{
      // populate form for editing: we will remove old entry and let user save as new
      if(q('diary-title')) q('diary-title').value = data.title || '';
      if(q('diaryText')) q('diaryText').value = data.content || '';
      if(q('diary-img')) q('diary-img').value = data.image || '';
      // set selected date
      selectedISO = data.date;
      if(q('diary-date')) q('diary-date').textContent = formatDisplayISO(data.date);
      // remove the old entry
      diaries = diaries.filter(x => x._id !== id);
      saveRaw();
      renderSelectedDateList();
      loadDiaryList(q('searchInput')?.value || '');
      renderCalendar(calendarYear, calendarMonth);
      closeModal();
      // scroll to top (form)
      window.scrollTo({top:0, behavior:'smooth'});
    };

    // show modal
    const modalEl = q('modal');
    if(modalEl) modalEl.style.display='flex';
  }
  function closeModal(){ if(q('modal')) q('modal').style.display='none'; }

  /* ------------------ Folder UI ------------------ */
  function renderFolders(){
    const el = q('folderList');
    if(!el) return;
    if(!folders || folders.length===0){
      el.innerHTML = '<div style="padding:8px;color:#aaa">생성된 폴더가 없습니다</div>';
      return;
    }
    el.innerHTML = '';
    folders.forEach(fn=>{
      const div = document.createElement('div');
      div.className = 'flat-item';
      div.textContent = `${fn} (${diaries.filter(d => d.folder === fn).length})`;
      div.addEventListener('click', ()=> showFolderItems(fn));
      el.appendChild(div);
    });
  }
  function showFolderItems(folderName){
    const items = diaries.filter(d => d.folder === folderName).sort((a,b)=> b.createdAt - a.createdAt);
    const wrap = q('diary-flat-list');
    if(!wrap) return;
    wrap.innerHTML = '';
    if(items.length === 0){
      wrap.innerHTML = '<div style="padding:10px;color:#666">폴더에 일기가 없습니다</div>';
      return;
    }
    items.forEach(it=>{
      const row = document.createElement('div');
      row.className='flat-item';
      row.innerHTML = `<div style="min-width:120px;color:#666">${formatDisplayISO(it.date)}</div>
                       <div style="flex:1;font-weight:700">${escapeHTML(it.title||'(제목 없음)')}</div>
                       <div style="opacity:0.8">${escapeHTML(it.folder)}</div>`;
      row.addEventListener('click', ()=> openModalById(it._id));
      wrap.appendChild(row);
    });
  }

  /* ------------------ Event wiring & init ------------------ */
  function wireEvents(){
    // pagination buttons - use existing elements if present
    const prev = document.querySelector('[onclick="prevMonth()"]');
    const next = document.querySelector('[onclick="nextMonth()"]');
    if(prev) prev.addEventListener('click', prevMonth);
    if(next) next.addEventListener('click', nextMonth);

    if(q('saveBtnTop')) q('saveBtnTop').addEventListener('click', saveDiaryFull);
    if(q('clearBtn')) q('clearBtn').addEventListener('click', ()=>{
      if(q('diary-title')) q('diary-title').value='';
      if(q('diaryText')) q('diaryText').value='';
      if(q('diary-img')) q('diary-img').value='';
      const f = q('diary-image-file'); if(f) f.value='';
    });
    if(q('addFolderBtn')) q('addFolderBtn').addEventListener('click', ()=>{
      const name = (q('folderName')?.value || '').trim();
      if(!name){ alert('폴더 이름을 입력하세요'); return; }
      if(!folders.includes(name)) folders.push(name);
      localStorage.setItem(FOLDER_KEY, JSON.stringify(folders));
      q('folderName').value='';
      renderFolders();
    });

    if(q('allToggle')) q('allToggle').addEventListener('click', ()=>{
      q('allToggle').classList.add('active'); q('folderToggle')?.classList.remove('active');
      q('folderList').style.display='none'; q('diary-flat-list').style.display='block';
      loadDiaryList(q('searchInput')?.value || '');
    });
    if(q('folderToggle')) q('folderToggle').addEventListener('click', ()=>{
      q('folderToggle').classList.add('active'); q('allToggle')?.classList.remove('active');
      q('folderList').style.display='block'; q('diary-flat-list').style.display='none';
      renderFolders();
    });

    if(q('searchInput')) q('searchInput').addEventListener('input', (e)=> loadDiaryList(e.target.value));

    if(q('modalClose')) q('modalClose').addEventListener('click', closeModal);
    // modal click outside closes
    const modalEl = q('modal');
    if(modalEl) modalEl.addEventListener('click', (ev)=> { if(ev.target === modalEl) closeModal(); });

    // delegated event for selected-day-list edit/delete/view small buttons
    const selWrap = q('selected-day-list');
    if(selWrap) selWrap.addEventListener('click', (ev)=>{
      const btn = ev.target.closest('button');
      if(!btn) return;
      const id = btn.getAttribute('data-id');
      const action = btn.getAttribute('data-action');
      if(!id || !action) return;
      if(action==='view') openModalById(id);
      if(action==='edit'){ openModalById(id); /* user can click 수정 inside modal, or we could auto-open edit flow */ }
      if(action==='delete'){ openModalById(id); /* modal has delete button */ }
    });
  }

  // initial bootstrap
  function init(){
    migrateIfNeeded();
    // ensure selectedISO = today by default
    const today = new Date();
    selectedISO = today.toISOString().split('T')[0];
    // initialize calendar to current month
    calendarYear = today.getFullYear();
    calendarMonth = today.getMonth();
    // render
    renderCalendar(calendarYear, calendarMonth);
    // highlight today's cell after rendering
    // select today's cell if exists
    qAll('.day-cell').forEach(c => {
      if(c.textContent == today.getDate() && c.classList.contains('today')){
        c.classList.add('selected');
      }
    });
    if(q('diary-date')) q('diary-date').textContent = formatDisplayISO(selectedISO);
    renderSelectedDateList();
    loadDiaryList();
    renderFolders();
    wireEvents();
    // if there's a global #weather element (from index page), copy to fixed
    if(q('weather')) { if(q('weather-fixed')) q('weather-fixed').textContent = q('weather').textContent; }
  }

  // run on DOM ready without clobbering existing onload
  document.addEventListener('DOMContentLoaded', init);

  // expose some helpers globally if necessary
  window.prevMonth = prevMonth;
  window.nextMonth = nextMonth;
  window.saveDiaryFull = saveDiaryFull;
  window.openModalById = openModalById;
  window.toggleView = function(v){ if(v==='all') q('allToggle')?.click(); else q('folderToggle')?.click(); };
})();