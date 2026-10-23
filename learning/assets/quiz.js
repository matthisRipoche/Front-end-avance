// Quiz à retour immédiat. Balisage attendu :
// <div class="quiz" data-explain="Pourquoi la bonne réponse est bonne.">
//   <p class="quiz__q">Question</p>
//   <button data-correct>Réponse juste</button><button>Réponse fausse</button>…
//   <p class="quiz__feedback" aria-live="polite"></p>
// </div>
document.querySelectorAll('.quiz').forEach((quiz) => {
  const feedback = quiz.querySelector('.quiz__feedback');
  quiz.querySelectorAll('button').forEach((button) => {
    button.type = 'button';
    button.addEventListener('click', () => {
      const ok = button.hasAttribute('data-correct');
      quiz.querySelectorAll('button').forEach((b) => b.classList.remove('is-ok', 'is-ko'));
      button.classList.add(ok ? 'is-ok' : 'is-ko');
      feedback.textContent = ok ? 'Juste. ' + (quiz.dataset.explain || '') : 'Pas tout à fait : essaie encore.';
    });
  });
});
