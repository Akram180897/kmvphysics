const client = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const grid=document.querySelector("#grid"), search=document.querySelector("#search"), statusEl=document.querySelector("#status");
const admin=document.querySelector("#admin"), loginModal=document.querySelector("#loginModal");
let allNotes=[];

function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
async function loadNotes(){
  const {data,error}=await client.from("notes").select("*").eq("published",true).order("created_at",{ascending:false});
  if(error){statusEl.textContent="Please configure the website database first.";return}
  allNotes=data||[]; render();
}
function render(){
  const q=search.value.toLowerCase().trim();
  const rows=allNotes.filter(n=>`${n.title} ${n.subject} ${n.description}`.toLowerCase().includes(q));
  grid.innerHTML=rows.map(n=>`<article class="card"><span class="tag">${esc(n.subject)}</span><h3>${esc(n.title)}</h3><p>${esc(n.description||"")}</p><a class="read" href="${esc(n.file_url)}" target="_blank" rel="noopener">Open PDF →</a></article>`).join("");
  if(!rows.length) grid.innerHTML='<p class="status">No notes found.</p>';
}
search.addEventListener("input",render);

const open=()=>loginModal.classList.remove("hidden"), close=()=>loginModal.classList.add("hidden");
document.querySelector("#loginBtn").onclick=open; document.querySelector("#closeModal").onclick=close;

document.querySelector("#loginForm").onsubmit=async e=>{
 e.preventDefault(); const s=document.querySelector("#loginStatus"); s.textContent="Signing in…";
 const {error}=await client.auth.signInWithPassword({email:email.value,password:password.value});
 if(error){s.textContent=error.message;return} close(); await refreshUser();
};
document.querySelector("#logoutBtn").onclick=async()=>{await client.auth.signOut();refreshUser()};

async function refreshUser(){
 const {data:{user}}=await client.auth.getUser();
 admin.classList.toggle("hidden",!user);
 document.querySelector("#loginBtn").textContent=user?"Teacher Area":"Teacher Login";
 if(user) loadManage();
}
document.querySelector("#uploadForm").onsubmit=async e=>{
 e.preventDefault(); const s=document.querySelector("#uploadStatus"); const f=document.querySelector("#file").files[0];
 if(!f||f.type!=="application/pdf"){s.textContent="Please select a PDF.";return}
 if(f.size>20*1024*1024){s.textContent="PDF must be 20 MB or smaller.";return}
 s.textContent="Uploading…";
 const safe=f.name.toLowerCase().replace(/[^a-z0-9.-]+/g,"-"), path=`${crypto.randomUUID()}-${safe}`;
 const up=await client.storage.from("notes").upload(path,f,{contentType:"application/pdf",upsert:false});
 if(up.error){s.textContent=up.error.message;return}
 const pub=client.storage.from("notes").getPublicUrl(path).data.publicUrl;
 const ins=await client.from("notes").insert({title:title.value.trim(),subject:subject.value.trim(),description:description.value.trim(),file_path:path,file_url:pub,published:true});
 if(ins.error){await client.storage.from("notes").remove([path]);s.textContent=ins.error.message;return}
 e.target.reset();s.textContent="Published successfully."; await loadNotes(); await loadManage();
};
async function loadManage(){
 const {data,error}=await client.from("notes").select("*").order("created_at",{ascending:false});
 const box=document.querySelector("#manageList");
 if(error){box.textContent=error.message;return}
 box.innerHTML=(data||[]).map(n=>`<div class="manage-row"><span><b>${esc(n.title)}</b><br><small>${esc(n.subject)}</small></span><button class="danger" onclick="deleteNote('${esc(n.id)}','${esc(n.file_path)}')">Delete</button></div>`).join("");
}
window.deleteNote=async(id,path)=>{
 if(!confirm("Delete this note?"))return;
 const {error:e}=await client.storage.from("notes").remove([path]); if(e){alert(e.message);return}
 const {error}=await client.from("notes").delete().eq("id",id); if(error){alert(error.message);return}
 await loadNotes();await loadManage();
};
document.querySelector("#year").textContent=new Date().getFullYear();
if(SUPABASE_URL.startsWith("PASTE_")) statusEl.textContent="Setup required: add your Supabase URL and publishable key in config.js.";
else {loadNotes();refreshUser();}
