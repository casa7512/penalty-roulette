'use strict';
const defaults = ['애교 3종 세트', '노래 한 소절 부르기', '웃긴 셀카 찍기', '옆 사람 칭찬하기', '댄스 10초 추기', '다음 간식 사기', '성대모사 도전', '행운의 벌칙 면제'];
const colors = ['#c5a4ff', '#fa9fbd', '#ffd184', '#99ddd1', '#a2baff', '#dfaaed', '#ffb69b', '#b9dc96'];
const storageKey = 'party-roulette-penalties-v1';
let penalties = [...defaults];
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (Array.isArray(saved) && saved.length === 8 && saved.every(value => typeof value === 'string' && value.length <= 24)) penalties = saved;
} catch { /* Storage may be disabled; the roulette still works in memory. */ }
const canvas = document.querySelector('#wheel');
const ctx = canvas.getContext('2d');
const spinButton = document.querySelector('#spin');
const resetButton = document.querySelector('#reset');
const result = document.querySelector('#result');
const resultText = document.querySelector('#result-text');
const resultCaption = document.querySelector('#result-caption');
const inputs = [];
let rotation = 0;
let spinning = false;
const tau = Math.PI * 2;
const slice = tau / 8;
function label(index) { return penalties[index].trim() || `벌칙 ${index + 1}`; }
function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(penalties));
    document.querySelector('#save-status').textContent = '이 기기에 자동으로 저장돼요';
  } catch {
    document.querySelector('#save-status').textContent = '저장 불가 · 현재 화면에서만 유지돼요';
  }
}
function draw() {
  const size = canvas.width;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate(rotation);
  for (let i = 0; i < 8; i++) {
    const start = -Math.PI / 2 - slice / 2 + i * slice;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, size / 2, start, start + slice); ctx.closePath();
    ctx.fillStyle = colors[i]; ctx.fill(); ctx.strokeStyle = '#ffffff55'; ctx.lineWidth = 3; ctx.stroke();
    ctx.save(); ctx.rotate(start + slice / 2);
    ctx.fillStyle = '#392944'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 29px system-ui, sans-serif';
    // Wrap long Korean labels into up to three lines without modifying the prize.
    const chars = Array.from(label(i));
    const lines = [];
    while (chars.length) lines.push(chars.splice(0, 8).join(''));
    lines.forEach((line, row) => ctx.fillText(line, size * .32, (row - (lines.length - 1) / 2) * 36, size * .29));
    ctx.restore();
  }
  ctx.restore();
}
function clearResult() {
  result.classList.remove('winner'); resultCaption.textContent = '오늘의 벌칙은?'; resultText.textContent = '버튼을 눌러 운명을 확인하세요';
}
penalties.forEach((value, index) => {
  const row = document.createElement('label'); row.className = 'penalty-row';
  const number = document.createElement('span'); number.className = 'number'; number.style.background = colors[index]; number.textContent = String(index + 1).padStart(2, '0');
  const input = document.createElement('input'); input.type = 'text'; input.maxLength = 24; input.value = value; input.placeholder = `벌칙 ${index + 1}`; input.setAttribute('aria-label', `${index + 1}번 벌칙`);
  input.addEventListener('input', () => { penalties[index] = input.value; save(); clearResult(); draw(); });
  inputs.push(input); row.append(number, input); document.querySelector('#penalty-list').append(row);
});
resetButton.addEventListener('click', () => {
  if (spinning) return;
  penalties = [...defaults]; inputs.forEach((input, i) => { input.value = penalties[i]; }); save(); clearResult(); draw();
});
function randomIndex() {
  // 2^32 is divisible by 8, so modulo gives every outcome equal probability.
  const values = new Uint32Array(1); crypto.getRandomValues(values); return values[0] % 8;
}
function celebrate() {
  const container = document.querySelector('#confetti'); container.replaceChildren();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < 65; i++) {
    const piece = document.createElement('i'); piece.className = 'confetti-piece'; piece.style.left = `${Math.random() * 100}%`; piece.style.background = colors[i % 8]; piece.style.setProperty('--drift', `${(Math.random() - .5) * 240}px`); piece.style.animationDelay = `${Math.random() * .5}s`; container.append(piece);
  }
  setTimeout(() => container.replaceChildren(), 3500);
}
spinButton.addEventListener('click', () => {
  if (spinning) return;
  spinning = true; spinButton.disabled = true; resetButton.disabled = true; inputs.forEach(input => { input.disabled = true; });
  spinButton.textContent = '운명을 고르는 중…'; result.classList.remove('winner'); resultCaption.textContent = '두근두근…'; resultText.textContent = '어떤 벌칙이 기다리고 있을까요?';
  const selected = randomIndex();
  const start = rotation;
  const normalized = ((start % tau) + tau) % tau;
  const target = ((-selected * slice) % tau + tau) % tau;
  const end = start + tau * 6 + ((target - normalized + tau) % tau);
  const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 200 : 4800;
  let started;
  function frame(now) {
    if (started === undefined) started = now;
    const progress = Math.min((now - started) / duration, 1);
    rotation = start + (end - start) * (1 - Math.pow(1 - progress, 4)); draw();
    if (progress < 1) { requestAnimationFrame(frame); return; }
    rotation = target; draw(); spinning = false;
    resultCaption.textContent = `${selected + 1}번 당첨! 오늘의 벌칙은`; resultText.textContent = label(selected); result.classList.add('winner');
    spinButton.innerHTML = '<span aria-hidden="true">↻</span> 한 번 더 돌리기 <span aria-hidden="true">→</span>';
    spinButton.disabled = false; resetButton.disabled = false; inputs.forEach(input => { input.disabled = false; }); celebrate();
  }
  requestAnimationFrame(frame);
});
draw();
