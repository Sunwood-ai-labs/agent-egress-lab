async function renderReport() {
  const response = await fetch('./results.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`results.json: ${response.status}`);
  const data = await response.json();

  document.querySelector('#verifiedAt').textContent = new Date(data.verifiedAt).toLocaleString('ja-JP');
  document.querySelector('#limitation').textContent = data.limitation;

  const grid = document.querySelector('#testGrid');
  grid.replaceChildren(...data.tests.map((test, index) => {
    const article = document.createElement('article');
    article.className = 'test';
    article.innerHTML = `
      <span class="index">CONTROL 0${index + 1}</span>
      <span class="outcome">${test.outcome}</span>
      <h3>${test.path}</h3>
      <p>${test.target}</p>
    `;
    return article;
  }));
}

renderReport().catch((error) => {
  document.querySelector('#testGrid').textContent = `Report unavailable: ${error.message}`;
});
