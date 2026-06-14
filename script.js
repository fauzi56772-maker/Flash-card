/* ============================================================
   FlashMind – script.js
   Full-featured Flashcard Generator App
   ============================================================ */

'use strict';

// ─────────────────────────────────────────────
// PDF.js Worker Setup
// ─────────────────────────────────────────────
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ─────────────────────────────────────────────
// APP STATE
// ─────────────────────────────────────────────
const state = {
  flashcards: [],          // [{id, question, answer, learned, difficulty}]
  filtered: [],            // filtered copy for search
  currentIndex: 0,
  isFlipped: false,
  isAutoPlay: false,
  autoPlayInterval: null,
  quizCards: [],
  quizIndex: 0,
  quizScore: 0,
  quizWrong: 0,
  quizTimer: null,
  quizTimeLeft: 30,
  editingIndex: null,
  savedDecks: [],          // [{id, name, cards, created, emoji}]
  stats: {
    totalQuizzes: 0,
    totalCorrect: 0,
    totalAnswered: 0
  }
};

// ─────────────────────────────────────────────
// DOM REFS
// ─────────────────────────────────────────────
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// ─────────────────────────────────────────────
// SAMPLE FLASHCARDS (shown on first load)
// ─────────────────────────────────────────────
const SAMPLE_FLASHCARDS = [
  { question: "Siapa penemu hukum gravitasi universal?", answer: "Isaac Newton, fisikawan Inggris yang menemukan hukum gravitasi pada tahun 1687." },
  { question: "Apa ibu kota Jepang?", answer: "Tokyo — kota metropolitan terbesar di dunia dengan populasi lebih dari 13 juta jiwa." },
  { question: "Berapakah nilai Pi (π) hingga 4 desimal?", answer: "3.1416 — konstanta matematika yang mewakili perbandingan keliling lingkaran dengan diameternya." },
  { question: "Apa rumus luas lingkaran?", answer: "L = π × r², di mana r adalah jari-jari lingkaran." },
  { question: "Siapakah penemu telepon?", answer: "Alexander Graham Bell, yang mendapat paten telepon pertama pada tahun 1876." },
  { question: "Apa kepanjangan dari DNA?", answer: "Deoxyribonucleic Acid — molekul yang membawa informasi genetik pada semua makhluk hidup." },
  { question: "Berapa jumlah planet di tata surya?", answer: "8 planet: Merkurius, Venus, Bumi, Mars, Jupiter, Saturnus, Uranus, dan Neptunus." },
  { question: "Apa fungsi utama mitokondria dalam sel?", answer: "Mitokondria adalah 'powerhouse' sel yang menghasilkan energi dalam bentuk ATP melalui respirasi seluler." },
  { question: "Siapa yang menulis Romeo and Juliet?", answer: "William Shakespeare, dramawan Inggris yang hidup pada tahun 1564–1616." },
  { question: "Apa perbedaan antara vektor dan skalar?", answer: "Skalar hanya memiliki besar (contoh: suhu), sedangkan vektor memiliki besar dan arah (contoh: gaya, kecepatan)." },
  { question: "Apa itu fotosintesis?", answer: "Proses di mana tumbuhan mengubah cahaya matahari, air, dan CO₂ menjadi glukosa dan oksigen menggunakan klorofil." },
  { question: "Berapa kecepatan cahaya di ruang hampa?", answer: "Sekitar 299.792.458 meter per detik, atau kira-kira 3 × 10⁸ m/s." }
];

// ─────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  initDarkMode();
  initNavbar();
  initTabs();
  initTextInput();
  initFileUpload();
  initQtyControls();
  initGenerateBtn();
  initFlashcardSection();
  initQuizSection();
  initSearch();
  initExportButtons();
  initSaveBtn();
  initEditModal();
  renderSavedDecks();
  updateStats();
  initScrollAnimations();

  // Load sample cards on first visit
  if (state.flashcards.length === 0) {
    loadSampleCards();
  } else {
    showFlashcardSection();
  }
});

// ─────────────────────────────────────────────
// STORAGE
// ─────────────────────────────────────────────
function loadFromStorage() {
  try {
    const saved = localStorage.getItem('flashmind_decks');
    if (saved) state.savedDecks = JSON.parse(saved);
    const stats = localStorage.getItem('flashmind_stats');
    if (stats) state.stats = { ...state.stats, ...JSON.parse(stats) };
  } catch (e) { console.warn('Storage load error:', e); }
}

function saveToStorage() {
  try {
    localStorage.setItem('flashmind_decks', JSON.stringify(state.savedDecks));
    localStorage.setItem('flashmind_stats', JSON.stringify(state.stats));
  } catch (e) { console.warn('Storage save error:', e); }
}

// ─────────────────────────────────────────────
// DARK MODE
// ─────────────────────────────────────────────
function initDarkMode() {
  const saved = localStorage.getItem('flashmind_theme') || 'light';
  setTheme(saved);
  $('darkModeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  });
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('flashmind_theme', theme);
  const icon = $('darkModeIcon');
  if (icon) {
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }
}

// ─────────────────────────────────────────────
// NAVBAR
// ─────────────────────────────────────────────
function initNavbar() {
  window.addEventListener('scroll', () => {
    const nav = $('navbar');
    if (window.scrollY > 20) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  });

  $('navMenuBtn').addEventListener('click', () => {
    const menu = $('mobileMenu');
    menu.classList.toggle('open');
  });

  $('navGenerateBtn').addEventListener('click', () => {
    $('input-section').scrollIntoView({ behavior: 'smooth' });
  });

  // Close mobile menu on link click
  $$('.mobile-link').forEach(link => {
    link.addEventListener('click', () => {
      $('mobileMenu').classList.remove('open');
    });
  });
}

// ─────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────
function initTabs() {
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      $$('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      $(`tab-${tab}`).classList.add('active');
    });
  });
}

// ─────────────────────────────────────────────
// TEXT INPUT
// ─────────────────────────────────────────────
function initTextInput() {
  const textarea = $('materialInput');
  const counter = $('charCount');
  textarea.addEventListener('input', () => {
    counter.textContent = `${textarea.value.length.toLocaleString()} karakter`;
  });
  $('clearTextBtn').addEventListener('click', () => {
    textarea.value = '';
    counter.textContent = '0 karakter';
    showToast('Teks dihapus', 'info');
  });
}

// ─────────────────────────────────────────────
// FILE UPLOAD & PDF READING
// ─────────────────────────────────────────────
function initFileUpload() {
  const dropZone = $('dropZone');
  const fileInput = $('fileInput');
  const uploadBtn = $('uploadBtn');
  const removeBtn = $('removeFileBtn');

  uploadBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', e => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  removeBtn.addEventListener('click', e => {
    e.stopPropagation();
    resetFileUpload();
  });
}

function handleFile(file) {
  const allowed = ['application/pdf', 'text/plain'];
  const ext = file.name.split('.').pop().toLowerCase();
  if (!allowed.includes(file.type) && !['pdf', 'txt'].includes(ext)) {
    showToast('Format file tidak didukung. Gunakan PDF atau TXT.', 'error');
    return;
  }

  $('fileName').textContent = file.name;
  $('fileSize').textContent = formatFileSize(file.size);
  $('fileTypeIcon').className = ext === 'pdf'
    ? 'fas fa-file-pdf file-icon'
    : 'fas fa-file-alt file-icon';

  if (ext === 'pdf') {
    $('fileTypeIcon').style.color = '#ef4444';
  } else {
    $('fileTypeIcon').style.color = '#6366f1';
  }

  $('dropZone').querySelector('.drop-zone-content').style.display = 'none';
  $('filePreview').style.display = 'block';

  if (ext === 'pdf') {
    readPDF(file);
  } else {
    readTXT(file);
  }
}

function resetFileUpload() {
  $('fileInput').value = '';
  $('filePreview').style.display = 'none';
  $('dropZone').querySelector('.drop-zone-content').style.display = 'flex';
  $('pdfProgress').style.display = 'none';
  window._fileText = '';
}

function readTXT(file) {
  const reader = new FileReader();
  reader.onload = e => {
    window._fileText = e.target.result;
    showToast(`File "${file.name}" berhasil dibaca!`, 'success');
  };
  reader.readAsText(file, 'UTF-8');
}

function readPDF(file) {
  if (typeof pdfjsLib === 'undefined') {
    showToast('PDF.js tidak tersedia. Gunakan paste teks.', 'error');
    return;
  }

  $('pdfProgress').style.display = 'block';
  updatePdfProgress(0, 'Memulai pembacaan PDF...');

  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const typedArray = new Uint8Array(e.target.result);
      const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
      const totalPages = pdf.numPages;
      let fullText = '';

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
        const pct = Math.round((i / totalPages) * 100);
        updatePdfProgress(pct, `Membaca halaman ${i} dari ${totalPages}...`);
      }

      window._fileText = fullText.trim();
      updatePdfProgress(100, 'PDF berhasil dibaca!');
      showToast(`PDF berhasil dibaca (${totalPages} halaman)`, 'success');

      setTimeout(() => {
        $('pdfProgress').style.display = 'none';
      }, 2000);
    } catch (err) {
      console.error('PDF Error:', err);
      showToast('Gagal membaca PDF. Pastikan file tidak terpassword.', 'error');
      $('pdfProgress').style.display = 'none';
    }
  };
  reader.readAsArrayBuffer(file);
}

function updatePdfProgress(pct, text) {
  const bar = $('pdfProgressBar');
  bar.style.setProperty('--pct', pct + '%');
  bar.style.background = `linear-gradient(90deg, var(--primary) ${pct}%, var(--border) ${pct}%)`;
  $('pdfProgressText').textContent = text;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ─────────────────────────────────────────────
// QUANTITY CONTROLS
// ─────────────────────────────────────────────
function initQtyControls() {
  let qty = 10;
  const display = $('qtyValue');

  $('qtyMinus').addEventListener('click', () => {
    if (qty > 3) { qty--; display.textContent = qty; }
  });
  $('qtyPlus').addEventListener('click', () => {
    if (qty < 50) { qty++; display.textContent = qty; }
  });
}

function getQty() {
  return parseInt($('qtyValue').textContent) || 10;
}

// ─────────────────────────────────────────────
// GENERATE FLASHCARDS
// ─────────────────────────────────────────────
function initGenerateBtn() {
  $('generateBtn').addEventListener('click', generateFlashcards);
}

async function generateFlashcards() {
  // Get source text
  const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
  let text = '';

  if (activeTab === 'text') {
    text = $('materialInput').value.trim();
  } else {
    text = (window._fileText || '').trim();
  }

  if (!text || text.length < 50) {
    showToast('Masukkan materi minimal 50 karakter!', 'warning');
    return;
  }

  const qty = getQty();
  const deckName = $('deckNameInput').value.trim() || 'Flashcard Baru';

  // Show loading
  showLoading();

  try {
    // Simulate AI processing steps
    await sleep(600);  updateLoadingStep(1);
    await sleep(800);  updateLoadingStep(2);
    await sleep(700);  updateLoadingStep(3);

    // Generate flashcards with rule-based AI
    const cards = generateCardsFromText(text, qty);

    if (cards.length === 0) {
      hideLoading();
      showToast('Tidak cukup konten untuk membuat flashcard. Tambahkan lebih banyak teks.', 'warning');
      return;
    }

    await sleep(500); updateLoadingStep(4);
    await sleep(600);

    // Set state
    state.flashcards = cards.map((c, i) => ({
      id: Date.now() + i,
      question: c.question,
      answer: c.answer,
      learned: false,
      difficulty: 'medium'
    }));

    state.filtered = [...state.flashcards];
    state.currentIndex = 0;
    state.isFlipped = false;

    $('flashcardDeckTitle').textContent = deckName;

    hideLoading();
    showFlashcardSection();
    renderCardViewer();
    renderCardGrid();
    updateStats();

    showToast(`✨ ${cards.length} flashcard berhasil dibuat!`, 'success');
    $('flashcard-section').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    hideLoading();
    console.error('Generate error:', err);
    showToast('Terjadi kesalahan saat generate. Coba lagi.', 'error');
  }
}

// ─────────────────────────────────────────────
// AI RULE-BASED FLASHCARD GENERATOR
// ─────────────────────────────────────────────
function generateCardsFromText(text, maxCards) {
  const cards = [];
  const lang = $('langSelect').value;

  // Clean & normalize text
  const cleaned = text
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s.,;:?!()–\-\u00C0-\u024F]/g, ' ')
    .trim();

  // Split into sentences
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.split(' ').length >= 4);

  // ── Strategy 1: Definition patterns ──
  const defPatterns = [
    /^(.+?)\s+(?:adalah|merupakan|ialah|didefinisikan sebagai|berarti|artinya)\s+(.+)$/i,
    /^(.+?)\s+(?:is|are|was|were|refers to|means|defined as)\s+(.+)$/i,
    /^(.+?)\s*:\s*(.{20,})$/,
    /^(.+?)\s+(?:yaitu|yakni)\s+(.+)$/i,
  ];

  for (const sentence of sentences) {
    if (cards.length >= maxCards) break;
    for (const pattern of defPatterns) {
      const m = sentence.match(pattern);
      if (m && m[1] && m[2] && m[1].split(' ').length <= 8) {
        const subject = m[1].trim();
        const definition = m[2].trim().replace(/\.$/, '');
        if (subject.length > 2 && definition.length > 10) {
          const q = lang === 'id'
            ? `Apa yang dimaksud dengan ${subject}?`
            : `What is ${subject}?`;
          cards.push({ question: q, answer: capitalize(definition) });
          break;
        }
      }
    }
  }

  // ── Strategy 2: Who/What patterns (named entities) ──
  const whoPatterns = [
    /([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(?:adalah|merupakan|lahir|menemukan|menciptakan|mendirikan|menulis)\s+(.{15,})/,
    /([A-Z][a-z]+ [A-Z][a-z]+)\s+(?:was|is|discovered|invented|founded|wrote|created)\s+(.{15,})/,
  ];

  for (const sentence of sentences) {
    if (cards.length >= maxCards) break;
    for (const pattern of whoPatterns) {
      const m = sentence.match(pattern);
      if (m && !cards.find(c => c.question.includes(m[1]))) {
        const name = m[1].trim();
        const action = m[2].replace(/\.$/, '').trim();
        const q = lang === 'id'
          ? `Apa yang diketahui tentang ${name}?`
          : `What is known about ${name}?`;
        cards.push({ question: q, answer: `${name} ${action}.` });
        break;
      }
    }
  }

  // ── Strategy 3: Number/statistic facts ──
  const numPattern = /(.{10,30}?)\s+(\d[\d.,]*\s*(?:%|persen|km|kg|m|cm|tahun|year|million|juta|billion|miliar|ribu|thousand)?)\s+(.{10,})/gi;
  let match;
  while ((match = numPattern.exec(cleaned)) !== null && cards.length < maxCards) {
    const context = match[1].trim();
    const num = match[2].trim();
    const rest = match[3].trim().split('.')[0];
    if (context.length > 5 && rest.length > 5) {
      const q = lang === 'id'
        ? `Berapa ${context.toLowerCase()}?`
        : `How many/much ${context.toLowerCase()}?`;
      if (!cards.find(c => c.question === q)) {
        cards.push({ question: q, answer: `${num} ${rest}.` });
      }
    }
  }

  // ── Strategy 4: Keyword extraction (fallback) ──
  const keywords = extractKeywords(cleaned);
  const usedKeywords = new Set();

  for (const kw of keywords) {
    if (cards.length >= maxCards) break;
    if (usedKeywords.has(kw.toLowerCase())) continue;

    // Find the best sentence mentioning this keyword
    const relSentences = sentences.filter(s =>
      s.toLowerCase().includes(kw.toLowerCase()) && s.length > 40
    );

    if (relSentences.length > 0) {
      const best = relSentences.reduce((a, b) => a.length > b.length ? b : a);
      const answer = best.replace(/\.$/, '').trim();
      const q = lang === 'id'
        ? buildQuestion_id(kw, best)
        : buildQuestion_en(kw, best);

      if (!cards.find(c => c.answer === answer) && answer.length > 15) {
        cards.push({ question: q, answer: capitalize(answer) + '.' });
        usedKeywords.add(kw.toLowerCase());
      }
    }
  }

  // ── Strategy 5: Fill remaining with sentence-to-Q conversion ──
  const remaining = maxCards - cards.length;
  if (remaining > 0) {
    const unused = sentences
      .filter(s => !cards.find(c => c.answer.includes(s.substring(0, 30))))
      .slice(0, remaining * 3);

    for (const s of unused) {
      if (cards.length >= maxCards) break;
      const q = sentenceToQuestion(s, lang);
      if (q && !cards.find(c => c.question === q)) {
        cards.push({ question: q, answer: capitalize(s.replace(/\.$/, '')) + '.' });
      }
    }
  }

  return cards.slice(0, maxCards);
}

function extractKeywords(text) {
  const stopwords = new Set([
    'yang', 'dan', 'atau', 'ini', 'itu', 'dalam', 'pada', 'dengan', 'untuk',
    'dari', 'ke', 'di', 'adalah', 'merupakan', 'sebagai', 'oleh', 'akan',
    'telah', 'dapat', 'juga', 'jika', 'karena', 'agar', 'sehingga', 'tidak',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
    'should', 'may', 'might', 'can', 'could', 'of', 'in', 'to', 'for',
    'on', 'at', 'by', 'with', 'as', 'it', 'its', 'this', 'that', 'these',
    'those', 'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either',
    'also', 'not', 'no', 'from', 'into', 'through', 'during', 'including'
  ]);

  const words = text.match(/[A-Za-zÀ-ÖØ-öø-ÿ]{4,}/g) || [];
  const freq = {};
  words.forEach(w => {
    const lw = w.toLowerCase();
    if (!stopwords.has(lw)) {
      freq[w] = (freq[w] || 0) + 1;
    }
  });

  return Object.entries(freq)
    .filter(([w, c]) => c >= 2 || w[0] === w[0].toUpperCase())
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .slice(0, 40);
}

function buildQuestion_id(keyword, sentence) {
  const lower = keyword.toLowerCase();
  if (/^[A-Z]/.test(keyword) && keyword.split(' ').length >= 2) {
    return `Siapa ${keyword}?`;
  }
  if (sentence.match(/\d+/)) {
    return `Berapa ${lower}?`;
  }
  return `Jelaskan tentang ${lower}!`;
}

function buildQuestion_en(keyword, sentence) {
  if (/^[A-Z]/.test(keyword) && keyword.split(' ').length >= 2) {
    return `Who is ${keyword}?`;
  }
  if (sentence.match(/\d+/)) {
    return `How many ${keyword.toLowerCase()}?`;
  }
  return `Explain ${keyword.toLowerCase()}.`;
}

function sentenceToQuestion(sentence, lang) {
  const s = sentence.trim();

  // Look for subject at start
  const subjectMatch = s.match(/^([A-ZÀ-Ö][^,\n.]{3,30}?)\s+(?:adalah|merupakan|can|will|is|are|was|were)/);
  if (subjectMatch) {
    const subject = subjectMatch[1];
    return lang === 'id'
      ? `Apa peran ${subject.toLowerCase()} dalam konteks ini?`
      : `What is the role of ${subject}?`;
  }

  // Generic sentence to question
  const first = s.substring(0, 60).trim();
  return lang === 'id'
    ? `Apa yang dimaksud dengan: "${first}..."?`
    : `What does this describe: "${first}..."?`;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────
// SAMPLE CARDS LOADER
// ─────────────────────────────────────────────
function loadSampleCards() {
  state.flashcards = SAMPLE_FLASHCARDS.map((c, i) => ({
    id: Date.now() + i,
    question: c.question,
    answer: c.answer,
    learned: false,
    difficulty: 'medium'
  }));
  state.filtered = [...state.flashcards];
  state.currentIndex = 0;
  $('flashcardDeckTitle').textContent = 'Sample: Pengetahuan Umum';
  showFlashcardSection();
  renderCardViewer();
  renderCardGrid();
  updateStats();
}

function loadDemo() {
  loadSampleCards();
  $('flashcard-section').scrollIntoView({ behavior: 'smooth' });
  showToast('Demo flashcard dimuat!', 'success');
}
window.loadDemo = loadDemo;

// ─────────────────────────────────────────────
// LOADING SCREEN
// ─────────────────────────────────────────────
function showLoading() {
  const overlay = $('loadingOverlay');
  overlay.style.display = 'flex';
  // Reset steps
  [1, 2, 3, 4].forEach(i => {
    const step = $(`step${i}`);
    step.classList.remove('active', 'done');
  });
  $('step1').classList.add('active');
}

function hideLoading() {
  $('loadingOverlay').style.display = 'none';
}

function updateLoadingStep(step) {
  for (let i = 1; i < step; i++) {
    const el = $(`step${i}`);
    el.classList.remove('active');
    el.classList.add('done');
    el.querySelector('i').className = 'fas fa-check-circle';
  }
  const current = $(`step${step}`);
  if (current) current.classList.add('active');
}

// ─────────────────────────────────────────────
// FLASHCARD SECTION
// ─────────────────────────────────────────────
function showFlashcardSection() {
  $('flashcard-section').style.display = 'block';
}

function initFlashcardSection() {
  // Nav arrows
  $('prevCard').addEventListener('click', () => {
    if (state.currentIndex > 0) {
      state.currentIndex--;
      state.isFlipped = false;
      renderCardViewer();
    }
  });

  $('nextCard').addEventListener('click', () => {
    const cards = state.filtered;
    if (state.currentIndex < cards.length - 1) {
      state.currentIndex++;
      state.isFlipped = false;
      renderCardViewer();
    }
  });

  // Flip
  $('mainFlashcard').addEventListener('click', flipCard);
  $('flipCardBtn').addEventListener('click', flipCard);

  // Mark Learned
  $('markLearnedBtn').addEventListener('click', () => {
    const card = state.filtered[state.currentIndex];
    if (!card) return;
    const idx = state.flashcards.findIndex(c => c.id === card.id);
    if (idx !== -1) {
      state.flashcards[idx].learned = !state.flashcards[idx].learned;
      card.learned = state.flashcards[idx].learned;
    }
    renderCardViewer();
    renderCardGrid();
    updateStats();
    const txt = card.learned ? 'Ditandai sudah hafal ✓' : 'Ditandai belum hafal';
    showToast(txt, card.learned ? 'success' : 'info');
  });

  // Skip (Next)
  $('markSkipBtn').addEventListener('click', () => {
    if (state.currentIndex < state.filtered.length - 1) {
      state.currentIndex++;
      state.isFlipped = false;
      renderCardViewer();
    }
  });

  // Shuffle
  $('shuffleBtn').addEventListener('click', () => {
    state.filtered = [...state.filtered].sort(() => Math.random() - 0.5);
    state.currentIndex = 0;
    state.isFlipped = false;
    renderCardViewer();
    renderCardGrid();
    showToast('Flashcard diacak!', 'info');
  });

  // Auto Play
  $('autoPlayBtn').addEventListener('click', toggleAutoPlay);

  // Start Quiz
  $('startQuizBtn').addEventListener('click', startQuiz);

  // Study Mode
  $('studyMode').addEventListener('change', e => {
    const mode = e.target.value;
    showToast(`Mode belajar: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`, 'info');
  });
}

function flipCard() {
  state.isFlipped = !state.isFlipped;
  $('cardInner').classList.toggle('flipped', state.isFlipped);
}

function renderCardViewer() {
  const cards = state.filtered;
  if (cards.length === 0) return;

  const card = cards[state.currentIndex];
  const mode = $('studyMode').value;

  $('cardQuestion').textContent = card.question;
  $('cardAnswer').textContent = mode === 'hard' && !state.isFlipped
    ? '??? (Flip untuk lihat jawaban)'
    : card.answer;

  // Counter
  $('cardCounter').textContent = `${state.currentIndex + 1} / ${cards.length}`;

  // Learned button state
  const learnedBtn = $('markLearnedBtn');
  learnedBtn.classList.toggle('active', card.learned);
  learnedBtn.innerHTML = card.learned
    ? '<i class="fas fa-check-circle"></i> Sudah Hafal'
    : '<i class="fas fa-check"></i> Sudah Hafal';

  // Reset flip state
  $('cardInner').classList.toggle('flipped', state.isFlipped);

  // Dots
  renderDots();

  // Easy mode: auto-show answer
  if (mode === 'easy' && !state.isFlipped) {
    setTimeout(() => {
      state.isFlipped = true;
      $('cardInner').classList.add('flipped');
    }, 2000);
  }
}

function renderDots() {
  const container = $('cardDots');
  const cards = state.filtered;
  container.innerHTML = '';

  const maxDots = Math.min(cards.length, 30);
  for (let i = 0; i < maxDots; i++) {
    const dot = document.createElement('div');
    dot.className = 'card-dot';
    if (i === state.currentIndex) dot.classList.add('active');
    if (cards[i] && cards[i].learned) dot.classList.add('learned');
    dot.addEventListener('click', () => {
      state.currentIndex = i;
      state.isFlipped = false;
      renderCardViewer();
    });
    container.appendChild(dot);
  }
}

function renderCardGrid() {
  const grid = $('cardGrid');
  grid.innerHTML = '';

  state.filtered.forEach((card, idx) => {
    const div = document.createElement('div');
    div.className = `grid-card ${card.learned ? 'learned' : ''}`;
    div.innerHTML = `
      ${card.learned ? '<div class="learned-badge">✓ Hafal</div>' : ''}
      <div class="grid-card-q">
        <span>Q</span>
      </div>
      <div class="grid-card-question">${escapeHtml(card.question)}</div>
      <div class="grid-card-answer">💡 ${escapeHtml(card.answer.substring(0, 100))}${card.answer.length > 100 ? '...' : ''}</div>
      <div class="grid-card-actions">
        <button class="gc-btn gc-view" data-idx="${idx}"><i class="fas fa-eye"></i> Lihat</button>
        <button class="gc-btn gc-edit" data-idx="${idx}"><i class="fas fa-edit"></i> Edit</button>
        <button class="gc-btn gc-delete" data-idx="${idx}"><i class="fas fa-trash"></i> Hapus</button>
      </div>
    `;
    grid.appendChild(div);
  });

  // Events on grid cards
  grid.querySelectorAll('.gc-view').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx);
      state.currentIndex = idx;
      state.isFlipped = false;
      renderCardViewer();
      $('flashcard-section').scrollIntoView({ behavior: 'smooth' });
    });
  });

  grid.querySelectorAll('.gc-edit').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openEditModal(parseInt(btn.dataset.idx));
    });
  });

  grid.querySelectorAll('.gc-delete').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      deleteCard(parseInt(btn.dataset.idx));
    });
  });
}

function deleteCard(idx) {
  const card = state.filtered[idx];
  if (!card) return;
  state.flashcards = state.flashcards.filter(c => c.id !== card.id);
  state.filtered = state.filtered.filter(c => c.id !== card.id);
  if (state.currentIndex >= state.filtered.length) {
    state.currentIndex = Math.max(0, state.filtered.length - 1);
  }
  renderCardViewer();
  renderCardGrid();
  updateStats();
  showToast('Flashcard dihapus', 'info');
}

// Auto Play
function toggleAutoPlay() {
  state.isAutoPlay = !state.isAutoPlay;
  const btn = $('autoPlayBtn');

  if (state.isAutoPlay) {
    btn.innerHTML = '<i class="fas fa-pause"></i> Stop';
    btn.style.background = 'rgba(239,68,68,0.1)';
    btn.style.color = 'var(--danger)';
    btn.style.borderColor = 'rgba(239,68,68,0.3)';
    const interval = $('studyMode').value === 'easy' ? 4000 : 3000;
    state.autoPlayInterval = setInterval(() => {
      if (state.currentIndex < state.filtered.length - 1) {
        state.currentIndex++;
        state.isFlipped = false;
        renderCardViewer();
      } else {
        toggleAutoPlay(); // stop at end
        showToast('Auto-play selesai!', 'success');
      }
    }, interval);
    showToast('Auto-play dimulai', 'info');
  } else {
    btn.innerHTML = '<i class="fas fa-play"></i> Auto';
    btn.style = '';
    clearInterval(state.autoPlayInterval);
    state.autoPlayInterval = null;
  }
}

// ─────────────────────────────────────────────
// SEARCH
// ─────────────────────────────────────────────
function initSearch() {
  $('searchInput').addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      state.filtered = [...state.flashcards];
    } else {
      state.filtered = state.flashcards.filter(c =>
        c.question.toLowerCase().includes(q) ||
        c.answer.toLowerCase().includes(q)
      );
    }
    state.currentIndex = 0;
    state.isFlipped = false;
    renderCardViewer();
    renderCardGrid();
  });
}

// ─────────────────────────────────────────────
// QUIZ MODE
// ─────────────────────────────────────────────
function initQuizSection() {
  $('checkAnswerBtn').addEventListener('click', checkQuizAnswer);
  $('nextQuizBtn').addEventListener('click', nextQuizQuestion);
  $('retryQuizBtn').addEventListener('click', retryQuiz);
  $('backToCardsBtn').addEventListener('click', () => {
    $('quiz-section').style.display = 'none';
    $('flashcard-section').scrollIntoView({ behavior: 'smooth' });
  });

  // Enter key submits answer
  $('quizAnswerInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      checkQuizAnswer();
    }
  });
}

function startQuiz() {
  if (state.flashcards.length === 0) {
    showToast('Tidak ada flashcard untuk quiz!', 'warning');
    return;
  }

  $('quiz-section').style.display = 'block';
  $('quiz-section').scrollIntoView({ behavior: 'smooth' });

  // Shuffle and pick cards
  state.quizCards = [...state.flashcards]
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(state.flashcards.length, 15));

  state.quizIndex = 0;
  state.quizScore = 0;
  state.quizWrong = 0;

  $('quizCard').style.display = 'block';
  $('quizResult').style.display = 'none';

  renderQuizQuestion();
}

function renderQuizQuestion() {
  const card = state.quizCards[state.quizIndex];
  if (!card) return;

  $('quizQuestion').textContent = card.question;
  $('quizAnswerInput').value = '';
  $('quizFeedback').style.display = 'none';
  $('quizAnswerWrap').style.display = 'flex';
  $('quizAnswerInput').focus();

  // Counter
  $('quizCounter').textContent = `Soal ${state.quizIndex + 1} / ${state.quizCards.length}`;
  $('quizScore').textContent = state.quizScore;

  // Progress bar
  const pct = ((state.quizIndex) / state.quizCards.length) * 100;
  $('quizProgressFill').style.width = pct + '%';

  // Timer
  startQuizTimer();
}

function startQuizTimer() {
  clearInterval(state.quizTimer);
  state.quizTimeLeft = 30;
  updateTimerDisplay();

  state.quizTimer = setInterval(() => {
    state.quizTimeLeft--;
    updateTimerDisplay();

    if (state.quizTimeLeft <= 5) {
      $('quizTimer').parentElement.classList.add('warning');
    }

    if (state.quizTimeLeft <= 0) {
      clearInterval(state.quizTimer);
      timeOutQuestion();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const secs = String(state.quizTimeLeft).padStart(2, '0');
  $('quizTimer').textContent = `00:${secs}`;
}

function timeOutQuestion() {
  showQuizFeedback(false, true);
}

function checkQuizAnswer() {
  clearInterval(state.quizTimer);
  const userAnswer = $('quizAnswerInput').value.trim().toLowerCase();
  const correctAnswer = state.quizCards[state.quizIndex].answer.toLowerCase();

  // Similarity check (flexible matching)
  const isCorrect = isAnswerCorrect(userAnswer, correctAnswer);
  showQuizFeedback(isCorrect, false);
}

function isAnswerCorrect(user, correct) {
  if (!user) return false;
  if (user === correct) return true;

  // Normalize both
  const norm = s => s.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
  const nu = norm(user);
  const nc = norm(correct);

  if (nc.includes(nu) && nu.length > 3) return true;

  // Word overlap check
  const userWords = new Set(nu.split(' ').filter(w => w.length > 3));
  const correctWords = nc.split(' ').filter(w => w.length > 3);
  if (correctWords.length === 0) return false;
  const overlap = correctWords.filter(w => userWords.has(w)).length;
  return (overlap / correctWords.length) >= 0.5;
}

function showQuizFeedback(isCorrect, timeout) {
  if (isCorrect) {
    state.quizScore++;
  } else {
    state.quizWrong++;
  }

  state.stats.totalAnswered++;
  if (isCorrect) state.stats.totalCorrect++;

  $('quizAnswerWrap').style.display = 'none';
  $('quizFeedback').style.display = 'flex';

  const fb = $('feedbackResult');
  if (timeout) {
    fb.className = 'feedback-result wrong';
    fb.innerHTML = '<i class="fas fa-clock"></i> Waktu Habis!';
  } else if (isCorrect) {
    fb.className = 'feedback-result correct';
    fb.innerHTML = '<i class="fas fa-check-circle"></i> Benar! Bagus sekali! 🎉';
  } else {
    fb.className = 'feedback-result wrong';
    fb.innerHTML = '<i class="fas fa-times-circle"></i> Kurang tepat. Pelajari lagi!';
  }

  $('correctAnswer').textContent = state.quizCards[state.quizIndex].answer;
  $('quizScore').textContent = state.quizScore;

  $('nextQuizBtn').textContent =
    state.quizIndex < state.quizCards.length - 1
      ? 'Soal Berikutnya →'
      : 'Lihat Hasil →';
}

function nextQuizQuestion() {
  state.quizIndex++;
  if (state.quizIndex >= state.quizCards.length) {
    showQuizResult();
  } else {
    renderQuizQuestion();
  }
}

function showQuizResult() {
  clearInterval(state.quizTimer);
  $('quizCard').style.display = 'none';
  $('quizResult').style.display = 'block';

  const total = state.quizCards.length;
  const accuracy = total > 0 ? Math.round((state.quizScore / total) * 100) : 0;

  $('resultScore').textContent = state.quizScore;
  $('resultWrong').textContent = state.quizWrong;
  $('resultAccuracy').textContent = accuracy + '%';

  $('resultProgressFill').style.width = accuracy + '%';

  // Set icon/title based on score
  const icon = $('resultIcon');
  const title = $('resultTitle');
  if (accuracy >= 80) {
    icon.className = 'fas fa-trophy';
    icon.style.color = 'var(--warning)';
    title.textContent = 'Luar Biasa! 🏆';
  } else if (accuracy >= 60) {
    icon.className = 'fas fa-star';
    icon.style.color = 'var(--primary)';
    title.textContent = 'Bagus! Terus belajar! ⭐';
  } else {
    icon.className = 'fas fa-book';
    icon.style.color = 'var(--secondary)';
    title.textContent = 'Perlu lebih banyak latihan! 📚';
  }

  // Update global stats
  state.stats.totalQuizzes++;
  saveToStorage();
  updateStats();
}

function retryQuiz() {
  $('quizCard').style.display = 'block';
  $('quizResult').style.display = 'none';
  startQuiz();
}

// ─────────────────────────────────────────────
// SAVE DECK
// ─────────────────────────────────────────────
function initSaveBtn() {
  $('saveDeckBtn').addEventListener('click', saveDeck);
}

function saveDeck() {
  if (state.flashcards.length === 0) {
    showToast('Tidak ada flashcard untuk disimpan!', 'warning');
    return;
  }

  const name = $('flashcardDeckTitle').textContent || 'Deck Baru';
  const emojis = ['📚', '🎯', '⚡', '🔥', '🌟', '💡', '🧠', '📖'];
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];

  const deck = {
    id: Date.now(),
    name,
    emoji,
    cards: JSON.parse(JSON.stringify(state.flashcards)),
    created: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    learned: state.flashcards.filter(c => c.learned).length
  };

  state.savedDecks.unshift(deck);
  saveToStorage();
  renderSavedDecks();
  updateStats();
  showToast(`Deck "${name}" berhasil disimpan!`, 'success');
  $('saved-section').scrollIntoView({ behavior: 'smooth' });
}

function renderSavedDecks() {
  const grid = $('savedGrid');
  const empty = $('savedEmpty');

  if (state.savedDecks.length === 0) {
    grid.innerHTML = '';
    grid.appendChild(empty);
    return;
  }

  grid.innerHTML = '';
  state.savedDecks.forEach((deck, idx) => {
    const learnedPct = deck.cards.length > 0
      ? Math.round((deck.learned / deck.cards.length) * 100)
      : 0;

    const card = document.createElement('div');
    card.className = 'saved-deck-card';
    card.innerHTML = `
      <div class="deck-emoji">${deck.emoji}</div>
      <div class="deck-name">${escapeHtml(deck.name)}</div>
      <div class="deck-meta">
        <span><i class="fas fa-layer-group"></i> ${deck.cards.length} kartu</span>
        <span><i class="fas fa-calendar"></i> ${deck.created}</span>
      </div>
      <div class="deck-progress">
        <div class="deck-progress-fill" style="width:${learnedPct}%"></div>
      </div>
      <div class="deck-actions">
        <button class="deck-btn deck-load" data-idx="${idx}">
          <i class="fas fa-play"></i> Buka
        </button>
        <button class="deck-btn deck-rename" data-idx="${idx}">
          <i class="fas fa-edit"></i> Rename
        </button>
        <button class="deck-btn deck-delete" data-idx="${idx}">
          <i class="fas fa-trash"></i> Hapus
        </button>
      </div>
    `;
    grid.appendChild(card);
  });

  // Events
  grid.querySelectorAll('.deck-load').forEach(btn => {
    btn.addEventListener('click', () => loadDeck(parseInt(btn.dataset.idx)));
  });
  grid.querySelectorAll('.deck-rename').forEach(btn => {
    btn.addEventListener('click', () => renameDeck(parseInt(btn.dataset.idx)));
  });
  grid.querySelectorAll('.deck-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteDeck(parseInt(btn.dataset.idx)));
  });
}

function loadDeck(idx) {
  const deck = state.savedDecks[idx];
  if (!deck) return;
  state.flashcards = JSON.parse(JSON.stringify(deck.cards));
  state.filtered = [...state.flashcards];
  state.currentIndex = 0;
  state.isFlipped = false;
  $('flashcardDeckTitle').textContent = deck.name;
  showFlashcardSection();
  renderCardViewer();
  renderCardGrid();
  updateStats();
  showToast(`Deck "${deck.name}" dibuka!`, 'success');
  $('flashcard-section').scrollIntoView({ behavior: 'smooth' });
}

function renameDeck(idx) {
  const deck = state.savedDecks[idx];
  const newName = prompt('Nama deck baru:', deck.name);
  if (newName && newName.trim()) {
    state.savedDecks[idx].name = newName.trim();
    saveToStorage();
    renderSavedDecks();
    showToast('Deck berhasil direname!', 'success');
  }
}

function deleteDeck(idx) {
  const deck = state.savedDecks[idx];
  if (confirm(`Hapus deck "${deck.name}"?`)) {
    state.savedDecks.splice(idx, 1);
    saveToStorage();
    renderSavedDecks();
    updateStats();
    showToast('Deck dihapus', 'info');
  }
}

// ─────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────
function initExportButtons() {
  $('exportTxtBtn').addEventListener('click', exportTxt);
  $('exportJsonBtn').addEventListener('click', exportJson);
  $('exportPdfBtn').addEventListener('click', exportPdf);
}

function exportTxt() {
  if (state.flashcards.length === 0) {
    showToast('Tidak ada flashcard untuk diekspor!', 'warning');
    return;
  }
  const lines = state.flashcards.map((c, i) =>
    `[${i + 1}]\nQ: ${c.question}\nA: ${c.answer}`
  ).join('\n\n');
  downloadFile('flashmind-export.txt', lines, 'text/plain');
  showToast('Diekspor sebagai TXT!', 'success');
}

function exportJson() {
  if (state.flashcards.length === 0) {
    showToast('Tidak ada flashcard untuk diekspor!', 'warning');
    return;
  }
  const data = {
    deck: $('flashcardDeckTitle').textContent,
    generated: new Date().toISOString(),
    total: state.flashcards.length,
    cards: state.flashcards.map(c => ({ question: c.question, answer: c.answer }))
  };
  downloadFile('flashmind-export.json', JSON.stringify(data, null, 2), 'application/json');
  showToast('Diekspor sebagai JSON!', 'success');
}

function exportPdf() {
  if (state.flashcards.length === 0) {
    showToast('Tidak ada flashcard untuk diekspor!', 'warning');
    return;
  }

  const title = $('flashcardDeckTitle').textContent;
  const date = new Date().toLocaleDateString('id-ID');

  let html = `
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title} - FlashMind</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #0f172a; }
        h1 { color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 12px; }
        .meta { color: #94a3b8; font-size: 13px; margin-bottom: 32px; }
        .card { border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin: 16px 0; page-break-inside: avoid; }
        .card-num { font-size: 11px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 1px; }
        .q { font-size: 15px; font-weight: 700; color: #1e293b; margin: 8px 0; }
        .a { font-size: 14px; color: #475569; }
        .a::before { content: '💡 '; }
      </style>
    </head>
    <body>
      <h1>⚡ FlashMind – ${title}</h1>
      <div class="meta">Dibuat pada ${date} • ${state.flashcards.length} flashcard</div>
  `;

  state.flashcards.forEach((c, i) => {
    html += `
      <div class="card">
        <div class="card-num">Kartu ${i + 1}</div>
        <div class="q">❓ ${escapeHtml(c.question)}</div>
        <div class="a">${escapeHtml(c.answer)}</div>
      </div>
    `;
  });

  html += '</body></html>';

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
  showToast('Membuka dialog print PDF...', 'info');
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────
// EDIT MODAL
// ─────────────────────────────────────────────
function initEditModal() {
  $('closeEditModal').addEventListener('click', closeEditModal);
  $('cancelEditBtn').addEventListener('click', closeEditModal);
  $('saveEditBtn').addEventListener('click', saveEdit);

  $('editModal').addEventListener('click', e => {
    if (e.target === $('editModal')) closeEditModal();
  });
}

function openEditModal(idx) {
  const card = state.filtered[idx];
  if (!card) return;
  state.editingIndex = idx;
  $('editQuestion').value = card.question;
  $('editAnswer').value = card.answer;
  $('editModal').style.display = 'flex';
}

function closeEditModal() {
  $('editModal').style.display = 'none';
  state.editingIndex = null;
}

function saveEdit() {
  const idx = state.editingIndex;
  if (idx === null) return;

  const q = $('editQuestion').value.trim();
  const a = $('editAnswer').value.trim();

  if (!q || !a) {
    showToast('Pertanyaan dan jawaban tidak boleh kosong!', 'warning');
    return;
  }

  const card = state.filtered[idx];
  const mainIdx = state.flashcards.findIndex(c => c.id === card.id);

  if (mainIdx !== -1) {
    state.flashcards[mainIdx].question = q;
    state.flashcards[mainIdx].answer = a;
    state.filtered[idx].question = q;
    state.filtered[idx].answer = a;
  }

  closeEditModal();
  renderCardViewer();
  renderCardGrid();
  showToast('Flashcard berhasil diedit!', 'success');
}

// ─────────────────────────────────────────────
// STATISTICS
// ─────────────────────────────────────────────
function updateStats() {
  const total = state.flashcards.length;
  const learned = state.flashcards.filter(c => c.learned).length;
  const pending = total - learned;
  const learnedPct = total > 0 ? Math.round((learned / total) * 100) : 0;

  const accuracy = state.stats.totalAnswered > 0
    ? Math.round((state.stats.totalCorrect / state.stats.totalAnswered) * 100)
    : 0;

  const savedCount = state.savedDecks.length;
  const maxDecks = 20;
  const savedPct = Math.min(Math.round((savedCount / maxDecks) * 100), 100);

  // Update DOM
  $('statTotal').textContent = total;
  $('statLearned').textContent = learned;
  $('statPending').textContent = pending;
  $('statAccuracy').textContent = accuracy + '%';

  $('progressBar').style.width = learnedPct + '%';
  $('progressPercent').textContent = learnedPct + '%';

  $('quizAccuracyBar').style.width = accuracy + '%';
  $('quizAccuracyPercent').textContent = accuracy + '%';

  $('savedDecksBar').style.width = savedPct + '%';
  $('savedDecksCount').textContent = savedCount + ' deck';

  $('heroTotalCards').textContent = total || state.savedDecks.reduce((a, d) => a + d.cards.length, 0) || 24;
}

// ─────────────────────────────────────────────
// TOAST NOTIFICATIONS
// ─────────────────────────────────────────────
function showToast(message, type = 'info') {
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas ${icons[type] || icons.info} toast-icon"></i>
    <span>${message}</span>
  `;

  $('toastContainer').appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ─────────────────────────────────────────────
// SCROLL ANIMATIONS
// ─────────────────────────────────────────────
function initScrollAnimations() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  $$('.glass-card, .stat-card, .section-header').forEach(el => {
    el.classList.add('fade-in');
    observer.observe(el);
  });
}

// ─────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
