'use strict';

(() => {
  const normalizeText = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();

  const setCurrentYear = () => {
    const year = document.getElementById('anoAtual');
    if (year) year.textContent = new Date().getFullYear();
  };

  function setupSearch({ formId, inputId, cardSelector, statusId, emptyId, label = 'item', plural = 'itens' }) {
    const form = document.getElementById(formId);
    const input = document.getElementById(inputId);
    const cards = Array.from(document.querySelectorAll(cardSelector));
    const status = document.getElementById(statusId);
    const empty = document.getElementById(emptyId);
    if (!input || !cards.length) return;

    const runSearch = () => {
      const query = normalizeText(input.value);
      let visible = 0;

      cards.forEach((card) => {
        const searchable = normalizeText(`${card.dataset.search || ''} ${card.innerText || card.textContent || ''}`);
        const match = !query || searchable.includes(query);
        card.hidden = !match;
        if (match) visible += 1;
      });

      if (empty) empty.hidden = visible !== 0;
      if (status) {
        if (!query) {
          status.textContent = `${cards.length} ${cards.length === 1 ? label : plural} disponíveis. Digite um termo ou selecione uma opção.`;
        } else if (visible === 0) {
          status.textContent = `Não encontramos ${plural} para “${input.value.trim()}”. Tente outro termo.`;
        } else {
          status.textContent = `${visible} ${visible === 1 ? label : plural} encontrada${visible === 1 ? '' : 's'}.`;
        }
      }
    };

    input.addEventListener('input', runSearch);
    if (form) form.addEventListener('submit', (event) => {
      event.preventDefault();
      runSearch();
      input.focus();
    });
    runSearch();
  }

  document.addEventListener('DOMContentLoaded', () => {
    setCurrentYear();

    setupSearch({
      formId: 'buscaPortal',
      inputId: 'inputBusca',
      cardSelector: '#cardsPortal .portal-card',
      statusId: 'mensagemBuscaPortal',
      emptyId: 'semResultadosPortal',
      label: 'área',
      plural: 'áreas'
    });

    setupSearch({
      formId: 'buscaAulas',
      inputId: 'inputBusca',
      cardSelector: '#listaCards .card',
      statusId: 'mensagemBusca',
      emptyId: 'semResultados',
      label: 'aula',
      plural: 'aulas'
    });

    const gravitationButton = document.getElementById('btnGravitacao');
    if (gravitationButton) {
      gravitationButton.addEventListener('click', () => {
        window.location.href = 'aula.html';
      });
    }

    document.querySelectorAll('[data-coming-soon]').forEach((button) => {
      button.addEventListener('click', () => {
        const area = button.dataset.comingSoon || 'Este módulo';
        window.alert(`${area} está em desenvolvimento e será disponibilizado em uma próxima etapa.`);
      });
    });
  });
})();
