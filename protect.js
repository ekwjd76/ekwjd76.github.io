
(function(){
  // 안전 네임스페이스 & 키
  const LOCK_KEY = 'diary_lock_hash_v1';    // 비밀번호 해시 저장 키
  const THEME_KEY = 'diary_theme_v1';       // 테마 저장 키
  const UNLOCKED_FLAG = 'diary_unlocked_v1';// 세션 해제 플래그 (sessionStorage)

  /* ---------- 유틸: SHA-256 해시 (문자열 -> hex) ---------- */
  async function sha256hex(message){
    const enc = new TextEncoder();
    const msgUint8 = enc.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2,'0')).join('');
  }

  /* ---------- DOM 도움 함수 ---------- */
  function $id(id){ return document.getElementById(id); }
  function createEl(tag, attrs={}, children=[]){
    const el = document.createElement(tag);
    for(const k in attrs){
      if(k === 'class') el.className = attrs[k];
      else if(k === 'text') el.textContent = attrs[k];
      else el.setAttribute(k, attrs[k]);
    }
    children.forEach(c => el.appendChild(c));
    return el;
  }

  /* ---------- UI 요소 자동 삽입 (기존 header 유지) ---------- */
  function ensureUI(){
    // header가 있으면 거기에 버튼 추가, 없으면 body 상단에 생성
    let header = document.querySelector('header');
    if(!header){
      header = createEl('header', {style: 'display:flex;justify-content:space-between;align-items:center;padding:10px 16px;background:transparent;'});
      document.body.insertBefore(header, document.body.firstChild);
    }

    // 우측 컨트롤 박스
    let ctrl = document.getElementById('diary-protect-controls');
    if(!ctrl){
      ctrl = createEl('div', {id:'diary-protect-controls', style:'display:flex;gap:8px;align-items:center;'});
      header.appendChild(ctrl);
    }

    // 테마 토글 버튼
    if(!document.getElementById('themeToggleBtn')){
      const btn = createEl('button', {id:'themeToggleBtn', text: '🌓'});
      btn.title = '테마 전환 (다크/라이트)';
      btn.addEventListener('click', toggleTheme);
      ctrl.appendChild(btn);
    }

    // 잠금 버튼 (설정/해제)
    if(!document.getElementById('lockBtn')){
      const btn = createEl('button', {id:'lockBtn', text:'🔒'});
      btn.title = '일기 잠금 설정/해제';
      btn.addEventListener('click', openLockManager);
      ctrl.appendChild(btn);
    }
  }

  /* ---------- 테마 기능 ---------- */
  function applyTheme(theme){
    // theme = 'dark' or 'light'
    if(theme === 'dark') document.documentElement.classList.add('theme-dark');
    else document.documentElement.classList.remove('theme-dark');
    localStorage.setItem(THEME_KEY, theme);
  }
  function toggleTheme(){
    const cur = localStorage.getItem(THEME_KEY) || 'light';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  }
  function initTheme(){
    const saved = localStorage.getItem(THEME_KEY) || 'light';
    applyTheme(saved);
  }

  /* ---------- 잠금(비밀번호) 기능 UI & 로직 ---------- */
  // 모달 생성 (입력/설정/변경/삭제 모두 이 모달로)
  function createLockModal(){
    if(document.getElementById('diary-lock-modal')) return;

    // 배경
    const modal = createEl('div', {id:'diary-lock-modal', style:'position:fixed;inset:0;background:rgba(0,0,0,0.45);display:none;align-items:center;justify-content:center;z-index:9999;'});
    // 박스
    const box = createEl('div', {style:'width:360px;background:var(--card-bg,#fff);padding:18px;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,0.2);'});
    // 제목
    const title = createEl('h3', {text:'일기 접근 잠금'});
    // 상태 라인
    const status = createEl('div', {id:'diary-lock-status', style:'margin-bottom:8px;color:#555;font-size:0.95rem;'});
    // 입력 필드
    const input = createEl('input', {id:'diary-lock-input', type:'password', placeholder:'비밀번호 입력 / 새 비밀번호 입력', style:'width:100%;padding:10px;border-radius:8px;border:1px solid #ccc;margin-bottom:8px;'});
    // confirm 버튼들
    const btnRow = createEl('div', {style:'display:flex;gap:8px;justify-content:flex-end;'});
    const btnCancel = createEl('button', {id:'diary-lock-cancel', text:'취소', style:'padding:8px 12px;'});
    const btnSet = createEl('button', {id:'diary-lock-set', text:'설정', style:'padding:8px 12px;background:#4b6cf7;color:#fff;border:none;border-radius:6px;'});
    const btnUnlock = createEl('button', {id:'diary-lock-unlock', text:'해제', style:'padding:8px 12px;'});
    const btnRemove = createEl('button', {id:'diary-lock-remove', text:'삭제', style:'padding:8px 12px;background:#ff6b6b;color:#fff;border:none;border-radius:6px;'});
    btnRow.appendChild(btnCancel);
    btnRow.appendChild(btnSet);
    btnRow.appendChild(btnUnlock);
    btnRow.appendChild(btnRemove);

    box.appendChild(title);
    box.appendChild(status);
    box.appendChild(input);
    box.appendChild(btnRow);
    modal.appendChild(box);
    document.body.appendChild(modal);

    // 이벤트
    btnCancel.addEventListener('click', ()=> { modal.style.display='none'; });
    btnSet.addEventListener('click', async ()=> {
      const val = input.value.trim();
      if(!val){ alert('비밀번호를 입력하세요'); return; }
      const hash = await sha256hex(val);
      localStorage.setItem(LOCK_KEY, hash);
      sessionStorage.removeItem(UNLOCKED_FLAG); // 새 비밀번호니까 세션 초기화
      alert('비밀번호가 설정되었습니다.');
      modal.style.display='none';
      updateLockUI();
    });
    btnUnlock.addEventListener('click', async ()=> {
      const stored = localStorage.getItem(LOCK_KEY);
      if(!stored){ alert('설정된 비밀번호가 없습니다.'); return; }
      const val = input.value.trim();
      if(!val){ alert('비밀번호를 입력하세요'); return; }
      const hash = await sha256hex(val);
      if(hash === stored){
        sessionStorage.setItem(UNLOCKED_FLAG, '1');
        alert('잠금 해제되었습니다. (이 탭에서만 유효)');
        modal.style.display='none';
        updateLockUI();
      } else {
        alert('비밀번호가 일치하지 않습니다.');
      }
    });
    btnRemove.addEventListener('click', async ()=> {
      const stored = localStorage.getItem(LOCK_KEY);
      if(!stored){ alert('설정된 비밀번호가 없습니다.'); return; }
      const val = input.value.trim();
      if(!val){ alert('현재 비밀번호를 입력해야 삭제할 수 있습니다.'); return; }
      const hash = await sha256hex(val);
      if(hash === stored){
        if(confirm('비밀번호를 삭제하면 잠금이 해제됩니다. 진행할까요?')){
          localStorage.removeItem(LOCK_KEY);
          sessionStorage.removeItem(UNLOCKED_FLAG);
          alert('비밀번호가 삭제되었습니다.');
          modal.style.display='none';
          updateLockUI();
        }
      } else {
        alert('비밀번호가 일치하지 않습니다.');
      }
    });
  }

  function openLockManager(){
    createLockModal();
    const modal = $id('diary-lock-modal');
    const status = $id('diary-lock-status');
    const input = $id('diary-lock-input');
    modal.style.display = 'flex';
    input.value = '';
    const has = !!localStorage.getItem(LOCK_KEY);
    status.textContent = has ? '잠금 상태: 활성화됨' : '잠금 상태: 비활성화';
    // 버튼 표시 조정
    $id('diary-lock-set').style.display = has ? 'none' : 'inline-block';
    $id('diary-lock-unlock').style.display = has ? 'inline-block' : 'none';
    $id('diary-lock-remove').style.display = has ? 'inline-block' : 'none';
  }

  /* ---------- 강제 잠금 검사 (페이지 진입시) ---------- */
  async function checkLockOnLoad(){
    // 만약 잠금이 설정되어 있고 sessionStorage에 풀린 표시가 없다면 락 모달로 가로막음
    const has = !!localStorage.getItem(LOCK_KEY);
    const unlocked = !!sessionStorage.getItem(UNLOCKED_FLAG);
    if(!has) return; // 잠금 설정 없음
    if(unlocked) return; // 이미 풀림

    // create a focused modal that forces password entry
    createLockModal();
    const modal = $id('diary-lock-modal');
    modal.style.display = 'flex';
    // hide some buttons except unlock and cancel (but Cancel should not allow bypass)
    $id('diary-lock-set').style.display = 'none';
    $id('diary-lock-remove').style.display = 'none';
    $id('diary-lock-unlock').style.display = 'inline-block';
    $id('diary-lock-cancel').style.display = 'none'; // can't cancel
    // set status
    $id('diary-lock-status').textContent = '비밀번호를 입력해야 일기 기능에 접근할 수 있습니다.';
    // focus input
    $id('diary-lock-input').focus();
  }

  function updateLockUI(){
    // 표시 관련 (예: lockBtn 아이콘 바꾸기)
    const lockBtn = document.getElementById('lockBtn');
    const has = !!localStorage.getItem(LOCK_KEY);
    const unlocked = !!sessionStorage.getItem(UNLOCKED_FLAG);
    if(lockBtn){
      lockBtn.textContent = has ? (unlocked ? '🔓' : '🔒') : '🔒';
      lockBtn.title = has ? (unlocked ? '잠금 해제됨 (탭 세션 기준)' : '잠금 설정됨') : '잠금 설정 (설정하려면 클릭)';
    }
  }

  /* ---------- 초기화: UI 삽입 + 이벤트 연결 ---------- */
  function initProtectAndTheme(){
    ensureUI();
    initTheme();
    createLockModal();
    updateLockUI();
    // check on load (after DOM ready)
    setTimeout(checkLockOnLoad, 120); // 조금 늦게 실행해서 다른 init과 충돌 줄임
  }

  // run when DOM ready
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initProtectAndTheme);
  } else {
    initProtectAndTheme();
  }

  // expose some helpers for debugging (optional)
  window.__diary_protect = {
    sha256hex, applyTheme, toggleTheme,
    openLockManager, checkLockOnLoad
  };

})();