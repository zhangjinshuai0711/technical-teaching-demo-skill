'use strict';

const form = document.getElementById('experiment');
const weight = document.getElementById('weight');
const scoreA = document.getElementById('score-a');
const scoreB = document.getElementById('score-b');

function render() {
  const w = Number(weight.value) / 100;
  const a = Number(scoreA.value);
  const b = Number(scoreB.value);
  const partA = w * a;
  const partB = (1 - w) * b;
  const score = partA + partB;
  document.getElementById('weight-value').textContent = `${weight.value}%`;
  document.getElementById('a-value').textContent = scoreA.value;
  document.getElementById('b-value').textContent = scoreB.value;
  document.getElementById('score').textContent = score.toFixed(1);
  document.getElementById('working').textContent = `${w.toFixed(2)} × ${a} + ${(1 - w).toFixed(2)} × ${b} = ${score.toFixed(1)}`;
  document.getElementById('contribution-a').textContent = partA.toFixed(1);
  document.getElementById('contribution-b').textContent = partB.toFixed(1);
  document.getElementById('part-a').style.width = `${partA}%`;
  document.getElementById('part-b').style.width = `${partB}%`;
}

form.addEventListener('input', render);
form.addEventListener('reset', () => {
  // The reset event fires before the browser restores the inputs' default values.
  requestAnimationFrame(render);
});
render();
