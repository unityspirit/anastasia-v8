/**
 * АНАСТАСИЯ ЕМЕЛЬЯНОВА — ВЕРСИЯ 8 (CINEMATIC SCROLL ENGINE V5 + EDITORIAL)
 */

// ==========================================
// 1. ДВИЖОК СКРОЛЛ-ВИДЕО ИЗ V5
// ==========================================
const TOTAL_FRAMES = 280;
const LERP = 0.04;
const CONCURRENCY = 24;

const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent) || window.innerWidth < 768;
const FRAME_DIR = isMobile ? 'frames-mobile' : 'frames-webp';
const MOBILE_TOTAL = 286;
const ACTUAL_FRAMES = isMobile ? MOBILE_TOTAL : TOTAL_FRAMES;

const canvas = document.getElementById('gl-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let canvasDpr = 1;

function resizeCanvas() {
  if (!canvas || !ctx) return;
  canvasDpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
  canvas.width = window.innerWidth * canvasDpr;
  canvas.height = window.innerHeight * canvasDpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(canvasDpr, 0, 0, canvasDpr, 0, 0);
  if (isReady && frames[Math.round(currentFrame)]) {
    drawFrame(Math.round(currentFrame));
  }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const frames = new Array(ACTUAL_FRAMES);
let loadedCount = 0;
let isReady = false;

function frameName(i) {
  return `${FRAME_DIR}/frame_${String(i + 1).padStart(6, '0')}.webp?v=1`;
}

async function loadAllFrames() {
  const queue = Array.from({ length: ACTUAL_FRAMES }, (_, i) => i);

  async function worker() {
    while (queue.length) {
      const i = queue.shift();
      await new Promise(resolve => {
        const img = new Image();
        img.onload = img.onerror = () => {
          frames[i] = img;
          loadedCount++;

          const pct = Math.round((loadedCount / ACTUAL_FRAMES) * 100);
          const bar = document.getElementById('progress-bar');
          if (bar) bar.style.width = pct + '%';

          if (loadedCount === 1) {
            isReady = true;
            startAnimationLoop();
          }

          if (loadedCount === ACTUAL_FRAMES) {
            const loader = document.getElementById('loader');
            if (loader) {
              loader.style.opacity = '0';
              setTimeout(() => { loader.style.display = 'none'; }, 700);
            }
          }
          resolve();
        };
        img.src = frameName(i);
      });
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}

let currentFrame = 0;
let targetFrame = 0;

window.addEventListener('scroll', () => {
  if (!isReady) return;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  targetFrame = progress * (ACTUAL_FRAMES - 1);
}, { passive: true });

function drawFrame(idx) {
  if (!ctx) return;
  const img = frames[Math.max(0, Math.min(idx, ACTUAL_FRAMES - 1))];
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const W = window.innerWidth;
  const H = window.innerHeight;

  const r = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const iw = img.naturalWidth * r;
  const ih = img.naturalHeight * r;
  const x = (W - iw) / 2;
  const y = (H - ih) / 2;

  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img, x, y, iw, ih);

  // Теплая люксовая виньетка
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.9);
  vig.addColorStop(0, 'rgba(247, 243, 236, 0.10)');
  vig.addColorStop(1, 'rgba(239, 233, 222, 0.55)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

function startAnimationLoop() {
  function loop() {
    requestAnimationFrame(loop);
    currentFrame += (targetFrame - currentFrame) * LERP;
    if (isReady) {
      drawFrame(Math.round(currentFrame));
    }
  }
  loop();
}

// Intersection Observer для плавного появления секций
const pages = Array.from(document.querySelectorAll('.page'));
const navLinks = Array.from(document.querySelectorAll('.nav-link'));

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const idx = pages.indexOf(entry.target);
      pages.forEach((p, i) => p.classList.toggle('is-active', i === idx));

      const currentId = entry.target.getAttribute('id');
      navLinks.forEach(link => {
        const href = link.getAttribute('href');
        link.classList.toggle('active', href === `#${currentId}`);
      });
    }
  });
}, { rootMargin: '-20% 0px -20% 0px' });

pages.forEach(p => observer.observe(p));


// ==========================================
// 2. FAQ АККОРДЕОН
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

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

  // Закрытие модалок
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeBookingModal();
      closePaymentModal();
    }
  });

  const bookingModal = document.getElementById('bookingModal');
  if (bookingModal) {
    bookingModal.addEventListener('click', (e) => {
      if (e.target === bookingModal) closeBookingModal();
    });
  }

  const paymentModal = document.getElementById('paymentModal');
  if (paymentModal) {
    paymentModal.addEventListener('click', (e) => {
      if (e.target === paymentModal) closePaymentModal();
    });
  }
});


// ==========================================
// 3. МОДАЛКА 1: ЗАПИСЬ НА ДИАГНОСТИКУ / ФОРМАТЫ
// ==========================================
function openBookingModal(targetName = 'Бесплатная диагностика') {
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
}

function closeBookingModal() {
  const modal = document.getElementById('bookingModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function handleBookingSubmit(e) {
  e.preventDefault();

  const target = document.getElementById('bookingTarget').value;
  const name = document.getElementById('bookingName').value.trim();
  const contact = document.getElementById('bookingContact').value.trim();
  const goal = document.getElementById('bookingGoal').value.trim();

  let tgMessage = `Привет! Меня зовут ${name}.\nХочу записаться: ${target}.\nМой контакт: ${contact}`;
  if (goal) tgMessage += `\nЦель: ${goal}`;

  const tgUrl = `https://t.me/Emel_Anas?text=${encodeURIComponent(tgMessage)}`;

  const form = document.getElementById('bookingForm');
  const success = document.getElementById('bookingSuccess');
  if (form) form.classList.add('hidden');
  if (success) success.classList.remove('hidden');

  setTimeout(() => {
    window.open(tgUrl, '_blank');
    closeBookingModal();
  }, 700);
}


// ==========================================
// 4. МОДАЛКА 2: ОПЛАТА 3 ТРЕНИРОВОК (999 ₽)
// ==========================================
function openPaymentModal() {
  const modal = document.getElementById('paymentModal');
  const form = document.getElementById('paymentForm');
  const success = document.getElementById('paymentSuccess');

  if (form) form.classList.remove('hidden');
  if (success) success.classList.add('hidden');

  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closePaymentModal() {
  const modal = document.getElementById('paymentModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function handlePaymentSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('payName').value.trim();
  const email = document.getElementById('payEmail').value.trim();
  const contact = document.getElementById('payTelegram').value.trim();

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
}

// Запуск загрузки кадров
loadAllFrames();
