/**
 * АНАСТАСИЯ ЕМЕЛЬЯНОВА — ВЕРСИЯ 8
 * ДВИЖОК: GLOBAL-PLUS ADAPTIVE LOADER & SCROLL CANVAS
 */
'use strict';

const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent) || window.innerWidth < 768;
const FRAME_DIR = isMobile ? 'frames-mobile' : 'frames-webp';
const TOTAL_FRAMES = isMobile ? 286 : 280;
const LERP = 0.08;
const CONCURRENCY = 48;

/* ── DOM REFS ── */
const loader = document.getElementById('loader');
const loaderFill = document.getElementById('loaderFill');
const loaderPct = document.getElementById('loaderPct');
const pages = Array.from(document.querySelectorAll('.page'));
const navLinks = Array.from(document.querySelectorAll('.nav-link'));
const canvas = document.getElementById('scrollCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

/* ── STATE ── */
let targetFrame = 0;
let currentFrame = 0;
let isReady = false;
const frames = new Array(TOTAL_FRAMES);

/* ── CANVAS RESIZE & COVER FIT ── */
function resize() {
  if (!canvas || !ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (isReady) drawFrame(Math.round(currentFrame));
}
window.addEventListener('resize', resize);

/* ── FRAME LOADER WITH DECODE ── */
function padNum(n) {
  return String(n).padStart(6, '0');
}

function loadFrame(index) {
  return new Promise(resolve => {
    if (frames[index]) return resolve();
    const img = new Image();
    img.onload = () => {
      if (img.decode) {
        img.decode()
          .then(() => { frames[index] = img; resolve(); })
          .catch(() => { frames[index] = img; resolve(); });
      } else {
        frames[index] = img;
        resolve();
      }
    };
    img.onerror = () => resolve();
    img.src = `${FRAME_DIR}/frame_${padNum(index + 1)}.webp`;
  });
}

async function loadAllFrames() {
  let loaded = 0;
  const queue = Array.from({ length: TOTAL_FRAMES }, (_, i) => i);
  async function worker() {
    while (queue.length > 0) {
      const idx = queue.shift();
      if (idx === undefined) return;
      await loadFrame(idx);
      loaded++;
      const pct = Math.floor((loaded / TOTAL_FRAMES) * 100);
      if (loaderFill) loaderFill.style.width = pct + '%';
      if (loaderPct) loaderPct.textContent = pct + '%';
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
}

/* ── DRAW FRAME (COVER FIT) ── */
function drawFrame(idx) {
  if (!ctx || !canvas) return;
  idx = Math.max(0, Math.min(TOTAL_FRAMES - 1, idx));
  const img = frames[idx];
  if (!img) return;

  const cw = window.innerWidth;
  const ch = window.innerHeight;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;

  const scale = Math.max(cw / iw, ch / ih);
  const sw = iw * scale;
  const sh = ih * scale;
  const sx = (cw - sw) / 2;
  const sy = (ch - sh) / 2;

  ctx.clearRect(0, 0, cw, ch);
  ctx.drawImage(img, sx, sy, sw, sh);
}

/* ── NATIVE SCROLL TO FRAME MAPPING ── */
window.addEventListener('scroll', () => {
  if (!isReady) return;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  targetFrame = progress * (TOTAL_FRAMES - 1);
}, { passive: true });

/* ── RENDER LOOP ── */
function animate() {
  requestAnimationFrame(animate);
  currentFrame += (targetFrame - currentFrame) * LERP;
  if (isReady) drawFrame(Math.round(currentFrame));
}
requestAnimationFrame(animate);

/* ── INIT WITH ADAPTIVE PRELOADER ── */
(async function init() {
  resize();

  // 1. Быстро загружаем первый кадр (в течение ~50мс), чтобы фон уже был виден
  await loadFrame(0);
  isReady = true;
  drawFrame(0);

  let loaderDismissed = false;
  function hideLoader() {
    if (loaderDismissed) return;
    loaderDismissed = true;
    if (loaderFill) loaderFill.style.width = '100%';
    if (loaderPct) loaderPct.textContent = '100%';
    setTimeout(() => {
      if (loader) loader.classList.add('hidden');
      if (pages.length > 0) pages[0].classList.add('is-active');
    }, 250);
  }

  // Адаптивная страховка: лоадер гарантированно уходит максимум за 1.3 секунды,
  // фоновая подгрузка кадров продолжается в фоне через 48 потоков
  const fallbackTimer = setTimeout(hideLoader, 1300);

  try {
    await loadAllFrames();
    clearTimeout(fallbackTimer);
    hideLoader();
  } catch (e) {
    console.warn('Frame preloading notice:', e);
    hideLoader();
  }
})();

/* ── INTERSECTION OBSERVER FOR ACTIVE SECTIONS ── */
let lastIdx = -1;
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-active');
      const idx = pages.indexOf(entry.target);
      if (idx !== -1 && idx !== lastIdx) {
        lastIdx = idx;
        const currentId = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          const href = link.getAttribute('href');
          link.classList.toggle('active', href === `#${currentId}`);
        });
      }
    }
  });
}, { root: null, rootMargin: '-20% 0px -20% 0px' });

pages.forEach(p => observer.observe(p));

/* ── FAQ ACCORDION ── */
document.addEventListener('DOMContentLoaded', () => {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    if (!questionBtn || !answer) return;

    questionBtn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      faqItems.forEach(otherItem => {
        otherItem.classList.remove('active');
        const otherAnswer = otherItem.querySelector('.faq-answer');
        if (otherAnswer) otherAnswer.classList.add('hidden');
      });

      if (!isActive) {
        item.classList.add('active');
        answer.classList.remove('hidden');
      } else {
        item.classList.remove('active');
        answer.classList.add('hidden');
      }
    });
  });

  // Мобильное меню
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
    document.querySelectorAll('.mobile-link').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
      });
    });
  }
});

/* ── MODAL 1: BOOKING / CONSULTATION ── */
window.openBookingModal = function(targetName = 'Бесплатная диагностика') {
  const modal = document.getElementById('bookingModal');
  const targetInput = document.getElementById('bookingTarget');
  const form = document.getElementById('bookingForm');
  const success = document.getElementById('bookingSuccess');

  if (targetInput) targetInput.value = targetName;
  if (form) form.classList.remove('hidden');
  if (success) success.classList.add('hidden');

  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
};

window.closeBookingModal = function() {
  const modal = document.getElementById('bookingModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
};

window.handleBookingSubmit = function(e) {
  e.preventDefault();
  const target = document.getElementById('bookingTarget')?.value || 'Консультация';
  const name = document.getElementById('bookingName')?.value.trim() || '';
  const contact = document.getElementById('bookingContact')?.value.trim() || '';
  const goal = document.getElementById('bookingGoal')?.value.trim() || '';

  let tgMessage = `Привет! Меня зовут ${name}.\nХочу записаться: ${target}.\nМой контакт: ${contact}`;
  if (goal) tgMessage += `\nЦель: ${goal}`;

  const tgUrl = `https://t.me/Emel_Anas?text=${encodeURIComponent(tgMessage)}`;

  const form = document.getElementById('bookingForm');
  const success = document.getElementById('bookingSuccess');
  if (form) form.classList.add('hidden');
  if (success) success.classList.remove('hidden');

  setTimeout(() => {
    window.open(tgUrl, '_blank');
    window.closeBookingModal();
  }, 700);
};

/* ── MODAL 2: 3 WORKOUTS PAYMENT (999 ₽) ── */
window.openPaymentModal = function() {
  const modal = document.getElementById('paymentModal');
  const form = document.getElementById('paymentForm');
  const success = document.getElementById('paymentSuccess');

  if (form) form.classList.remove('hidden');
  if (success) success.classList.add('hidden');

  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
};

window.closePaymentModal = function() {
  const modal = document.getElementById('paymentModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
};

window.handlePaymentSubmit = function(e) {
  e.preventDefault();
  const name = document.getElementById('payName')?.value.trim() || '';
  const email = document.getElementById('payEmail')?.value.trim() || '';
  const contact = document.getElementById('payTelegram')?.value.trim() || '';

  const confirmedEmail = document.getElementById('confirmedEmail');
  if (confirmedEmail) confirmedEmail.textContent = email;

  const tgText = `Привет! Я оплачиваю 3 тренировки за 999 руб.\nМоё имя: ${name}\nEmail для записей: ${email}\nКонтакт: ${contact}`;
  const directPayBtn = document.getElementById('directPayBtn');
  if (directPayBtn) {
    directPayBtn.href = `https://t.me/Emel_Anas?text=${encodeURIComponent(tgText)}`;
  }

  const form = document.getElementById('paymentForm');
  const success = document.getElementById('paymentSuccess');
  if (form) form.classList.add('hidden');
  if (success) success.classList.remove('hidden');
};

/* ── MODAL EVENTS ── */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.closeBookingModal();
    window.closePaymentModal();
  }
});

const bookingModal = document.getElementById('bookingModal');
if (bookingModal) {
  bookingModal.addEventListener('click', (e) => {
    if (e.target === bookingModal) window.closeBookingModal();
  });
}

const paymentModal = document.getElementById('paymentModal');
if (paymentModal) {
  paymentModal.addEventListener('click', (e) => {
    if (e.target === paymentModal) window.closePaymentModal();
  });
}
