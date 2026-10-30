/**
 * АНАСТАСИЯ ЕМЕЛЬЯНОВА — ВЕРСИЯ 8
 * КИНЕМАТОГРАФИЧЕСКИЙ СКРОЛЛ-ФОН (390 КАДРОВ) + РЕДАКЦИОННЫЙ ДИЗАЙН И ФУНКЦИОНАЛ
 */

// ==========================================
// 1. ДВИЖОК КИНЕМАТОГРАФИЧЕСКОГО СКРОЛЛ-ФОНА
// ==========================================
const ACTUAL_FRAMES = 390;
const FRAME_DIR = 'frames-mobile';
const LERP = 0.05;
const CONCURRENCY = 16;

const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent) || window.innerWidth < 768;
const canvas = document.getElementById('gl-canvas');
const ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;
let canvasDpr = 1;

function resizeCanvas() {
  if (!canvas || !ctx) return;
  canvasDpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
  canvas.width = Math.floor(window.innerWidth * canvasDpr);
  canvas.height = Math.floor(window.innerHeight * canvasDpr);
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
let currentFrame = 0;
let targetFrame = 0;

function frameName(i) {
  return `${FRAME_DIR}/frame_${String(i + 1).padStart(6, '0')}.webp`;
}

function drawFrame(idx) {
  if (!ctx) return;
  const safeIdx = Math.max(0, Math.min(idx, ACTUAL_FRAMES - 1));
  const img = frames[safeIdx];
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const W = window.innerWidth;
  const H = window.innerHeight;

  const r = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const iw = img.naturalWidth * r;
  const ih = img.naturalHeight * r;
  const x = (W - iw) / 2;
  const y = (H - ih) / 2;

  ctx.drawImage(img, x, y, iw, ih);

  // Мягкая кинематографическая виньетка
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.95);
  vig.addColorStop(0, 'rgba(247, 243, 236, 0.08)');
  vig.addColorStop(1, 'rgba(235, 228, 218, 0.45)');
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

window.addEventListener('scroll', () => {
  if (!isReady) return;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  targetFrame = progress * (ACTUAL_FRAMES - 1);
}, { passive: true });

async function loadAllFrames() {
  // Загружаем первый кадр приоритетно для мгновенного отображения фона
  const firstImg = new Image();
  firstImg.onload = () => {
    frames[0] = firstImg;
    loadedCount++;
    isReady = true;
    startAnimationLoop();
    drawFrame(0);
  };
  firstImg.src = frameName(0);

  // Параллельная догрузка остальных кадров
  const queue = Array.from({ length: ACTUAL_FRAMES - 1 }, (_, i) => i + 1);

  async function worker() {
    while (queue.length) {
      const i = queue.shift();
      await new Promise(resolve => {
        const img = new Image();
        img.onload = img.onerror = () => {
          frames[i] = img;
          loadedCount++;

          const pct = Math.round((loadedCount / ACTUAL_FRAMES) * 100);
          const bar = document.getElementById('video-progress');
          if (bar) {
            bar.style.width = pct + '%';
            if (pct >= 100) {
              setTimeout(() => { bar.style.opacity = '0'; }, 500);
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

loadAllFrames();


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

  // ==========================================
  // 3. МОБИЛЬНОЕ МЕНЮ
  // ==========================================
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileLinks = document.querySelectorAll('.mobile-link');

  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });

    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
      });
    });
  }

  // Закрытие модалок по клавише Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeBookingModal();
      closePaymentModal();
    }
  });

  // Закрытие по клику вне модальной карточки
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
// 4. МОДАЛКА 1: ЗАПИСЬ НА ДИАГНОСТИКУ / ФОРМАТЫ
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

  // Сохраняем лид в localStorage
  const leadData = {
    target,
    name,
    contact,
    goal,
    date: new Date().toISOString()
  };

  const existingLeads = JSON.parse(localStorage.getItem('nastya_leads') || '[]');
  existingLeads.push(leadData);
  localStorage.setItem('nastya_leads', JSON.stringify(existingLeads));

  // Формируем текст для быстрой отправки в Telegram
  let tgMessage = `Привет! Меня зовут ${name}.\nХочу записаться: ${target}.\nМой контакт: ${contact}`;
  if (goal) tgMessage += `\nЦель: ${goal}`;

  const tgUrl = `https://t.me/Emel_Anas?text=${encodeURIComponent(tgMessage)}`;

  // Показываем состояние успеха
  const form = document.getElementById('bookingForm');
  const success = document.getElementById('bookingSuccess');
  if (form) form.classList.add('hidden');
  if (success) success.classList.remove('hidden');

  // Предлагаем сразу перейти в TG для мгновенного ответа
  setTimeout(() => {
    const shouldRedirect = confirm(`Спасибо, ${name}! Заявка сохранена. Хотите сразу открыть диалог с Анастасией в Telegram?`);
    if (shouldRedirect) {
      window.open(tgUrl, '_blank');
      closeBookingModal();
    }
  }, 600);
}


// ==========================================
// 5. МОДАЛКА 2: ОПЛАТА 3 ТРЕНИРОВОК (999 ₽)
// ==========================================
window.PAYMENT_CONFIG = {
  price: 999,
  currency: 'RUB',
  productName: 'Комплект из 3-х тренировок (верх, низ, фуллбоди)',
  paymentUrl: ''
};

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

  // Сохраняем заказ в localStorage
  const orderData = {
    product: '3 тренировки (верх, низ, фуллбоди)',
    amount: 999,
    name,
    email,
    contact,
    date: new Date().toISOString()
  };

  const existingOrders = JSON.parse(localStorage.getItem('nastya_orders') || '[]');
  existingOrders.push(orderData);
  localStorage.setItem('nastya_orders', JSON.stringify(existingOrders));

  // Обновляем email в блоке подтверждения
  const confirmedEmail = document.getElementById('confirmedEmail');
  if (confirmedEmail) confirmedEmail.textContent = email;

  // Формируем прямую ссылку для Telegram
  const tgText = `Привет! Я оплачиваю 3 тренировки за 999 руб.\nМоё имя: ${name}\nМой Email для записей: ${email}\nКонтакт: ${contact}`;
  const directPayBtn = document.getElementById('directPayBtn');
  if (directPayBtn) {
    directPayBtn.href = `https://t.me/Emel_Anas?text=${encodeURIComponent(tgText)}`;
  }

  // Переключаем в состояние подтверждения
  const form = document.getElementById('paymentForm');
  const success = document.getElementById('paymentSuccess');
  if (form) form.classList.add('hidden');
  if (success) success.classList.remove('hidden');

  if (window.PAYMENT_CONFIG.paymentUrl) {
    setTimeout(() => {
      window.location.href = window.PAYMENT_CONFIG.paymentUrl;
    }, 1200);
  }
}
