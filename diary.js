
function saveDiary() {
  const inputEl = document.getElementById("diary-input");
  const input = inputEl ? inputEl.value : "";
  if (input.trim() === "") return;
  const diaries = JSON.parse(localStorage.getItem("diaries") || "[]");
  if (diaries.length === 0 || (diaries[0].text !== undefined && diaries[0].title === undefined)) {
      diaries.push({ date: new Date().toISOString().split('T')[0], text: input });
  } else {
      console.warn("Attempted to use legacy saveDiary() on extended data. Using saveDiaryFull() is recommended.");
      return; 
  }
  localStorage.setItem("diaries", JSON.stringify(diaries));
  if(inputEl) inputEl.value = "";
  loadDiaries();
}


function clearDiary() {
  const inputEl = document.getElementById("diary-input");
  if (inputEl) inputEl.value = "";
}

function loadDiaries() {
  const diaries = JSON.parse(localStorage.getItem("diaries") || "[]");
  const container = document.getElementById("diary-list");
  if (container) {
    if (diaries.length === 0 || (diaries[0].text !== undefined && diaries[0].title === undefined)) {
      container.innerHTML = diaries
        .map(d => `<p><b>${d.date}</b>: ${d.text}</p>`)
        .join("");
    } else {
      container.innerHTML = '<p>확장된 일기 목록은 다른 영역에 표시됩니다.</p>';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('saveBtnTop')
    ?.addEventListener('click', saveDiary);  

  document.getElementById('clearBtn')
    ?.addEventListener('click', clearDiary);
});




/* state */
let diaries = []; // init()에서 로컬 스토리지 데이터로 채워짐
let folders = JSON.parse(localStorage.getItem('folders') || '[]'); 
let calendarYear, calendarMonth;
// 🛑 today 변수는 init() 내에서 한 번만 정의됩니다. (SyntaxError 해결)
let today = new Date(); // 초기 값만 설정 (init에서 다시 초기화됨)

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
  if (!cal) return; 
  
  const monthLabel = document.getElementById('monthLabel');
  if(monthLabel) monthLabel.textContent = `${y}년 ${m+1}월`;
  cal.innerHTML = ''; // 이전 날짜 셀 전체 삭제

  // 🛑 #calendar에 직접 Grid 스타일 적용 (CSS 문제 해결)
  cal.style.display='grid';
  cal.style.gridTemplateColumns='repeat(7,1fr)';
  cal.style.gap='6px';

  // empty leading (빈 칸)
  for(let i=0;i<firstDay;i++){
    const empty = document.createElement('div');
    empty.className='day-cell empty';
    cal.appendChild(empty);
  }

  // day cells (날짜 셀)
  for(let d=1; d<=lastDate; d++){
    const dateObj = new Date(y,m,d);
    const iso = formatISO(dateObj);
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    cell.textContent = String(d); 
    
    // mark if entries exist
    const count = diaries.filter(it => it.date === iso).length;
    if(count>0) cell.classList.add('has-entry');
    if(iso === formatISO(new Date())) cell.classList.add('today');
    
    cell.addEventListener('click', ()=> onDayClick(iso, cell));
    cal.appendChild(cell);
  }
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
  if (!wrap) return; 
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
  if (!wrap) return; 
  
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

  if (!modal() || !document.getElementById('modalDate')) return;

  document.getElementById('modalDate').textContent = formatDisplayISO(data.date);
  document.getElementById('modalWeather').textContent = data.weather || '';
  const imgEl = document.getElementById('modalImage');
  if(imgEl){
    if(data.image){
      imgEl.style.display='block';
      imgEl.src = data.image;
    } else {
      imgEl.style.display='none';
      imgEl.src = '';
    }
  }
  document.getElementById('modalTitle').textContent = data.title || '(제목 없음)';
  document.getElementById('modalContent').textContent = data.content || '(내용 없음)';
  document.getElementById('modalFolder').textContent = `폴더: ${data.folder||'기본'}`;

  // attach actions
  const deleteBtn = document.getElementById('modalDeleteBtn');
  if(deleteBtn) deleteBtn.onclick = ()=>{
    if(!confirm('삭제하시겠습니까?')) return;
    diaries = diaries.filter(x => x._id !== id);
    saveState();
    renderSelectedDateList();
    loadDiaryList(searchInputEl()?.value);
    renderCalendar(calendarYear, calendarMonth);
    closeModal();
  };
  const editBtn = document.getElementById('modalEditBtn');
  if(editBtn) editBtn.onclick = ()=>{
    diaryTitleEl().value = data.title || '';
    diaryTextEl().value = data.content || '';
    diaryImgInput().value = data.image || '';
    selectedISO = data.date;
    highlightCalendarDate(data.date);
    diaryDateEl().textContent = `${formatDisplayISO(data.date)} (${new Date(data.date).toLocaleDateString('ko-KR',{weekday:'short'})})`;
    const folderInput = document.getElementById('folderName');
    if(folderInput) folderInput.value = data.folder || '';
    
    diaries = diaries.filter(x => x._id !== id);
    saveState();
    loadDiaryList(searchInputEl()?.value);
    renderSelectedDateList();
    renderCalendar(calendarYear, calendarMonth);
    closeModal();
  };

  modal().style.display = 'flex';
}

/* modal close */
function closeModal(){ 
  const m = modal();
  if(m) m.style.display = 'none'; 
}

/* helper: highlight calendar date */
function highlightCalendarDate(iso){
  const cells = qAll('.day-cell');
  if (cells.length === 0) return;
  
  cells.forEach(c=>{
    if(c.classList.contains('selected')) c.classList.remove('selected');
  });
  cells.forEach(c=>{
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
  if(!selectedISO){
    alert('달력에서 날짜를 선택하세요. 날짜는 필수입니다.');
    return;
  }
  const title = diaryTitleEl()?.value.trim() || '';
  const content = diaryTextEl()?.value.trim() || '';
  
  if(!diaryTitleEl() || !diaryTextEl() || !diaryImgInput()){
     alert('일기 입력 필드가 존재하지 않습니다.');
     return;
  }
  
  const fileInput = diaryImageFile();
  let imageData = '';
  if(fileInput && fileInput.files && fileInput.files[0]){
    try{
      imageData = await readFileAsDataURL(fileInput.files[0]);
    }catch(e){ console.warn('file read err', e); imageData = ''; }
  } else {
    imageData = diaryImgInput().value.trim();
  }
  const folderName = (document.getElementById('folderName')?.value || '').trim() || '기본';
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

  // 폼 초기화
  if(diaryTitleEl()) diaryTitleEl().value = '';
  if(diaryTextEl()) diaryTextEl().value = '';
  if(diaryImgInput()) diaryImgInput().value = '';
  if(diaryImageFile()) diaryImageFile().value = '';
  const folderInput = document.getElementById('folderName');
  if(folderInput) folderInput.value = '';

  if(folderName && folderName !== '기본' && !folders.includes(folderName)){
    folders.push(folderName);
    saveState();
  }

  renderSelectedDateList();
  loadDiaryList(searchInputEl()?.value); 
  renderCalendar(calendarYear, calendarMonth);
  alert('저장되었습니다.');
}

/* prev/next month */
document.getElementById('prevMonth')?.addEventListener('click', ()=>{
  calendarMonth--;
  if(calendarMonth < 0){ calendarMonth = 11; calendarYear--; }
  renderCalendar(calendarYear, calendarMonth);
});
document.getElementById('nextMonth')?.addEventListener('click', ()=>{
  calendarMonth++;
  if(calendarMonth > 11){ calendarMonth = 0; calendarYear++; }
  renderCalendar(calendarYear, calendarMonth);
});

/* folder creation & view toggle */
document.getElementById('addFolderBtn')?.addEventListener('click', ()=>{
  const folderInput = document.getElementById('folderName');
  const name = (folderInput?.value || '').trim();
  if(!name){ alert('폴더 이름을 입력하세요'); return; }
  if(!folders.includes(name)) folders.push(name);
  saveState();
  renderFolders();
  if(folderInput) folderInput.value = '';
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
  const wrap = diaryFlatList();
  if (!wrap) return; 
  
  wrap.innerHTML = '';
  if(items.length===0){
    wrap.innerHTML = '<div style="padding:10px;color:#666">폴더에 일기가 없습니다</div>';
    return;
  }
  items.forEach(it=>{
    const row = document.createElement('div');
    row.className='flat-item';
    row.innerHTML = `<div style="min-width:120px;color:#666">${formatDisplayISO(it.date)}</div><div style="font-weight:700">${escapeHTML(it.title)}</div><div style="opacity:0.8">${escapeHTML(it.folder)}</div>`;
    row.addEventListener('click', ()=> openModalById(it._id));
    wrap.appendChild(row);
  });
}

/* toggle buttons */
document.getElementById('allToggle')?.addEventListener('click', ()=>{
  const allToggle = document.getElementById('allToggle');
  const folderToggle = document.getElementById('folderToggle');
  const folderList = document.getElementById('folderList');
  const diaryFlatList = document.getElementById('diary-flat-list');
  
  if (allToggle) allToggle.classList.add('active');
  if (folderToggle) folderToggle.classList.remove('active');
  if (folderList) folderList.style.display = 'none';
  if (diaryFlatList) diaryFlatList.style.display = 'block';
  loadDiaryList(searchInputEl()?.value);
});
document.getElementById('folderToggle')?.addEventListener('click', ()=>{
  const allToggle = document.getElementById('allToggle');
  const folderToggle = document.getElementById('folderToggle');
  const folderList = document.getElementById('folderList');
  const diaryFlatList = document.getElementById('diary-flat-list');

  if (folderToggle) folderToggle.classList.add('active');
  if (allToggle) allToggle.classList.remove('active');
  if (folderList) folderList.style.display = 'block';
  if (diaryFlatList) diaryFlatList.style.display = 'none';
  renderFolders();
});

/* search */
searchInputEl()?.addEventListener('input', (e)=> loadDiaryList(e.target.value) );

/* small helpers */
function qAll(sel){ return Array.from(document.querySelectorAll(sel)); }

/* modal close */
modalClose()?.addEventListener('click', closeModal);
modal()?.addEventListener('click', (ev)=>{ 
  const m = modal();
  if(m && ev.target === m) closeModal(); 
});

function init(){
   const dEl = diaryDateEl();
  const raw = JSON.parse(localStorage.getItem('diaries') || '[]');
  
  if(raw.length && raw[0].text !== undefined && raw[0].date !== undefined && raw[0].title === undefined){
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
    diaries = raw;
  }

  folders = JSON.parse(localStorage.getItem('folders') || '[]');

  calendarYear = today.getFullYear();
  calendarMonth = today.getMonth();
  renderCalendar(calendarYear, calendarMonth);

  selectedISO = formatISO(today);
  
  if(dEl) dEl.textContent = `${formatDisplayISO(selectedISO)} (${today.toLocaleDateString('ko-KR',{weekday:'short'})})`;
  
  if (document.getElementById('calendar')) {
    highlightCalendarDate(selectedISO);
  }
  
  renderSelectedDateList();

  loadDiaryList();
  renderFolders();

  document.getElementById('saveBtnTop')?.addEventListener('click', saveDiaryFull);
  
  document.getElementById('clearBtn')?.addEventListener('click', ()=>{
    if(diaryTitleEl()) diaryTitleEl().value = '';
    if(diaryTextEl()) diaryTextEl().value = '';
    if(diaryImgInput()) diaryImgInput().value = '';
    if(diaryImageFile()) diaryImageFile().value = '';
    const folderInput = document.getElementById('folderName');
    if(folderInput) folderInput.value = '';
  });
}

/* init on load (replace previous onload definitions safely) */
window.addEventListener('DOMContentLoaded', () => {
  try{ loadReviews(); }catch(e){/*ignore*/ }
  const diaryList = document.getElementById('diary-list');
  if (diaryList) {
    try{ loadDiaries(); }catch(e){/*ignore*/ }
  }

  init();

  const w = document.getElementById('weather')?.textContent;
  const wf = document.getElementById('weather-fixed');
  if(w && wf) wf.textContent = w;
});

/* expose some functions globally used by inline handlers */
window.prevMonth = ()=> { calendarMonth--; if(calendarMonth<0){calendarMonth=11;calendarYear--;} renderCalendar(calendarYear,calendarMonth); };
window.nextMonth = ()=> { calendarMonth++; if(calendarMonth>11){calendarMonth=0;calendarYear++;} renderCalendar(calendarYear,calendarMonth); };
window.saveDiaryFull = saveDiaryFull;
window.createFolder = ()=> document.getElementById('addFolderBtn')?.click();
window.toggleView = (v)=> { if(v==='all') document.getElementById('allToggle')?.click(); else document.getElementById('folderToggle')?.click(); };
window.openModalById = openModalById;