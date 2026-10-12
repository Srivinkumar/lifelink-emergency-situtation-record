/* LifeLink logic */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='lifelink.v1',BLOOD=['A+','A-','B+','B-','AB+','AB-','O+','O-'],ORGANS=['Heart','Kidneys','Liver','Lungs','Pancreas','Corneas','Skin & tissue'];
let S={p:null,reqs:[],log:[]};
try{S={...S,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch(e){}
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
const toast=m=>{const d=document.createElement('div');d.className='t';d.textContent=m;$('#toast').append(d);setTimeout(()=>d.remove(),3500)};
const hm=t=>new Date(t).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
const addLog=m=>{S.log.unshift({t:Date.now(),m});S.log=S.log.slice(0,30);persist();renderHosp()};

/* marquees (content duplicated for a seamless loop) */
const mq=(id,items)=>{const h=items.map(t=>`<span>${t} <em>/</em></span>`).join('');$(id).innerHTML=h+h+h+h};
mq('#mq1',['Blood group','Allergies','Donor status','Emergency contacts','Medical conditions']);
mq('#mq2',['One scan can change the outcome','Your pledge, on record','No app needed to read it','You approve every hospital request']);
mq('#mq3',['Scan','Save','Donate','Share the wish']);

/* build form widgets */
$('#blood').innerHTML=BLOOD.map(b=>`<label class="chip"><input type="radio" name="bg" value="${b}"><span>${b}</span></label>`).join('');
$('#organs').innerHTML=ORGANS.map(o=>`<label class="chip"><input type="checkbox" name="org" value="${o}"><span>${o}</span></label>`).join('');

const val=id=>$(id).value.trim();
function draft(){return{id:S.p?.id||'LL-DRAFT',name:val('#fName'),dob:$('#fDob').value,blood:($('input[name=bg]:checked')||{}).value||'',allergy:val('#fAll'),cond:val('#fCond'),meds:val('#fMeds'),
 organs:$$('input[name=org]:checked').map(x=>x.value),fam:$('#fFam').checked,c:[{n:val('#c1n'),p:val('#c1p')},{n:val('#c2n'),p:val('#c2p')}].filter(c=>c.p||c.n),allow:$('#fAllow').checked}}
const age=d=>{if(!d)return'';const a=Math.floor((Date.now()-new Date(d))/31557600000);return a>=0&&a<130?a+' yrs':''};
function payload(p){const L=['LIFELINK EMERGENCY CARD','NAME: '+(p.name||'-'),'BLOOD: '+(p.blood||'-'),'ALLERGIES: '+(p.allergy||'None stated'),'CONDITIONS: '+(p.cond||'None stated'),
 'ORGAN DONOR: '+(p.organs.length?p.organs.join(', '):'No pledge')];p.c.forEach((c,i)=>L.push('CALL '+(i+1)+': '+c.n+' '+c.p));return L.join('\n')}

let qt;function drawQR(p){clearTimeout(qt);qt=setTimeout(()=>{const el=$('#qr');el.innerHTML='';
 if(typeof QRCode==='undefined'){el.textContent='QR library could not load. Check your internet connection.';return}
 new QRCode(el,{text:payload(p),width:136,height:136,colorDark:'#09090B',colorLight:'#FAFAFA',correctLevel:QRCode.CorrectLevel.L});
 setTimeout(()=>{const c=el.querySelector('canvas');if(c)$('#dl').href=c.toDataURL('image/png')},80)},250)}

function renderCard(){const p=draft();
 $('#pBlood').textContent=p.blood||'?';$('#pName').textContent=p.name||'Your name';$('#pId').textContent=p.id;
 $('#pSub').textContent=[age(p.dob),p.c[0]?'Call '+(p.c[0].n||p.c[0].p):''].filter(Boolean).join(' · ')||'Age not set';
 $('#pTags').innerHTML=(p.organs.length?`<span class="tag y">Donor · ${p.organs.length} organ${p.organs.length>1?'s':''}</span>`:'<span class="tag">No pledge</span>')+(p.allergy?`<span class="tag">Allergy: ${esc(p.allergy.slice(0,24))}</span>`:'')+(p.allow?'<span class="tag">Hospital access: on request</span>':'<span class="tag">Hospital access: off</span>');
 drawQR(p)}
$('#form').addEventListener('input',renderCard);

/* save */
$('#form').addEventListener('submit',e=>{e.preventDefault();const p=draft();
 if(!p.name)return fail('#fName','Add your name first.');
 if(!p.blood)return fail('#blood input','Pick your blood group.');
 if(!p.c.some(c=>c.p))return fail('#c1p','Add at least one contact phone number.');
 if(!S.p)p.id='LL-'+Math.random().toString(36).slice(2,6).toUpperCase()+'-'+Math.random().toString(36).slice(2,6).toUpperCase();else p.id=S.p.id;
 S.p=p;persist();renderCard();status();addLog('Card saved ('+p.id+')');toast('Card saved. Your QR is live.');renderHosp()});
function fail(sel,m){toast(m);$(sel).focus()}
function status(){$('#status').textContent=S.p?'Saved on this device · '+S.p.id:'Draft. Not saved yet.'}

/* restore */
function restore(){const p=S.p;if(!p)return;$('#fName').value=p.name;$('#fDob').value=p.dob;$('#fAll').value=p.allergy;$('#fCond').value=p.cond;$('#fMeds').value=p.meds;
 $$('input[name=bg]').forEach(i=>i.checked=i.value===p.blood);$$('input[name=org]').forEach(i=>i.checked=p.organs.includes(i.value));$('#fFam').checked=p.fam;$('#fAllow').checked=p.allow;
 [['#c1n','#c1p'],['#c2n','#c2p']].forEach((f,i)=>{if(p.c[i]){$(f[0]).value=p.c[i].n;$(f[1]).value=p.c[i].p}})}

/* responder (QR scan) view */
function openScan(){const p=S.p||draft();if(!p.blood&&!p.name){toast('Fill in your card first, then scan.');return}
 $('#scanIn').innerHTML=`<div class="top"><span>Responder view · critical facts only</span><button id="xs">Close</button></div>
 <div class="big"><div class="blood">${esc(p.blood||'?')}</div><div><h4 style="color:var(--mfg);text-transform:uppercase;font-size:.8rem;letter-spacing:.08em">Patient</h4><div class="cname" style="font-size:clamp(1.8rem,4vw,3rem)">${esc(p.name)}</div><small>${esc(age(p.dob))}</small></div></div>
 <div class="grid"><div><h4>Allergies</h4><p>${esc(p.allergy||'None stated')}</p></div><div><h4>Conditions</h4><p>${esc(p.cond||'None stated')}</p></div>
 <div><h4>Organ donor</h4><p>${p.organs.length?esc(p.organs.join(', ')):'No pledge'}</p></div><div><h4>Call now</h4>${p.c.map(c=>`<div class="call"><p>${esc(c.n||'Contact')}</p><a class="btn sm" href="tel:${esc(c.p.replace(/[^+\d]/g,''))}">${esc(c.p)}</a></div>`).join('')||'<p>No contacts</p>'}</div></div>`;
 $('#scan').classList.add('on');$('#xs').focus();$('#xs').onclick=closeScan}
const closeScan=()=>$('#scan').classList.remove('on');
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeScan()});
$('#scanBtn').onclick=openScan;$('#demoScan').onclick=()=>{if(!S.p&&!draft().name){fillDemo()}openScan()};
function fillDemo(){$('#fName').value='Anitha Raman';$('#fDob').value='1994-03-12';$('input[name=bg][value="O+"]').checked=true;$('#fAll').value='Penicillin';$('#fCond').value='Type 1 diabetes';$('#fMeds').value='Insulin';
 $$('input[name=org]').forEach(i=>i.checked=['Kidneys','Corneas','Liver'].includes(i.value));$('#c1n').value='Raman (father)';$('#c1p').value='+91 98400 11122';renderCard()}

/* hospital handshake */
$('#hReq').onclick=()=>{if(!S.p)return toast('Save your card first, then send a request.');
 if(!S.p.allow)return toast('Hospital access is switched off on this card.');
 if(S.reqs.some(r=>r.st==='pending'))return toast('A request is already waiting for approval.');
 const r={id:Date.now(),h:$('#hSel').value,why:$('#hWhy').value,st:'pending',t:Date.now()};S.reqs.unshift(r);addLog(r.h+' requested access ('+r.why+')');toast('Request sent to the patient.')};
const setReq=(id,st)=>{const r=S.reqs.find(x=>x.id==id);r.st=st;if(st==='approved')r.until=Date.now()+36e5;addLog(({approved:'You approved '+r.h+' for 1 hour',denied:'You denied '+r.h,revoked:'You revoked access for '+r.h})[st])};
function renderHosp(){const now=Date.now();S.reqs.forEach(r=>{if(r.st==='approved'&&now>r.until){r.st='expired'}});
 const pend=S.reqs.filter(r=>r.st==='pending'),act=S.reqs.find(r=>r.st==='approved');
 $('#reqs').innerHTML=(pend.length?pend:[]).map(r=>`<div class="req"><b>${esc(r.h)}</b><p>${esc(r.why)} · ${hm(r.t)}. They are asking for your full record.</p><div class="row"><button class="btn sm" data-a="approved" data-i="${r.id}">Approve 1 hour</button><button class="btn sm out" data-a="denied" data-i="${r.id}">Deny</button></div></div>`).join('')
  +(act?`<div class="req" style="border-color:var(--accent)"><b>${esc(act.h)}</b><p>Access granted until ${hm(act.until)}.</p><button class="btn sm out" data-a="revoked" data-i="${act.id}">Revoke now</button></div>`:'')
  ||'';
 if(!pend.length&&!act)$('#reqs').innerHTML='<p style="color:var(--mfg);font-size:1.1rem">No requests yet. Send one from the hospital side.</p>';
 $$('#reqs [data-a]').forEach(b=>b.onclick=()=>setReq(b.dataset.i,b.dataset.a));
 const last=S.reqs[0],p=S.p;
 if(act&&p){$('#hView').innerHTML=`<div class="rec"><div class="h"><span>${esc(act.h)}</span><span>Open until ${hm(act.until)}</span></div><dl>
  <dt>Patient</dt><dd>${esc(p.name)} (${esc(p.id)})</dd><dt>Born</dt><dd>${esc(p.dob||'-')}</dd><dt>Blood</dt><dd>${esc(p.blood)}</dd><dt>Allergies</dt><dd>${esc(p.allergy||'None')}</dd>
  <dt>Conditions</dt><dd>${esc(p.cond||'None')}</dd><dt>Medicines</dt><dd>${esc(p.meds||'None')}</dd><dt>Organ pledge</dt><dd>${p.organs.length?esc(p.organs.join(', '))+(p.fam?' · family informed':' · family not yet informed'):'None'}</dd>
  <dt>Contacts</dt><dd>${p.c.map(c=>esc(c.n+' '+c.p)).join('<br>')}</dd></dl></div>`}
 else $('#hView').innerHTML=`<div class="locked"><b>Locked</b>${!last?'No request sent yet.':({pending:'Waiting for the patient to approve.',denied:'The patient denied this request.',revoked:'The patient revoked access.',expired:'Access expired. Send a new request.'})[last.st]||''}</div>`;
 $('#log').innerHTML=S.log.map(l=>`<div><time>${hm(l.t)}</time>${esc(l.m)}</div>`).join('')||'Activity log is empty.'}
setInterval(()=>{renderHosp()},20000);

/* hero zoom-out on scroll (skipped when motion is reduced) */
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;let tick=false;
if(!reduce)addEventListener('scroll',()=>{if(tick)return;tick=true;requestAnimationFrame(()=>{const p=Math.min(scrollY/(innerHeight*.9),1);
 $('#heroIn').style.transform=`scale(${1+p*.2})`;$('#heroIn').style.opacity=1-p;tick=false})},{passive:true});

restore();renderCard();status();renderHosp();
