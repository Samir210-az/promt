// ---------- Parallax (mouse + scroll) ----------
const orbs = document.querySelectorAll('.orb');
let mouseX = 0, mouseY = 0;
window.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth - 0.5);
  mouseY = (e.clientY / window.innerHeight - 0.5);
});
function animateParallax(){
  orbs.forEach(orb=>{
    const speed = parseFloat(orb.dataset.speed || 0.2);
    const scrollY = window.scrollY * speed * 0.3;
    const mx = mouseX * 40 * speed * 5;
    const my = mouseY * 40 * speed * 5;
    orb.style.transform = `translate3d(${mx}px, ${my + scrollY}px, 0)`;
  });
  requestAnimationFrame(animateParallax);
}
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  animateParallax();
}

// ---------- Settings panel ----------
const settingsToggleBtn = document.getElementById('settingsToggleBtn');
const settingsPanel = document.getElementById('settings-panel');
const apiKeyInput = document.getElementById('apiKey');

apiKeyInput.value = localStorage.getItem('groq_api_key') || '';
settingsToggleBtn.addEventListener('click', () => {
  settingsPanel.classList.toggle('open');
});
apiKeyInput.addEventListener('change', () => {
  localStorage.setItem('groq_api_key', apiKeyInput.value.trim());
});

// ---------- Local joke fallback (açar yoxdursa) ----------
const fallbackJokes = [
  "Hə hə, \"gözəl olsun\" — bunu deyəndə bütün dünya AI-ları bir anlıq dayanıb düşünür 😄",
  "Sadə yazdın, mən də sadə zarafat edirəm: promtun indi sənin yazdığından 10 dəfə uzun olacaq, qorxma 😎",
  "Ssdə formada yazmaq sənin fərdi tərzindir, hörmət edirəm — amma AI ssdə dil bilmir, ona görə tərcüməçi rolunu öz üstümə götürürəm 🕵️",
  "Bir kəlmə yazıb \"hərtərəfli\" istəyən adamı tanıyıram... özün 😂",
  "Narahat olma, bu fikri elə bir promta çevirəcəm ki, sən özün də deyəcəksən \"mən bunu demək istəmişdim?\" 🤔➡️✨"
];
function randomFallbackJoke(){
  return fallbackJokes[Math.floor(Math.random()*fallbackJokes.length)];
}

// ---------- UI helpers ----------
const jokeZone = document.getElementById('joke-zone');
const resultZone = document.getElementById('result-zone');
const generateBtn = document.getElementById('generateBtn');
const clearBtn = document.getElementById('clearBtn');
const userInput = document.getElementById('userInput');

function showLoader(){
  resultZone.innerHTML = `<div class="loader"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`;
}
function showJoke(text){
  jokeZone.innerHTML = `<div class="joke-bubble"><span class="tag">Promt.AI deyir</span>${escapeHtml(text)}</div>`;
}
function showResult(text){
  resultZone.innerHTML = `
    <div class="result-card">
      <button class="copy-btn" id="copyBtn">📋 Kopyala</button>
      ${escapeHtml(text)}
    </div>`;
  document.getElementById('copyBtn').addEventListener('click', ()=>{
    navigator.clipboard.writeText(text);
    const b = document.getElementById('copyBtn');
    b.textContent = '✅ Kopyalandı';
    setTimeout(()=>b.textContent='📋 Kopyala', 1800);
  });
}
function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

clearBtn.addEventListener('click', ()=>{
  userInput.value = '';
  jokeZone.innerHTML = '';
  resultZone.innerHTML = '';
  userInput.focus();
});

// ---------- Groq API call ----------
async function callGroq(apiKey, userIdea, targetModel, tone){
  const systemPrompt = `Sən "Promt.AI" adlı zarafatcıl, Azərbaycan dilində danışan bir AI prompt mühəndisisən.
İstifadəçi sənə qısa, bəzən "ssdə" formada (yəni dağınıq, sadələşdirilmiş, bəlkə şəkilçisiz) bir fikir yazacaq.
Sənin işin İKİ HİSSƏDİR:
1) "joke": Həmin konkret sorğu ilə bağlı, ona aid, qısa (1-2 cümlə), səmimi və məzəli bir zarafat - istifadəçinin yazı tərzinə və ya mövzusuna istinad et. Həqarətverici olma, mehriban zarafat olsun.
2) "prompt": İstifadəçinin fikrini, məqsəd növünə (${targetModel}) və tona (${tone}) uyğun, HƏRTƏRƏFLİ, DETALLI, peşəkar bir AI promtuna çevir. Promt aydın struktur, kontekst, məqsəd, format və məhdudiyyətləri ehtiva etsin. Promtun özü İNGİLİS DİLİNDƏ yazılmalıdır (çünki əksər AI modelləri ingiliscə promtlarla daha güclü işləyir), AMMA "joke" sahəsi Azərbaycan dilində olmalıdır.

Cavabını YALNIZ bu JSON formatında ver, başqa heç nə əlavə etmə, markdown kodu işarələri (\`\`\`) qoyma:
{"joke": "...", "prompt": "..."}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userIdea }
      ],
      temperature: 0.85,
      max_tokens: 900
    })
  });

  if(!res.ok){
    const errText = await res.text();
    throw new Error(`Groq xətası (${res.status}): ${errText.slice(0,200)}`);
  }
  const data = await res.json();
  let content = data.choices?.[0]?.message?.content || '';
  content = content.trim().replace(/^```json/i,'').replace(/^```/,'').replace(/```$/,'').trim();
  try{
    return JSON.parse(content);
  }catch(e){
    return { joke: randomFallbackJoke(), prompt: content };
  }
}

// ---------- Local fallback prompt builder (açar yoxdursa) ----------
function buildFallbackPrompt(userIdea, targetModel, tone){
  const toneMap = {
    'peşəkar':'professional and precise',
    'yaradıcı':'creative and imaginative',
    'sadə':'simple and beginner-friendly'
  };
  const modelMap = {
    'ümumi':'a general-purpose AI assistant (ChatGPT/Claude/Gemini)',
    'şəkil':'an image generation model (Midjourney/DALL·E/Stable Diffusion)',
    'kod':'a coding assistant',
    'video':'a video/animation generation tool',
    'yazı':'a writing/content generation AI'
  };
  return `ROLE: You are an expert assistant helping with the following request.

TARGET SYSTEM: ${modelMap[targetModel] || targetModel}
TONE: ${toneMap[tone] || tone}

USER'S ORIGINAL IDEA (raw, informal):
"${userIdea}"

TASK:
Expand the above raw idea into a complete, production-ready outcome. Specifically:
1. Clarify the core goal behind the idea.
2. Define the target audience and context.
3. Specify the desired format, structure, and length.
4. List concrete constraints, style guidelines, and quality bar.
5. Include 2-3 concrete examples or reference points if relevant.
6. State what a successful result looks like.

OUTPUT FORMAT: Well-structured, ready to paste directly into the target AI system listed above.`;
}

// ---------- Main generate flow ----------
generateBtn.addEventListener('click', async () => {
  const idea = userInput.value.trim();
  if(!idea){
    userInput.focus();
    userInput.style.borderColor = '#6A0000';
    setTimeout(()=>userInput.style.borderColor='', 1000);
    return;
  }
  const targetModel = document.getElementById('targetModel').value;
  const tone = document.getElementById('tone').value;
  const apiKey = (localStorage.getItem('groq_api_key') || apiKeyInput.value || '').trim();

  jokeZone.innerHTML = '';
  showLoader();
  generateBtn.disabled = true;
  generateBtn.textContent = '⏳ Düşünürəm...';

  try{
    let joke, prompt;
    if(apiKey){
      const out = await callGroq(apiKey, idea, targetModel, tone);
      joke = out.joke || randomFallbackJoke();
      prompt = out.prompt || buildFallbackPrompt(idea, targetModel, tone);
    } else {
      joke = randomFallbackJoke();
      prompt = buildFallbackPrompt(idea, targetModel, tone);
    }
    showJoke(joke);
    setTimeout(()=>showResult(prompt), 250);
  }catch(err){
    showJoke('Aaa, Groq bir az tutuldu deyəsən 😅 ona görə özüm əl atdım, budur sənin promtun:');
    showResult(buildFallbackPrompt(idea, targetModel, tone));
    console.error(err);
  }finally{
    generateBtn.disabled = false;
    generateBtn.textContent = '✨ Promtu Yarat';
  }
});

userInput.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter' && (e.ctrlKey || e.metaKey)){
    generateBtn.click();
  }
});
