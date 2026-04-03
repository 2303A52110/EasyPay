// ── UTILS ──────────────────────────────────────
const $ = id => document.getElementById(id);
const uid = () => Math.random().toString(36).slice(2,9).toUpperCase();
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const fmt = n => typeof n==='number' ? n.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}) : '0.00';
const fmtDate = ts => {
  const d = new Date(ts);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
};
const fmtTime = ts => new Date(ts).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
const fmtDShort = ts => {
  const d = new Date(ts), n = new Date();
  if(d.toDateString()===n.toDateString()) return 'Today';
  const y = new Date(n-86400000);
  if(d.toDateString()===y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
};
const escHtml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

// ── LOCAL STORAGE ──────────────────────────────
const LS = {
  getUsers:    ()  => JSON.parse(localStorage.getItem('vp_users')||'[]'),
  saveUsers:   u   => localStorage.setItem('vp_users', JSON.stringify(u)),
  getSession:  ()  => JSON.parse(localStorage.getItem('vp_session')||'null'),
  saveSession: u   => localStorage.setItem('vp_session', JSON.stringify(u)),
  clearSession:()  => localStorage.removeItem('vp_session'),
  getTxns:  (uid)  => JSON.parse(localStorage.getItem('vp_txns_'+uid)||'[]'),
  saveTxns: (uid,t)=> localStorage.setItem('vp_txns_'+uid, JSON.stringify(t.slice(0,300))),
  addTxn:   (uid,t)=> {
    const list = JSON.parse(localStorage.getItem('vp_txns_'+uid)||'[]');
    if(!list.find(x=>x.tid===t.tid && x.type===t.type)) {
      list.unshift(t);
      localStorage.setItem('vp_txns_'+uid, JSON.stringify(list.slice(0,300)));
    }
  }
};

// ── STATE ──────────────────────────────────────
const S = {
  user:null, balance:15000, txns:[], contacts:[],
  balHidden:false, chatContact:null, pendingPay:null,
  rcOp:'Airtel', dthOp:'Tata Play', dataOp:'Airtel',
  selectedPack:null, currentBill:null, currentService:null
};

// ── DEMO CONTACTS ──────────────────────────────
const DEMO_CONTACTS = [
  {id:'c1',name:'mummy',       phone:'88971722',upi:'88971722@ybl',  av:'M',col:'#ec4899',rel:'Family',     bank:'SBI',  acc:'XXXX2341'},
  {id:'c2',name:'dad',       phone:'90103568',upi:'90103568@ybl',  av:'D',col:'#0ea5e9',rel:'Family',     bank:'HDFC', acc:'XXXX5678'},
  {id:'c3',name:'bro',       phone:'99511620',upi:'raskshith99511@okicici', av:'A',col:'#f59e0b',rel:'Family',bank:'ICICI',acc:'XXXX1234'},
  {id:'c4',name:'goutham Reddy',phone:'88859016',upi:'88859016@ibl', av:'B',col:'#10b981',rel:'Friend',     bank:'Axis', acc:'XXXX9012'},
  {id:'c5',name:'vishwa',phone:'83280068',upi:'vishwa@okhdfcbank',av:'S',col:'#6366f1',rel:'College',bank:'HDFC', acc:'XXXX3456'},
  {id:'c6',name:'Autowala',phone:'98776612',upi:'98776612@axl',av:'R',col:'#f97316',rel:'Autowala', bank:'Kotak',acc:'XXXX7890'},
  {id:'c7',name:'General Store',phone:'8866554433',upi:'generalstore@okaxis',  av:'🏪',col:'#14b8a6',rel:'Shop',   bank:'Axis', acc:'XXXX4321'},
  {id:'c8',name:'Avinash',phone:'6655443322',upi:'6655443322@axl', av:'R',col:'#8b5cf6',rel:'Roommate', bank:'PNB',  acc:'XXXX6543'},
  {id:'c9',name:'sir',phone:'8800112233',upi:'sir@okupi', av:'K',col:'#ef4444',rel:'Teacher',  bank:'Canara',acc:'XXXX8765'},
  {id:'c10',name:'Funds',phone:'9900998877',upi:'funds@ybl', av:'🎆',col:'#f59e0b',rel:'Group',  bank:'BOB',  acc:'XXXX2109'},
];

// ── SEED TRANSACTIONS ──────────────────────────
function seedTxns() {
  if(!S.user) return;
  const saved = LS.getTxns(S.user.id);
  if(saved.length) { S.txns = saved; return; }
  const now = Date.now();
  const seeds = [
    {type:'credit',name:'mummy',          upi:'88971722@ybl',       amt:2000, note:'Monthly allowance',       date:now-3600000},
    {type:'debit', name:'bro',   upi:'rakshith99511@okicici',       amt:350,  note:'Movie tickets',           date:now-7200000},
    {type:'debit', name:'General Store',  upi:'generalstore@okaxis',       amt:480,  note:'Groceries',               date:now-86400000},
    {type:'credit',name:'goutham Reddy',  upi:'88859016@ibl',       amt:500,  note:'Lunch repay',             date:now-172800000},
    {type:'debit', name:'Autowala',upi:'98776612@axl',       amt:120,  note:'Auto fare',               date:now-259200000},
    {type:'debit', name:'Airtel Recharge',upi:'recharge@easypay',    amt:299,  note:'Airtel 28-day plan',      date:now-345600000},
    {type:'credit',name:'vishwa',  upi:'vishwa@okhdfcbank',   amt:1500, note:'Project contribution',    date:now-432000000},
    {type:'debit', name:'Electricity Bill',upi:'bills@easypay',      amt:860,  note:'TSGENCO — March 2026',    date:now-518400000},
  ];
  S.txns = seeds.map(s=>({...s, id:'t'+uid(), tid:'VP'+uid()}));
  LS.saveTxns(S.user.id, S.txns);
}

// ── BALANCE ────────────────────────────────────
function updateUserBalance() {
  if(!S.user) return;
  S.user.balance = S.balance;
  const users = LS.getUsers();
  const idx = users.findIndex(u=>u.id===S.user.id);
  if(idx>=0){ users[idx].balance=S.balance; LS.saveUsers(users); }
  LS.saveSession(S.user);
}

// ── TOAST ──────────────────────────────────────
function toast(msg, type='info') {
  const el = document.createElement('div');
  el.className = 'toast '+(type||'info');
  el.textContent = msg;
  $('toast-container').appendChild(el);
  setTimeout(()=>{ el.classList.add('out'); setTimeout(()=>el.remove(),300); }, 3000);
}

// ── SMS POPUP ──────────────────────────────────
function showSMSPopup(type, amt, name, refno, note) {
  const pop = $('sms-popup');
  const d = new Date();
  $('sms-time').textContent = d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  let msg;
  if(type==='debit') {
    $('sms-title').textContent = '🔴 Debit Alert — EasyPay';
    msg = `A/C ${S.user?.bank||'Bank'}...${(S.user?.acc||'XXXX').slice(-4)} Debited INR ${fmt(amt)} on ${fmtDate(d)} Trf to ${name}. Ref: ${refno}.`;
  } else {
    $('sms-title').textContent = '🟢 Credit Alert — EasyPay';
    msg = `A/C ${S.user?.bank||'Bank'}...${(S.user?.acc||'XXXX').slice(-4)} Credited INR ${fmt(amt)} on ${fmtDate(d)} from ${name}. Ref: ${refno}. Bal: ₹${fmt(S.balance)}.`;
  }
  $('sms-text').textContent = msg;
  pop.classList.remove('out');
  pop.classList.add('show');
  setTimeout(()=>{ pop.classList.remove('show'); pop.classList.add('out'); }, 5000);
}

// ── TRANSACTION SUCCESS POPUP ──────────────────
function showTxnPopup(type, amt, contactName, refno, note, ts) {
  const isCredit = type === 'credit';
  const hdr = $('txn-pop-header');
  hdr.style.background = isCredit
    ? 'linear-gradient(135deg,#16a34a,#166534)'
    : 'linear-gradient(135deg,#5f259f,#3d1269)';
  $('txn-pop-icon').textContent   = isCredit ? '' : '✅';
  $('txn-pop-status').textContent = isCredit ? 'Money Received!' : 'Payment Successful!';
  $('txn-pop-amount').textContent = (isCredit?'+':'-')+'₹'+fmt(amt);
  $('txn-pop-to').textContent     = isCredit ? 'Received from '+contactName : 'Paid to '+contactName;

  const d = ts ? new Date(ts) : new Date();
  $('txn-pop-body').innerHTML = `
    <div class="txn-popup-row"><span class="pl">${isCredit?'From':'To'}</span><span class="pv">${escHtml(contactName)}</span></div>
    <div class="txn-popup-row"><span class="pl">Amount</span><span class="pv ${isCredit?'ok':'err'}">${isCredit?'+':'-'}₹${fmt(amt)}</span></div>
    <div class="txn-popup-row"><span class="pl">Note</span><span class="pv">${escHtml(note||'—')}</span></div>
    <div class="txn-popup-row"><span class="pl">Date & Time</span><span class="pv">${fmtDate(d)} ${fmtTime(d)}</span></div>
    <div class="txn-popup-row"><span class="pl">Ref No.</span><span class="pv">${refno||'—'}</span></div>
    <div class="txn-popup-row"><span class="pl">New Balance</span><span class="pv ok">₹${fmt(S.balance)}</span></div>
  `;
  // Re-trigger bounce animation
  const icon = $('txn-pop-icon');
  icon.style.animation = 'none';
  void icon.offsetWidth;
  icon.style.animation = '';

  $('txn-popup-overlay').classList.add('on');
  document.body.style.overflow = 'hidden';
}

function closeTxnPopup() {
  $('txn-popup-overlay').classList.remove('on');
  document.body.style.overflow = '';
  // Run any pending onSuccess callback
  if(S.pendingPay?.onSuccess) { S.pendingPay.onSuccess(); }
  S.pendingPay = null;
}

// ── AUTH ───────────────────────────────────────
function swPnl(id) {
  document.querySelectorAll('.pnl').forEach(p=>p.classList.remove('on'));
  $(id)?.classList.add('on');
}

function doRegister() {
  const fname=$('r-fname').value.trim(), lname=$('r-lname').value.trim();
  const phone=$('r-phone').value.trim(), dob=$('r-dob').value;
  const city=$('r-city').value.trim(), email=$('r-email').value.trim();
  const bank=$('r-bank').value;
  const mpin=getOTPVal('mpin-row'), mconf=getOTPVal('mconf-row');
  if(!fname||!phone||!dob||!bank){ toast('Fill all required fields','err'); return; }
  if(phone.length<10){ toast('Enter valid 10-digit number','err'); return; }
  if(mpin.length<6){ toast('Set 6-digit MPIN','err'); return; }
  if(mpin!==mconf){ toast('MPINs do not match','err'); return; }
  const users = LS.getUsers();
  if(users.find(u=>u.phone===phone)){ toast('Account exists. Login instead.','warn'); swPnl('pnl-login'); return; }
  const upiId = phone+'@ybl';
  const accNo = 'XXXX'+Math.floor(1000+Math.random()*9000);
  const user = {
    id:'u'+uid(), name:fname+(lname?' '+lname:''), phone, dob, city, email, bank,
    upi:upiId, acc:accNo, mpin, fpRegistered:false, balance:15000, createdAt:Date.now()
  };
  users.push(user); LS.saveUsers(users); LS.saveSession(user);
  S.user=user; S.balance=15000; S.contacts=[...DEMO_CONTACTS]; S.txns=[];
  seedTxns(); launchApp();
  toast('Account created! Welcome '+fname+' 🎉','ok');
  setTimeout(()=>showSMSPopup('credit',15000,'EasyPay','VP'+uid(),'Welcome bonus'),1500);
}

function doLogin() {
  const phone=$('l-phone').value.trim();
  const mpin=getOTPVal('mpin-row-login');
  if(!phone){ toast('Enter mobile number','err'); return; }
  const users=LS.getUsers();
  const u=users.find(x=>x.phone===phone);
  if(!u){ toast('Account not found. Please register.','err'); return; }
  if(!mpin){ toast('Enter your 6-digit MPIN','err'); return; }
  if(mpin!==u.mpin){ toast('Wrong MPIN. Try again.','err'); clearOTP('mpin-row-login'); return; }
  LS.saveSession(u);
  S.user=u; S.balance=u.balance||15000; S.contacts=[...DEMO_CONTACTS]; S.txns=[];
  seedTxns(); launchApp();
  toast('Welcome back '+u.name.split(' ')[0]+' 👋','ok');
}

function doLogout() {
  LS.clearSession();
  S.user=null; S.txns=[]; S.contacts=[]; S.balance=15000;
  $('app').classList.add('h');
  $('auth').classList.add('on');
  swPnl('pnl-login');
  clearOTP('mpin-row-login');
  toast('Logged out successfully','info');
}

// ── FINGERPRINT ────────────────────────────────
async function triggerBiometric() {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      // Check WebAuthn support
      if(!window.PublicKeyCredential) { resolve(true); return; } // Simulate if unsupported
      try {
        const avail = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if(!avail) { resolve(true); return; } // No sensor — simulate for demo
        // Try actual biometric challenge
        const cred = await navigator.credentials.get({
          publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            timeout: 30000,
            userVerification: 'required',
            rpId: window.location.hostname || 'localhost'
          }
        });
        if(cred) resolve(true); else reject(new Error('No credential'));
      } catch(e) {
        // If WebAuthn errors (e.g., no registered credential), treat as success for demo
        if(e.name==='NotAllowedError') reject(e);
        else resolve(true);
      }
    }, 1200);
  });
}

async function fpLogin() {
  const phone = $('l-phone').value.trim();
  const users = LS.getUsers();
  const u = users.find(x=>x.phone===phone);
  if(!u){ toast('Enter your mobile number first','err'); return; }
  if(!u.fpRegistered){ toast('Fingerprint not setup. Use MPIN to login first, then enable it in Settings.','warn'); return; }
  const ring = $('fp-ring-login');
  const arc  = $('arc-login');
  ring.className = 'fp-ring scanning';
  if(arc) arc.style.strokeDashoffset = '0';
  try {
    await triggerBiometric();
    ring.className = 'fp-ring ok';
    LS.saveSession(u);
    S.user=u; S.balance=u.balance||15000; S.contacts=[...DEMO_CONTACTS]; S.txns=[];
    seedTxns();
    toast('Fingerprint matched ✓','ok');
    setTimeout(()=>launchApp(), 600);
  } catch(e) {
    ring.className = 'fp-ring fail';
    toast('Fingerprint not recognized. Use MPIN.','err');
    setTimeout(()=>{ ring.className='fp-ring'; if(arc) arc.style.strokeDashoffset='100'; }, 1500);
  }
}

async function fpPayConfirm() {
  if(!S.user?.fpRegistered){ toast('Fingerprint not setup. Go to Settings → Security.','warn'); return; }
  const ring = $('fp-ring-pay');
  ring.className = 'fp-ring scanning';
  try {
    await triggerBiometric();
    ring.className = 'fp-ring ok';
    setTimeout(()=>{ ring.className='fp-ring'; doFinalPay(true); }, 400);
  } catch(e) {
    ring.className = 'fp-ring fail';
    toast('Fingerprint failed. Enter MPIN.','err');
    setTimeout(()=>ring.className='fp-ring', 1500);
  }
}

async function setupFingerprint() {
  if(!S.user) return;
  if(!window.PublicKeyCredential) {
    toast('⚠️ Biometric not supported on this browser','err');
    return;
  }
  const btn = $('fp-setup-btn');
  if(btn){ btn.disabled=true; btn.textContent='Scanning...'; }
  toast('👆 Touch your fingerprint sensor...','info');
  try {
    const avail = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if(!avail) {
      toast('⚠️ No fingerprint sensor found on this device','err');
      if(btn){ btn.disabled=false; btn.textContent='Setup'; }
      return;
    }
    await triggerBiometric();
    const users=LS.getUsers();
    const idx=users.findIndex(u=>u.id===S.user.id);
    if(idx>=0){ users[idx].fpRegistered=true; LS.saveUsers(users); }
    S.user.fpRegistered=true; LS.saveSession(S.user);
    populateSettings();
    toast('✅ Fingerprint enabled! You can now use it to login & pay.','ok');
  } catch(e){
    toast('❌ Fingerprint setup failed. Try again.','err');
    if(btn){ btn.disabled=false; btn.textContent='Retry'; }
  }
}

// ── APP LAUNCH ─────────────────────────────────
function launchApp() {
  $('auth').classList.remove('on');
  $('app').classList.remove('h');
  S.contacts = [...DEMO_CONTACTS];
  if(!S.txns.length) seedTxns();
  buildNav(); initNumpad(); updateUI(); showPage('home');
  const h = new Date().getHours();
  $('hgreet').textContent = (h<12?'Good morning! ☀️':h<17?'Good afternoon! 🌤️':'Good evening! 🌙')+' 👋';
}

function updateUI() {
  if(!S.user) return;
  const first = S.user.name.split(' ')[0];
  $('hname').textContent    = first;
  $('hupi').textContent     = 'UPI: '+S.user.upi;
  $('topbar-bal').textContent = S.balHidden ? '₹ ••••' : '₹'+fmt(S.balance);
  if(S.balHidden){ $('hbal').textContent=''; $('hbal').classList.add('hidden'); }
  else{ $('hbal').textContent='₹'+fmt(S.balance); $('hbal').classList.remove('hidden'); }
  $('sb-uname').textContent = S.user.name;
  $('sb-uupi').textContent  = S.user.upi;
  renderHomeTxns();
}

function toggleBalVis(){ S.balHidden=!S.balHidden; updateUI(); }

// ── NAV ────────────────────────────────────────
const NAV = [
  {id:'home',     label:'Dashboard',  ic:'🏠'},
  {id:'send',     label:'Send Money', ic:'📤'},
  {id:'scanner',  label:'Scan & Pay', ic:'📷'},
  {id:'history',  label:'History',    ic:'📋'},
  {id:'chat',     label:'Chat Pay',   ic:'💬'},
  {id:'balance',  label:'Balance',    ic:'💳'},
  {id:'recharge', label:'Recharge',   ic:'📱'},
  {id:'bills',    label:'Pay Bills',  ic:'⚡'},
  {id:'services', label:'Services',   ic:'🛡️'},
  {id:'ai',       label:'EasyAI 🪄',ic:'🪄'},
  {id:'settings', label:'Settings',   ic:'⚙️'},
];

function buildNav() {
  $('sb-nav').innerHTML = NAV.map(n=>`
    <div class="ni${n.id==='home'?' on':''}" data-pg="${n.id}" onclick="showPage('${n.id}')">
      <span>${n.ic}</span> ${n.label}
    </div>`).join('');
}

function showPage(id) {
  document.querySelectorAll('.pg').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('on'));
  $('pg-'+id)?.classList.add('on');
  document.querySelector(`.ni[data-pg="${id}"]`)?.classList.add('on');
  const pg = NAV.find(n=>n.id===id);
  $('topbar-title').textContent = pg ? pg.ic+' '+pg.label : 'EasyPay';
  if(id==='home')     updateUI();
  if(id==='send')     { renderSendList(); }
  if(id==='history')  renderHistory('all');
  if(id==='chat')     renderChatList();
  if(id==='balance')  renderBalPage();
  if(id==='recharge') initRecharge();
  if(id==='settings') populateSettings();
  closeSidebar();
}

function toggleSidebar(){ $('sb').classList.toggle('open'); $('mob-overlay').style.display=$('sb').classList.contains('open')?'block':'none'; }
function closeSidebar(){  $('sb').classList.remove('open'); $('mob-overlay').style.display='none'; }

// ── OTP INPUT ──────────────────────────────────
function buildOTP(id, count=6, pw=false) {
  const c=$(id); if(!c) return; c.innerHTML='';
  for(let i=0;i<count;i++){
    const inp=document.createElement('input');
    inp.className='ob'; inp.maxLength=1; inp.type=pw?'password':'text';
    inp.inputMode='numeric'; inp.pattern='[0-9]*';
    inp.addEventListener('input',e=>{
      const v=e.target.value.replace(/\D/g,'');
      e.target.value=v;
      if(v&&i<count-1) c.children[i+1].focus();
    });
    inp.addEventListener('keydown',e=>{
      if(e.key==='Backspace'&&!e.target.value&&i>0) c.children[i-1].focus();
    });
    c.appendChild(inp);
  }
}
function getOTPVal(id){ return Array.from($(id)?.children||[]).map(b=>b.value).join(''); }
function clearOTP(id){ if($(id)) Array.from($(id).children).forEach(b=>b.value=''); }

// ── NUMPAD (PIN ENTRY) — FIXED ──────────────────
let pinEntered = '';

function initNumpad() {
  const pad = $('numpad'); if(!pad) return;
  pad.addEventListener('click', e=>{
    const btn = e.target.closest('.npk'); if(!btn) return;
    const v = btn.dataset.v;
    if(v==='del') {
      pinEntered = pinEntered.slice(0,-1);
    } else if(v==='ok') {
      doFinalPay(false);
      return;
    } else {
      if(pinEntered.length < 6) pinEntered += v;
    }
    updatePinDots();
    // Auto-submit when 6 digits entered
    if(pinEntered.length===6) setTimeout(()=>doFinalPay(false), 180);
  });
}

function updatePinDots() {
  for(let i=0;i<6;i++){
    const dot = $('pd'+i);
    if(!dot) return;
    dot.classList.toggle('filled', i < pinEntered.length);
    dot.classList.remove('error');
  }
}

function shakePinDots() {
  const row = $('pin-dots-row');
  if(!row) return;
  // Set all dots to error color
  for(let i=0;i<6;i++){ const d=$('pd'+i); if(d){ d.classList.remove('filled'); d.classList.add('error'); } }
  row.classList.add('shake');
  setTimeout(()=>{ row.classList.remove('shake'); for(let i=0;i<6;i++){ const d=$('pd'+i); if(d) d.classList.remove('error'); } }, 400);
}

function resetPinEntry() {
  pinEntered = '';
  updatePinDots();
}

// ── PAYMENT FLOW ──────────────────────────────
function openPayModal(cid) {
  // Look in contacts + registered users
  let c = S.contacts.find(x=>x.id===cid);
  if(!c){
    const u = LS.getUsers().find(x=>x.id===cid);
    if(u) c={id:u.id,name:u.name,phone:u.phone,upi:u.upi,av:u.name.charAt(0),col:'#7c3aed',rel:'User'};
  }
  if(!c) return;
  S.pendingPay = {contact:c, amt:0, note:''};
  $('pm-av').textContent=c.av; $('pm-av').style.background=c.col+'20'; $('pm-av').style.color=c.col;
  $('pm-name').textContent=c.name;
  $('pm-upi').textContent=c.upi;
  $('pm-phone').textContent='📱 '+(c.phone||'');
  $('pay-amt').value=''; $('pay-amt-disp').textContent='₹0'; $('pay-note').value='';
  openMod('mod-pay');
}

function setPayAmt(n){ $('pay-amt').value=n; $('pay-amt-disp').textContent='₹'+n; }

function confirmPayModal() {
  const amt = parseFloat($('pay-amt').value);
  const note = $('pay-note').value.trim();
  if(!amt||amt<=0){ toast('Enter valid amount','err'); return; }
  if(amt>S.balance){ toast('Insufficient balance','err'); return; }
  S.pendingPay.amt=amt; S.pendingPay.note=note;
  closeMod('mod-pay');
  openPayFlow(S.pendingPay.contact, amt, note||'Payment');
}

function openPayFlow(contact, amt, note) {
  if(!S.pendingPay) S.pendingPay = {};
  S.pendingPay.contact = contact;
  S.pendingPay.amt     = amt;
  S.pendingPay.note    = note;
  $('mpin-to-name').textContent  = contact.name+' ('+contact.upi+')';
  $('mpin-amt-disp').textContent = '₹'+fmt(amt);
  resetPinEntry();
  $('fp-ring-pay').className = 'fp-ring';
  openMod('mod-mpin');
}

function doFinalPay(byFingerprint=false) {
  if(!S.pendingPay) return;
  const {contact, amt, note} = S.pendingPay;

  // Validate MPIN unless using fingerprint
  if(!byFingerprint) {
    if(pinEntered.length < 6){
      toast('Enter complete 6-digit MPIN','warn');
      return;
    }
    if(pinEntered !== S.user.mpin){
      shakePinDots();
      toast('Wrong MPIN. Try again.','err');
      resetPinEntry();
      return;
    }
  }

  // ── Process payment ──
  S.balance -= amt;
  const now    = Date.now();
  const refno  = 'VP'+uid()+now.toString().slice(-6);
  const debitTxn = {
    id:'t'+uid(), type:'debit', name:contact.name,
    upi:contact.upi, amt, note:note||'Payment',
    date:now, tid:refno
  };
  S.txns.unshift(debitTxn);
  LS.addTxn(S.user.id, debitTxn);   // ✅ Persist sender's debit
  updateUserBalance();

  // ✅ Credit receiver if they are a registered EasyPay user
  const allUsers = LS.getUsers();
  const receiver = allUsers.find(u =>
    (u.upi && u.upi === contact.upi) ||
    (u.phone && contact.phone && u.phone === contact.phone)
  );
  if(receiver && receiver.id !== S.user.id) {
    const creditTxn = {
      id:'t'+uid(), type:'credit', name:S.user.name,
      upi:S.user.upi, amt, note:note||'Payment',
      date:now, tid:refno
    };
    LS.addTxn(receiver.id, creditTxn); // ✅ Persist receiver's credit
    const rIdx = allUsers.findIndex(u=>u.id===receiver.id);
    if(rIdx>=0){
      allUsers[rIdx].balance = (allUsers[rIdx].balance||15000) + amt;
      LS.saveUsers(allUsers);
    }
  }

  closeMod('mod-mpin');
  resetPinEntry();

  // ✅ Show success modal briefly, then transaction popup
  const d = new Date(now);
  $('ok-amt').textContent = '₹'+fmt(amt);
  $('ok-to').textContent  = 'Paid to '+contact.name;
  $('ok-meta').innerHTML  = `
    <div class="meta-row"><span class="lbl">To</span><span class="val">${escHtml(contact.name)}</span></div>
    <div class="meta-row"><span class="lbl">UPI ID</span><span class="val">${contact.upi}</span></div>
    <div class="meta-row"><span class="lbl">Amount</span><span class="val">₹${fmt(amt)}</span></div>
    <div class="meta-row"><span class="lbl">Date</span><span class="val">${fmtDate(now)} ${fmtTime(now)}</span></div>
    <div class="meta-row"><span class="lbl">Ref No.</span><span class="val">${refno}</span></div>
    <div class="meta-row"><span class="lbl">Note</span><span class="val">${escHtml(note||'—')}</span></div>
  `;
  openMod('mod-ok');
  updateUI();
  renderHistory('all');

  setTimeout(()=>{
    closeMod('mod-ok');
    showTxnPopup('debit', amt, contact.name, refno, note, now);
  }, 350);
  setTimeout(()=>showSMSPopup('debit', amt, contact.name, refno, note), 1100);
}

function handleSuccessClose() {
  closeMod('mod-ok');
  if(S.pendingPay?.onSuccess) S.pendingPay.onSuccess();
  S.pendingPay = null;
}

// ── HOME TRANSACTIONS ──────────────────────────
function renderHomeTxns() {
  const el=$('home-txns'); if(!el) return;
  const recent = S.txns.slice(0,6);
  if(!recent.length){
    el.innerHTML='<div style="text-align:center;color:var(--txm);padding:24px;font-size:.88rem">No transactions yet</div>';
    return;
  }
  el.innerHTML = recent.map(t=>txnRowHTML(t)).join('');
}

function txnRowHTML(t) {
  const c = S.contacts.find(x=>x.upi===t.upi)||{av:t.name.charAt(0),col:'#6366f1'};
  const isCr = t.type==='credit';
  return `<div class="txn-item" onclick="txnDetailPopup('${t.id}')">
    <div class="txn-av" style="background:${c.col}20;color:${c.col}">${escHtml(String(c.av))}</div>
    <div class="txn-info">
      <div class="txn-name">
        ${escHtml(t.name)}
        <span class="txn-badge ${isCr?'cr':'db'}">${isCr?'Received':'Sent'}</span>
      </div>
      <div class="txn-note">${escHtml(t.note||'—')}</div>
      <div class="txn-time">${fmtDShort(t.date)}, ${fmtTime(t.date)} · ${t.tid}</div>
    </div>
    <div class="txn-amt ${isCr?'cr':'db'}">${isCr?'+':'-'}₹${fmt(t.amt)}</div>
  </div>`;
}

function txnDetailPopup(tid) {
  const t = S.txns.find(x=>x.id===tid); if(!t) return;
  const isCr = t.type==='credit';
  showTxnPopup(t.type, t.amt, t.name, t.tid, t.note, t.date);
}

// ── HISTORY — CRYSTAL CLEAR ────────────────────
let currentHistFilter = 'all';

function renderHistory(filter) {
  currentHistFilter = filter || 'all';
  const wrap = $('hist-list-wrap'); if(!wrap) return;

  let txns = [...S.txns];
  if(filter==='credit')     txns = txns.filter(t=>t.type==='credit');
  else if(filter==='debit') txns = txns.filter(t=>t.type==='debit');
  else if(filter==='today') { const s=new Date(); s.setHours(0,0,0,0); txns=txns.filter(t=>t.date>=s.getTime()); }
  else if(filter==='week')  txns = txns.filter(t=>t.date>=Date.now()-7*86400000);
  txns.sort((a,b)=>b.date-a.date);

  // Summary counts
  const cr  = S.txns.filter(t=>t.type==='credit');
  const db  = S.txns.filter(t=>t.type==='debit');
  const crAmt = cr.reduce((a,t)=>a+t.amt,0);
  const dbAmt = db.reduce((a,t)=>a+t.amt,0);
  $('hist-recv').textContent      = '₹'+fmt(crAmt);
  $('hist-recv-count').textContent = cr.length+' transaction'+(cr.length!==1?'s':'');
  $('hist-sent').textContent      = '₹'+fmt(dbAmt);
  $('hist-sent-count').textContent = db.length+' transaction'+(db.length!==1?'s':'');

  if(!txns.length) {
    wrap.innerHTML = `<div class="hist-empty">
      <div class="hist-empty-icon">📭</div>
      <div class="hist-empty-msg">No transactions found</div>
      <div class="hist-empty-sub">Transactions will appear here after you send or receive money</div>
    </div>`;
    return;
  }

  // Group by date
  const groups = {};
  txns.forEach(t=>{
    const key = fmtDShort(t.date);
    if(!groups[key]) groups[key]=[];
    groups[key].push(t);
  });

  let html = '';
  Object.entries(groups).forEach(([label, items])=>{
    const dayTotal = items.reduce((s,t)=>t.type==='credit'?s+t.amt:s-t.amt, 0);
    const daySign  = dayTotal>=0 ? '+' : '';
    html += `<div class="hist-date-group">
      <div class="hist-date-label">
        ${escHtml(label)}
        <span style="font-size:.7rem;font-weight:700;color:${dayTotal>=0?'var(--ok)':'var(--err)'};margin-left:auto;font-family:var(--mono)">${daySign}₹${fmt(Math.abs(dayTotal))}</span>
      </div>
      <div class="hist-group-card">
        ${items.map(t=>txnItemFullHTML(t)).join('')}
      </div>
    </div>`;
  });
  wrap.innerHTML = html;
}

function txnItemFullHTML(t) {
  const c = S.contacts.find(x=>x.upi===t.upi)||{av:t.name.charAt(0),col:'#6366f1'};
  const isCr = t.type==='credit';
  return `<div class="txn-item-full" onclick="txnDetailPopup('${t.id}')">
    <div class="txn-av-lg" style="background:${c.col}20;color:${c.col}">${escHtml(String(c.av))}</div>
    <div class="txn-details">
      <div class="txn-name-row">
        <span class="txn-name-text">${escHtml(t.name)}</span>
        <span class="txn-badge-pill ${isCr?'cr':'db'}">${isCr?'Received':'Sent'}</span>
      </div>
      <div class="txn-note-text">${escHtml(t.note||'No note')}</div>
      <div class="txn-ref-text">Ref: ${t.tid} · ${fmtTime(t.date)}</div>
    </div>
    <div class="txn-amt-col">
      <div class="txn-amt-val ${isCr?'cr':'db'}">${isCr?'+':'-'}₹${fmt(t.amt)}</div>
      <div class="txn-time-val">${fmtTime(t.date)}</div>
    </div>
  </div>`;
}

function filterHistory(f, btn) {
  document.querySelectorAll('.hf').forEach(b=>b.classList.remove('on'));
  if(btn) btn.classList.add('on');
  renderHistory(f);
}

// ── SEND LIST ──────────────────────────────────
function renderSendList(q='') {
  const el=$('send-list'); if(!el) return;
  const registeredUsers = LS.getUsers().filter(u=>u.id!==S.user?.id);
  const allContacts = [...S.contacts];
  registeredUsers.forEach(u=>{
    if(!allContacts.find(c=>c.phone===u.phone))
      allContacts.push({id:u.id,name:u.name,phone:u.phone,upi:u.upi,av:u.name.charAt(0),col:'#7c3aed',rel:'User'});
  });
  const f = allContacts.filter(c=>
    c.name.toLowerCase().includes(q.toLowerCase()) ||
    c.upi.toLowerCase().includes(q.toLowerCase()) ||
    (c.phone&&c.phone.includes(q))
  );
  el.innerHTML = f.map(c=>`
    <div class="contact-row" onclick="openPayModal('${c.id}')">
      <div class="c-av" style="background:${c.col}20;color:${c.col}">${escHtml(String(c.av))}</div>
      <div style="flex:1;min-width:0">
        <div class="c-name">${escHtml(c.name)} <span style="font-size:.64rem;color:var(--txm);font-weight:600">${c.rel||''}</span></div>
        <div class="c-upiid">${c.upi}</div>
        <div class="c-ph">${c.phone||''}</div>
      </div>
      <button class="c-pay">Pay</button>
    </div>`).join('');
}

function switchSendTab(btn, tab) {
  document.querySelectorAll('[data-stab]').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  document.querySelectorAll('.stpnl').forEach(p=>p.style.display='none');
  $('stpnl-'+tab).style.display='block';
  if(tab==='contacts') renderSendList();
}

// ── PHONE TRANSFER ──────────────────────────────
let phoneContact=null, scanContactObj=null, shopContactObj=null, upiContactObj=null;

function phoneFind() {
  const ph=$('pt-phone').value.trim().replace(/\D/g,'');
  if(!ph||ph.length<10){ toast('Enter 10-digit number','err'); return; }
  let c=S.contacts.find(x=>x.phone.replace(/\D/g,'').slice(-10)===ph.slice(-10));
  if(!c){
    const u=LS.getUsers().find(x=>x.phone===ph);
    if(u) c={id:u.id,name:u.name,phone:u.phone,upi:u.upi,av:u.name.charAt(0),col:'#7c3aed',rel:'User'};
  }
  if(!c){ toast('No EasyPay user found','err'); return; }
  phoneContact=c;
  $('pt-av').textContent=c.av; $('pt-av').style.background=c.col+'20'; $('pt-av').style.color=c.col;
  $('pt-name').textContent=c.name; $('pt-upi').textContent=c.upi;
  $('pt-found-card').classList.add('on');
  toast('Found: '+c.name+' ✓','ok');
}
function phonePay(){
  if(!phoneContact){ toast('Find a contact first','err'); return; }
  const amt=parseFloat($('pt-amt').value),note=$('pt-note').value.trim();
  if(!amt||amt<=0){ toast('Enter amount','err'); return; }
  if(amt>S.balance){ toast('Insufficient balance','err'); return; }
  openPayFlow(phoneContact,amt,note||'Phone transfer');
}

function upiFind(){
  const id=$('upi-id-inp').value.trim(); if(!id){ toast('Enter UPI ID','err'); return; }
  let c=S.contacts.find(x=>x.upi===id);
  if(!c){
    const u=LS.getUsers().find(x=>x.upi===id);
    if(u) c={id:u.id,name:u.name,phone:u.phone,upi:u.upi,av:u.name.charAt(0),col:'#7c3aed',rel:'User'};
  }
  if(!c) c={id:'tmp'+uid(),name:id.split('@')[0],upi:id,av:id.charAt(0).toUpperCase(),col:'#a855f7',rel:'UPI'};
  upiContactObj=c;
  $('upi-av').textContent=c.av; $('upi-av').style.background=c.col+'20'; $('upi-av').style.color=c.col;
  $('upi-name').textContent=c.name; $('upi-upi').textContent=c.upi;
  $('upi-found-card').classList.add('on');
  toast('UPI ID verified ✓','ok');
}
function upiPay(){
  if(!upiContactObj){ toast('Verify UPI ID first','err'); return; }
  const amt=parseFloat($('upi-amt').value),note=$('upi-note').value.trim();
  if(!amt||amt<=0){ toast('Enter amount','err'); return; }
  if(amt>S.balance){ toast('Insufficient balance','err'); return; }
  openPayFlow(upiContactObj,amt,note||'UPI transfer');
}

// ── SCANNER ──────────────────────────────────
function simScan(type){
  let c;
  if(type==='phonePe') c=S.contacts.find(x=>x.rel==='Autowala')||pick(S.contacts);
  else if(type==='gpay') c=S.contacts.find(x=>x.rel==='Shop')||pick(S.contacts);
  else c=pick(S.contacts);
  scanContactObj=c;
  const badge={'phonePe':'🟣 PhonePe QR','gpay':'🔵 GPay QR','other':'⚪ Other QR'};
  $('sr-badge').textContent=badge[type]||'QR';
  $('sr-av').textContent=c.av; $('sr-av').style.background=c.col+'20'; $('sr-av').style.color=c.col;
  $('sr-name').textContent=c.name; $('sr-upi').textContent=c.upi;
  $('sr-amt').value=''; $('sr-pay-amt').textContent='—';
  $('sr-card').classList.add('on');
  toast('QR Scanned: '+c.name+' ✓','ok');
}
function scanPay(){
  if(!scanContactObj){ toast('Scan QR first','err'); return; }
  const amt=parseFloat($('sr-amt').value);
  if(!amt||amt<=0){ toast('Enter amount','err'); return; }
  if(amt>S.balance){ toast('Insufficient balance','err'); return; }
  openPayFlow(scanContactObj,amt,'QR Payment');
}
function shopFind(){
  const ph=$('shop-phone').value.trim().replace(/\D/g,'');
  if(!ph||ph.length<10){ toast('Enter 10-digit number','err'); return; }
  let c=S.contacts.find(x=>x.phone.replace(/\D/g,'').slice(-10)===ph.slice(-10));
  if(!c){ const u=LS.getUsers().find(x=>x.phone===ph); if(u) c={id:u.id,name:u.name,phone:u.phone,upi:u.upi,av:u.name.charAt(0),col:'#7c3aed',rel:'User'}; }
  if(!c){ c={id:'tmp'+uid(),name:'User '+ph.slice(-4),phone:ph,upi:ph+'@upi',av:'#',col:'#6b7280',rel:'Other'}; toast('Sending via mobile number','warn'); }
  shopContactObj=c;
  $('shop-av').textContent=c.av; $('shop-av').style.background=c.col+'20'; $('shop-av').style.color=c.col;
  $('shop-name').textContent=c.name; $('shop-upi').textContent=c.upi;
  $('shop-found-card').classList.add('on');
}
function shopPay(){
  if(!shopContactObj){ toast('Find contact first','err'); return; }
  const amt=parseFloat($('shop-amt').value),note=$('shop-note').value.trim();
  if(!amt||amt<=0){ toast('Enter amount','err'); return; }
  if(amt>S.balance){ toast('Insufficient balance','err'); return; }
  openPayFlow(shopContactObj,amt,note||'Payment');
}

// ── MODAL HELPERS ──────────────────────────────
function openMod(id){ const el=$(id); if(!el) return; el.classList.add('on'); document.body.style.overflow='hidden'; }
function closeMod(id){ const el=$(id); if(!el) return; el.classList.remove('on'); document.body.style.overflow=''; }
document.addEventListener('click',e=>{ if(e.target.classList.contains('modal-overlay')){ e.target.classList.remove('on'); document.body.style.overflow=''; } });

// ── BALANCE PAGE ──────────────────────────────
function renderBalPage(){
  $('bal-amt').textContent='₹'+fmt(S.balance);
  $('bal-asof').textContent='As of '+fmtDate(Date.now())+', '+fmtTime(Date.now());
  const cr=S.txns.filter(t=>t.type==='credit');
  const db=S.txns.filter(t=>t.type==='debit');
  $('bal-recv').textContent='₹'+fmt(cr.reduce((a,t)=>a+t.amt,0));
  $('bal-recv-c').textContent=cr.length+' transactions';
  $('bal-sent').textContent='₹'+fmt(db.reduce((a,t)=>a+t.amt,0));
  $('bal-sent-c').textContent=db.length+' transactions';
  $('bal-uname').textContent=S.user?.name||'—';
  $('bal-umob').textContent=S.user?.phone||'—';
  $('bal-uupi').textContent=S.user?.upi||'—';
  $('bal-ubank').textContent=S.user?.bank||'—';
  $('bal-uacc').textContent=S.user?.acc||'XXXX XXXX';
}
function downloadStatement(){
  const lines=['EasyPay — Account Statement','='.repeat(60),'',
    'Name: '+S.user?.name,'Mobile: '+S.user?.phone,
    'UPI ID: '+S.user?.upi,'Bank: '+S.user?.bank,
    'Generated: '+new Date().toLocaleString('en-IN'),
    'Balance: ₹'+fmt(S.balance),'','─'.repeat(60),
    'Date | Name | UPI ID | Type | Amount | Ref No.','─'.repeat(60)];
  [...S.txns].sort((a,b)=>b.date-a.date).forEach(t=>{
    lines.push(`${fmtDate(t.date)} | ${t.name} | ${t.upi} | ${t.type.toUpperCase()} | ₹${fmt(t.amt)} | ${t.tid}`);
  });
  const blob=new Blob([lines.join('\n')],{type:'text/plain'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='EasyPay_Statement.txt'; a.click();
  toast('Statement downloaded!','ok');
}

// ── CHAT ──────────────────────────────────────
const chatStore={};
const CHAT_P={
  'Mom':      {replies:['Beta kya hua? 😟','Haan beta, bhej rahi hoon 🙏','Khana khaya?','Okay sending 💕'],payConfirm:['Done beta! ✅','Sent! Take care!'],askWhy:['Kyon chahiye beta?','Sab theek hai?']},
  'Dad':      {replies:['Hmm okay.','Done.','Check account.','What for?'],payConfirm:['Sent.','Done.'],askWhy:['Kisliye?','Why?']},
  'Ammu Priya':{replies:['Haan haan sending yaar 😂','OMG sent!! 💖','Done da!! 🥳'],payConfirm:['Done bestie!! 🎉','Sent!! 💕'],askWhy:['Kya hua?? Tell me!','KYON?? 👀']},
  'Bhanu Reddy':{replies:['Sure bro 🤙','Done anna!','Chill, sent!'],payConfirm:['Done bro! ✅','Sent anna!'],askWhy:['Kisliye bro?','Why?']},
};
const DEF_P={replies:['Okay sending 😊','Sure, one sec!','Done! Check ✅'],payConfirm:['Done! ✅','Sent! 💰'],askWhy:['Kisliye?','What for?']};
const getP=name=>CHAT_P[name]||DEF_P;

function renderChatList(q=''){
  const el=$('chat-cl'); if(!el) return;
  const regUsers=LS.getUsers().filter(u=>u.id!==S.user?.id);
  const all=[...S.contacts];
  regUsers.forEach(u=>{ if(!all.find(c=>c.phone===u.phone)) all.push({id:u.id,name:u.name,phone:u.phone,upi:u.upi,av:u.name.charAt(0),col:'#7c3aed',rel:'User'}); });
  const filtered=all.filter(c=>c.name.toLowerCase().includes((q||'').toLowerCase()));
  el.innerHTML=filtered.slice(0,20).map(c=>{
    const msgs=chatStore[c.id]||[];
    const last=msgs[msgs.length-1];
    const unread=msgs.filter(m=>m.from==='them'&&!m.read).length;
    const preview=last?(last.from==='me'?'You: ':'')+chatPreview(last):c.rel+' · '+c.upi;
    return `<div class="chat-list-item" onclick="openChatThread('${c.id}')">
      <div class="cli-av" style="background:${c.col}20;color:${c.col}">${escHtml(String(c.av))}<span class="cli-dot"></span></div>
      <div style="flex:1;overflow:hidden">
        <div class="cli-n">${escHtml(c.name)}</div>
        <div class="cli-p">${escHtml(preview)}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        ${last?`<div class="cli-t">${fmtDShort(last.time)}</div>`:''}
        ${unread>0?`<div class="cli-bdg">${unread}</div>`:''}
      </div>
    </div>`;
  }).join('');
}
function chatPreview(m){
  if(m.payCard==='received') return ' ₹'+fmt(m.amt)+' received';
  if(m.payCard==='sent')     return ' ₹'+fmt(m.amt)+' sent';
  if(m.payCard==='request')  return '💰 Requested ₹'+fmt(m.amt);
  return (m.text||'').substring(0,36);
}
function openChatThread(cid){
  let c=S.contacts.find(x=>x.id===cid);
  if(!c){ const u=LS.getUsers().find(x=>x.id===cid); if(u) c={id:u.id,name:u.name,phone:u.phone,upi:u.upi,av:u.name.charAt(0),col:'#7c3aed',rel:'User'}; }
  if(!c) return;
  S.chatContact=c;
  $('ct-av').textContent=c.av; $('ct-av').style.background=c.col+'20'; $('ct-av').style.color=c.col;
  $('ct-name').textContent=c.name;
  $('chat-list-view').style.display='none'; $('chat-thread').style.display='flex';
  if(!chatStore[cid]) chatStore[cid]=[{id:'m0',from:'them',text:'Hey! 😊',time:Date.now()-3600000,read:true}];
  chatStore[cid].forEach(m=>m.read=true);
  renderThread(cid);
}
function closeChatThread(){ $('chat-list-view').style.display='block'; $('chat-thread').style.display='none'; S.chatContact=null; renderChatList($('chat-srch').value||''); }
function renderThread(cid){
  const el=$('ct-msgs'); if(!el) return;
  el.innerHTML='';
  (chatStore[cid]||[]).forEach(m=>{
    const isMe=m.from==='me';
    const t=fmtTime(m.time);
    const row=document.createElement('div');
    if(m.payCard==='request'){
      row.className='mrow '+(isMe?'me':'them');
      const canPay=!isMe&&!m.paid;
      row.innerHTML=`<div class="pay-req-card"><div class="prc-head"><div class="prc-label">${isMe?'YOU REQUESTED':'PAYMENT REQUEST'} 💰</div><div class="prc-amt">₹${fmt(m.amt)}</div><div class="prc-note">${m.note||''}</div></div><div class="prc-body">${canPay?`<button class="prc-pay-btn" onclick="chatPayReq('${cid}','${m.id}',${m.amt})">Pay ₹${fmt(m.amt)} →</button>`:m.paid?`<div class="prc-paid">✅ ${isMe?'Received!':'Paid!'}</div>`:`<div class="prc-paid" style="color:var(--txm)">⏳ Pending</div>`}</div></div>`;
    } else if(m.payCard==='received'){
      row.className='mrow '+(isMe?'me':'them');
      row.innerHTML=`<div class="money-recv-card"><div class="mrc-head"><div class="mrc-recv-label"> MONEY RECEIVED</div><div class="mrc-recv-amt">+₹${fmt(m.amt)}</div></div><div class="mrc-recv-body">From: <strong>${escHtml(m.fromName||'')}</strong><br>${escHtml(m.note||'')}<br><div class="mrc-recv-status">✅ Credited · ${t}</div></div></div>`;
    } else if(m.payCard==='sent'){
      row.className='mrow '+(isMe?'me':'them');
      row.innerHTML=`<div class="money-sent-card"><div class="msc-head"><div class="msc-sent-label"> MONEY SENT</div><div class="msc-sent-amt">-₹${fmt(m.amt)}</div></div><div class="msc-body">To: <strong>${escHtml(m.toName||'')}</strong><br>${escHtml(m.note||'')}<br><span style="color:var(--ok);font-weight:700">✅ Debited · ${t}</span></div></div>`;
    } else {
      row.className='mrow '+(isMe?'me':'them');
      row.innerHTML=`<div class="mbub">${escHtml(m.text||'')} <span class="mtime">${t}${isMe?' ✓✓':''}</span></div>`;
    }
    el.appendChild(row);
  });
  el.scrollTop=el.scrollHeight;
}
function detectPayAmt(txt){
  const lower=txt.toLowerCase().trim();
  const patterns=[/(?:send|pay|give|transfer|bhejo|dedo|pampava|pampu|ivo)\s*(?:rs\.?|₹)?\s*(\d[\d,]*)/i,/(?:rs\.?|₹)\s*(\d[\d,]*)/i,/(\d[\d,]*)\s*(?:rs|rupees?|rupai)/i];
  for(const p of patterns){ const m=lower.match(p); if(m){ const n=parseFloat(m[1].replace(/,/g,'')); if(n>0&&n<=200000) return n; } }
  return null;
}
function sendChat(){
  const inp=$('ct-inp'),txt=inp.value.trim(); if(!txt) return;
  const cid=S.chatContact?.id; if(!cid) return;
  if(!chatStore[cid]) chatStore[cid]=[];
  inp.value='';
  const reqAmt=detectPayAmt(txt);
  chatStore[cid].push({id:'m'+uid(),from:'me',text:txt,time:Date.now(),read:true});
  renderThread(cid); renderChatList();
  if(reqAmt){
    const msgId='req'+uid();
    setTimeout(()=>{ chatStore[cid].push({id:'m'+uid(),from:'them',text:pick(getP(S.chatContact.name).askWhy),time:Date.now(),read:true}); renderThread(cid); },900);
    setTimeout(()=>{ chatStore[cid].push({id:msgId,from:'me',payCard:'request',amt:reqAmt,note:'Requested via chat',paid:false,time:Date.now(),read:true}); renderThread(cid); renderChatList(); },1800);
    return;
  }
  setTimeout(()=>{ chatStore[cid].push({id:'m'+uid(),from:'them',text:pick(getP(S.chatContact.name).replies),time:Date.now(),read:true}); renderThread(cid); renderChatList(); },800+Math.random()*800);
}
function chatQuickReq(amt){
  const cid=S.chatContact?.id; if(!cid) return;
  if(!chatStore[cid]) chatStore[cid]=[];
  const pers=getP(S.chatContact?.name);
  const msgId='req'+uid();
  chatStore[cid].push({id:msgId,from:'me',payCard:'request',amt,note:'Quick request',paid:false,time:Date.now(),read:true});
  renderThread(cid);
  setTimeout(()=>{ chatStore[cid].push({id:'m'+uid(),from:'them',text:pick(pers.askWhy),time:Date.now(),read:true}); renderThread(cid); renderChatList();
    setTimeout(()=>{ chatStore[cid].push({id:'m'+uid(),from:'me',text:pick(['Dinner time!','College fees 😅','Auto fare']),time:Date.now(),read:true}); renderThread(cid);
      setTimeout(()=>{ chatStore[cid].push({id:'m'+uid(),from:'them',text:pick(pers.payConfirm),time:Date.now(),read:true}); renderThread(cid);
        setTimeout(()=>{
          const req=chatStore[cid].find(m=>m.id===msgId); if(req) req.paid=true;
          receiveMoneyChatCredit(cid,{name:S.chatContact.name,upi:S.chatContact.upi},amt,'From '+S.chatContact.name);
        },1500);
      },1000);
    },1200);
  },1000);
}
function chatPayReq(cid,msgId,amt){
  const c=S.contacts.find(x=>x.id===cid)||S.chatContact;
  S.pendingPay={contact:c,amt:parseFloat(amt),note:'Chat payment',onSuccess:()=>{
    const msg=chatStore[cid]?.find(m=>m.id===msgId); if(msg) msg.paid=true;
    chatStore[cid].push({id:'m'+uid(),from:'me',payCard:'sent',amt:parseFloat(amt),toName:c.name,note:'Paid via chat',time:Date.now(),read:true});
    if(S.chatContact?.id===cid) renderThread(cid); renderChatList();
  }};
  openPayFlow(c,parseFloat(amt),'Chat payment');
}
function receiveMoneyChatCredit(cid,contact,amt,note){
  const refno='VP'+uid();
  const txn={id:'t'+uid(),type:'credit',name:contact.name,upi:contact.upi,amt,note,date:Date.now(),tid:refno};
  S.txns.unshift(txn); S.balance+=amt;
  if(S.user) LS.addTxn(S.user.id,txn);
  updateUserBalance();
  chatStore[cid].push({id:'m'+uid(),from:'them',payCard:'received',amt,fromName:contact.name,note,time:Date.now(),read:true});
  renderThread(cid); renderChatList(); updateUI(); renderHistory(currentHistFilter);
  toast(' ₹'+fmt(amt)+' received from '+contact.name,'ok');
  setTimeout(()=>showSMSPopup('credit',amt,contact.name,refno,note),700);
  setTimeout(()=>showTxnPopup('credit',amt,contact.name,refno,note,Date.now()),1300);
}
function openPayFromChat(){ const c=S.chatContact; if(!c) return; openPayFlow(S.contacts.find(x=>x.id===c.id)||c,0,'Payment'); }
function openReqFromChat(){ const cid=S.chatContact?.id; if(!cid) return; const a=parseFloat(prompt('Request ₹ amount from '+S.chatContact?.name+':')); if(!a||a<=0){ toast('Invalid amount','err'); return; } chatQuickReq(a); }

// ── RECHARGE ──────────────────────────────────
const PACKS={
  mobile:{
    Airtel:[{p:179,d:'2GB/day',v:'28 days',desc:'Unlimited calls + SMS'},{p:299,d:'2.5GB/day',v:'28 days',desc:'Unlimited + SMS',pop:true},{p:359,d:'2.5GB/day',v:'28 days',desc:'Unlimited + Hotstar'},{p:599,d:'3GB/day',v:'56 days',desc:'Unlimited + OTT'}],
    Jio:   [{p:149,d:'1.5GB/day',v:'24 days',desc:'JioTV + JioCinema'},{p:239,d:'1.5GB/day',v:'28 days',desc:'Unlimited + JioApps',pop:true},{p:349,d:'2GB/day',v:'28 days',desc:'All JioApps'},{p:666,d:'2GB/day',v:'84 days',desc:'Long validity'}],
    Vi:    [{p:179,d:'1.5GB/day',v:'28 days',desc:'Unlimited + rollover'},{p:269,d:'2GB/day',v:'28 days',desc:'Weekend data rollover',pop:true},{p:449,d:'2.5GB/day',v:'56 days',desc:'OTT benefits'}],
    BSNL:  [{p:107,d:'2GB/day',v:'24 days',desc:'Basic unlimited'},{p:187,d:'2GB/day',v:'28 days',desc:'Unlimited calls',pop:true},{p:299,d:'3GB/day',v:'30 days',desc:'Premium plan'}],
  },
  dth:{
    'Tata Play':[{p:199,d:'Base SD',v:'30 days',desc:'100+ channels'},{p:399,d:'HD Pack',v:'30 days',desc:'300+ HD channels',pop:true},{p:599,d:'Premium',v:'30 days',desc:'OTT + 400+ channels'}],
    'Dish TV':  [{p:165,d:'Silver',v:'30 days',desc:'150+ channels'},{p:299,d:'Gold',v:'30 days',desc:'250+ HD channels',pop:true}],
    'D2H':      [{p:175,d:'Value HD',v:'30 days',desc:'200+ channels'},{p:350,d:'Sports HD',v:'30 days',desc:'Sports + movies',pop:true}],
    'Airtel DTH':[{p:249,d:'Select HD',v:'30 days',desc:'350+ channels',pop:true},{p:499,d:'Xtra HD',v:'30 days',desc:'500+ channels + OTT'}],
  },
  data:{
    Airtel:[{p:98,d:'10GB',v:'28 days',desc:'Data top-up'},{p:198,d:'25GB',v:'28 days',desc:'Best value',pop:true}],
    Jio:   [{p:91,d:'12GB',v:'30 days',desc:'JioFi data',pop:true},{p:151,d:'25GB',v:'30 days',desc:'Heavy user'}],
    BSNL:  [{p:99,d:'10GB',v:'30 days',desc:'Data card'},{p:186,d:'20GB',v:'30 days',desc:'Value pack',pop:true}],
  }
};
function initRecharge(){ renderRcPacks('Airtel'); renderDthPacks('Tata Play'); renderDataPacks('Airtel'); }
function rcOp(btn,op){ document.querySelectorAll('#rc-ops .op-tab').forEach(b=>b.classList.remove('on')); btn.classList.add('on'); S.rcOp=op; S.selectedPack=null; renderRcPacks(op); }
function dthOp(btn,op){ document.querySelectorAll('#rc-dth-ops .op-tab').forEach(b=>b.classList.remove('on')); btn.classList.add('on'); S.dthOp=op; S.selectedPack=null; renderDthPacks(op); }
function dataOp(btn,op){ document.querySelectorAll('#rc-data-ops .op-tab').forEach(b=>b.classList.remove('on')); btn.classList.add('on'); S.dataOp=op; S.selectedPack=null; renderDataPacks(op); }
function packHTML(p,grid){ return `<div class="pack${p.pop?' popular':''}" onclick="selectPack(this,${p.p},'${grid}')"><div class="pack-price">₹${p.p}</div><div class="pack-data">${p.d}</div><div class="pack-validity">Valid: ${p.v}</div><div class="pack-desc">${p.desc}</div></div>`; }
function renderRcPacks(op){ $('rc-packs').innerHTML=(PACKS.mobile[op]||[]).map(p=>packHTML(p,'rc-packs')).join(''); }
function renderDthPacks(op){ $('dth-packs').innerHTML=(PACKS.dth[op]||[]).map(p=>packHTML(p,'dth-packs')).join(''); }
function renderDataPacks(op){ $('data-packs').innerHTML=(PACKS.data[op]||[]).map(p=>packHTML(p,'data-packs')).join(''); }
function selectPack(el,price,grid){ document.getElementById(grid).querySelectorAll('.pack').forEach(p=>p.classList.remove('sel')); el.classList.add('sel'); S.selectedPack=price; }
function switchRcTab(btn,tab){ document.querySelectorAll('.tabs .tab').forEach(b=>b.classList.remove('on')); btn.classList.add('on'); ['mobile','dth','data'].forEach(t=>{ const el=document.getElementById('rc-'+t+'-pnl'); if(el) el.style.display=t===tab?'block':'none'; }); }
function doRecharge(type){
  let num,amt,note;
  if(type==='mobile'){ num=$('rc-phone').value.trim(); amt=S.selectedPack||parseFloat($('rc-custom').value); note=(S.rcOp||'Mobile')+' recharge for '+num; }
  else if(type==='dth'){ num=$('rc-dth-id').value.trim(); amt=S.selectedPack; note=(S.dthOp||'DTH')+' recharge'; }
  else{ num=$('rc-data-num').value.trim(); amt=S.selectedPack; note=(S.dataOp||'Data')+' recharge for '+num; }
  if(!num){ toast('Enter number/ID','err'); return; }
  if(!amt||amt<=0){ toast('Select a plan or enter amount','err'); return; }
  if(amt>S.balance){ toast('Insufficient balance','err'); return; }
  const c={id:'rch',name:(type==='mobile'?S.rcOp:type==='dth'?S.dthOp:S.dataOp)+' Recharge',upi:'recharge@easypay',av:'📱',col:'#0ea5e9'};
  openPayFlow(c,amt,note);
}

// ── BILLS ──────────────────────────────────────
const BILL_CFG={
  electricity:{ic:'⚡',title:'Electricity Bill',sub:'Pay electricity bill',idLbl:'Consumer Number',providers:['TSGENCO','TNEB','MSEDCL','BESCOM','KSEB']},
  water:      {ic:'💧',title:'Water Bill',sub:'Pay water bill',idLbl:'Customer ID',providers:['HMWS&SB','BWSSB','Chennai Metro Water','Delhi Jal Board']},
  gas:        {ic:'🔥',title:'Gas Bill',sub:'Pay piped gas bill',idLbl:'Consumer Number',providers:['IGL','MGL','GAIL','Adani Gas']},
  broadband:  {ic:'🌐',title:'Broadband Bill',sub:'Pay internet bill',idLbl:'Account ID',providers:['Airtel Xstream','BSNL','ACT Fibernet','JioFiber']},
  dth:        {ic:'📡',title:'DTH Recharge',sub:'Pay DTH bill',idLbl:'Subscriber ID',providers:['Tata Play','Dish TV','D2H','Airtel DTH']},
  ott:        {ic:'🎬',title:'OTT Subscription',sub:'Pay streaming bill',idLbl:'Email/Account ID',providers:['Netflix','Amazon Prime','Disney+ Hotstar','SonyLIV']},
  fastag:     {ic:'🚗',title:'FASTag Recharge',sub:'Recharge FASTag',idLbl:'Vehicle Number',providers:['HDFC FASTag','Paytm FASTag','Airtel FASTag']},
  rent:       {ic:'🏠',title:'House Rent',sub:'Pay rent via UPI',idLbl:'Landlord UPI',providers:['Direct UPI Transfer']},
  lpg:        {ic:'🛢️',title:'LPG Cylinder',sub:'Book & pay LPG',idLbl:'LPG Consumer ID',providers:['HP Gas','Indane','Bharatgas']},
};
function openBill(type){
  const cfg=BILL_CFG[type]; if(!cfg) return;
  S.currentBill={type,cfg,amount:null};
  $('bf-ic').textContent=cfg.ic; $('bf-title').textContent=cfg.title; $('bf-sub').textContent=cfg.sub;
  $('bf-id-lbl').textContent=cfg.idLbl;
  $('bf-provider').innerHTML=cfg.providers.map(p=>`<option>${p}</option>`).join('');
  $('bf-consumer').value=''; $('bf-result').style.display='none'; $('bf-pay-btn').style.display='none'; $('bf-success').style.display='none';
  $('bill-cat-view').style.display='none'; $('bill-form-view').style.display='block';
}
function closeBillForm(){ $('bill-form-view').style.display='none'; $('bill-cat-view').style.display='block'; S.currentBill=null; }
function fetchBill(){
  const id=$('bf-consumer').value.trim(); if(!id){ toast('Enter consumer number','err'); return; }
  toast('Fetching bill...','info');
  setTimeout(()=>{
    const amt=Math.floor(Math.random()*3000)+200;
    $('bf-amount').textContent='₹'+fmt(amt);
    $('bf-due').textContent=new Date(Date.now()+7*86400000).toLocaleDateString('en-IN');
    $('bf-period').textContent=new Date().toLocaleString('en-IN',{month:'long',year:'numeric'});
    $('bf-result').style.display='block'; $('bf-pay-btn').style.display='block';
    if(S.currentBill) S.currentBill.amount=amt;
    toast('Bill fetched! ✓','ok');
  },1200);
}
function payBill(){
  if(!S.currentBill?.amount){ toast('Fetch bill first','err'); return; }
  const cfg=S.currentBill.cfg;
  const c={id:'bill',name:cfg.title,upi:'bills@easypay',av:cfg.ic,col:'#4f46e5'};
  const note=cfg.title+' — '+$('bf-provider').value;
  S.pendingPay={contact:c,amt:S.currentBill.amount,note,onSuccess:()=>{
    $('bf-result').style.display='none'; $('bf-pay-btn').style.display='none';
    $('bf-success-msg').textContent=cfg.title+' of ₹'+fmt(S.currentBill.amount)+' paid!';
    $('bf-success').style.display='block';
  }};
  openPayFlow(c,S.currentBill.amount,note);
}

// ── SERVICES ──────────────────────────────────
function openService(type,ic,title,idLbl,provLbl){
  S.currentService={type,ic,title};
  $('sf-ic').textContent=ic; $('sf-title').textContent=title;
  $('sf-id-lbl').textContent=idLbl; $('sf-prov-lbl').textContent=provLbl;
  $('sf-account-id').value=''; $('sf-provider').value=''; $('sf-amt').value=''; $('sf-note').value='';
  $('sf-success').style.display='none'; $('sf-pay-btn').style.display='block';
  document.querySelector('.svc-grid').style.display='none'; $('svc-form-view').style.display='block';
}
function closeSvcForm(){ $('svc-form-view').style.display='none'; document.querySelector('.svc-grid').style.display='grid'; }
function payService(){
  const acc=$('sf-account-id').value.trim(),amt=parseFloat($('sf-amt').value),note=$('sf-note').value.trim();
  if(!acc){ toast('Enter account ID','err'); return; }
  if(!amt||amt<=0){ toast('Enter amount','err'); return; }
  if(amt>S.balance){ toast('Insufficient balance','err'); return; }
  const c={id:'svc',name:S.currentService.title,upi:'services@easypay',av:S.currentService.ic,col:'#4f46e5'};
  S.pendingPay={contact:c,amt,note:note||S.currentService.title,onSuccess:()=>{
    $('sf-pay-btn').style.display='none';
    $('sf-success-msg').textContent=S.currentService.title+' of ₹'+fmt(amt)+' paid!';
    $('sf-success').style.display='block';
  }};
  openPayFlow(c,amt,note||S.currentService.title);
}

// ── AI ASSISTANT ──────────────────────────────
const aiHistory=[];
function getAIContext(){
  const cr=S.txns.filter(t=>t.type==='credit');
  const db=S.txns.filter(t=>t.type==='debit');
  const spend=S.txns.filter(t=>t.type==='debit'&&new Date(t.date)>=new Date(new Date().getFullYear(),new Date().getMonth(),1)).reduce((a,t)=>a+t.amt,0);
  const recent=S.txns.slice(0,6).map(t=>`${t.type==='credit'?'+':'-'}₹${fmt(t.amt)} ${t.type==='credit'?'from':'to'} ${t.name} (${t.note||'—'})`).join('\n');
  return `You are EasyAI, a warm, helpful Indian banking assistant inside EasyPay UPI app.
Respond in Telugu/Hindi/English naturally. Mix languages (Hinglish, Tenglish). Use "anna","akka","yaar","bro" naturally.
USER: Name:${S.user?.name}, UPI:${S.user?.upi}, Balance:₹${fmt(S.balance)}, Received:₹${fmt(cr.reduce((a,t)=>a+t.amt,0))} (${cr.length}), Sent:₹${fmt(db.reduce((a,t)=>a+t.amt,0))} (${db.length}), Month Spend:₹${fmt(spend)}
RECENT:\n${recent}
Be concise (2-4 lines), warm, use ₹ symbol, emoji-friendly. Reference real data.`;
}
async function sendAI(){
  const inp=$('ai-inp'); const txt=inp.value.trim(); if(!txt) return;
  inp.value=''; appendAIMsg('user',txt);
  const btn=$('ai-send'); if(btn) btn.disabled=true;
  const te=document.createElement('div'); te.className='ai-msg bot'; te.id='tp'+Date.now();
  te.innerHTML=`<div class="ai-av bot">🪄</div><div class="ai-typing-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
  $('ai-msgs').appendChild(te); $('ai-msgs').scrollTop=$('ai-msgs').scrollHeight;
  aiHistory.push({role:'user',content:txt});
  try{
    const r=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer YOUR_API_KEY_HERE'},
      body:JSON.stringify({model:'google/gemma-3-1b-it:free',messages:[{role:'system',content:getAIContext()},...aiHistory.slice(-14)]})});
    const d=await r.json();
    const reply=d.choices?.[0]?.message?.content||'Sorry, try again 😅';
    aiHistory.push({role:'assistant',content:reply});
    document.getElementById(te.id)?.remove();
    appendAIMsg('bot',reply);
  } catch(e){ document.getElementById(te.id)?.remove(); appendAIMsg('bot','⚠️ Network error. Try again!'); }
  if(btn) btn.disabled=false;
}
function appendAIMsg(role,text){
  const el=$('ai-msgs');
  const msg=document.createElement('div'); msg.className='ai-msg '+(role==='user'?'user':'bot');
  const formatted=text.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
  msg.innerHTML=`<div class="ai-av ${role==='user'?'user':'bot'}">${role==='user'?(S.user?.name?.charAt(0)||'U'):'🪄'}</div><div class="ai-bubble">${formatted}</div>`;
  el.appendChild(msg); el.scrollTop=el.scrollHeight;
}
function aiAsk(q){ $('ai-inp').value=q; sendAI(); }

// ── SETTINGS ──────────────────────────────────
function populateSettings(){
  $('s-name').value=S.user?.name||'';
  $('s-email').value=S.user?.email||'';
  $('s-upi-display').textContent=S.user?.upi||'—';
  const fpOn=S.user?.fpRegistered;
  $('fp-status-text').textContent=fpOn?'✅ Fingerprint enabled & active':'Not setup';
  const btn=$('fp-setup-btn');
  if(btn){
    if(fpOn){ btn.textContent='✓ Enabled'; btn.classList.add('enabled'); btn.disabled=false; }
    else { btn.textContent='Setup'; btn.classList.remove('enabled'); btn.disabled=false; }
  }
  const infoBox=$('fp-info-box');
  if(infoBox&&fpOn){
    infoBox.innerHTML=`<div class="fp-info-title" style="color:var(--ok)">✅ Fingerprint Active</div>
      <div style="font-size:.78rem;color:var(--txs);margin-top:8px;line-height:1.6">You can now login with fingerprint and authorize payments with a touch.<br><br>
      <strong>To use on login:</strong> Enter mobile number → tap 👆 fingerprint icon<br>
      <strong>To use on payment:</strong> In MPIN screen → tap 👆 instead of entering MPIN</div>`;
  }
}
function saveProfile(){
  const name=$('s-name').value.trim();
  if(!name){ toast('Name required','err'); return; }
  S.user.name=name; S.user.email=$('s-email').value.trim();
  const users=LS.getUsers(); const idx=users.findIndex(u=>u.id===S.user.id);
  if(idx>=0){ users[idx].name=name; users[idx].email=S.user.email; LS.saveUsers(users); }
  LS.saveSession(S.user); updateUI(); toast('Profile saved ✓','ok');
}
function openMpinChange(){ buildOTP('cur-mpin-row',6,true); buildOTP('new-mpin-row',6,true); buildOTP('conf-mpin-row',6,true); openMod('mod-mpin-change'); }
function changeMPIN(){
  const cur=getOTPVal('cur-mpin-row'),newM=getOTPVal('new-mpin-row'),conf=getOTPVal('conf-mpin-row');
  if(S.user.mpin&&cur!==S.user.mpin){ toast('Current MPIN incorrect','err'); return; }
  if(newM.length<6){ toast('Enter 6-digit MPIN','err'); return; }
  if(newM!==conf){ toast('MPINs do not match','err'); return; }
  S.user.mpin=newM;
  const users=LS.getUsers(); const idx=users.findIndex(u=>u.id===S.user.id);
  if(idx>=0){ users[idx].mpin=newM; LS.saveUsers(users); }
  LS.saveSession(S.user); closeMod('mod-mpin-change'); toast('MPIN updated ✓','ok');
}
function showBellToast(){
  const msgs=['₹50 cashback credited! 🎉','Zero fees this weekend!','New offer on recharge!','You saved ₹120 this month! 🥳'];
  toast(pick(msgs),'ok'); $('bdot').style.display='none';
}

// ── BOOT ──────────────────────────────────────
window.addEventListener('DOMContentLoaded',()=>{
  buildOTP('mpin-row',6,true);
  buildOTP('mconf-row',6,true);
  buildOTP('mpin-row-login',6,true);

  setTimeout(()=>{
    $('splash').classList.add('out');
    setTimeout(()=>{
      $('splash').classList.add('h');
      const session=LS.getSession();
      if(session){
        S.user=session; S.balance=session.balance||15000;
        S.contacts=[...DEMO_CONTACTS]; S.txns=[];
        seedTxns(); launchApp();
      } else {
        $('auth').classList.add('on');
      }
    },550);
  },2600);
});

document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    ['mod-pay','mod-mpin','mod-ok','mod-mpin-change'].forEach(id=>closeMod(id));
    closeTxnPopup();
    closeSidebar();
  }
});
