const $ = (selector) => document.querySelector(selector);

function setClock() {
  $('#clock').textContent = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).format(new Date()) + ' JST';
}

async function decode(response) {
  const data = await response.json();
  return { response, data };
}

$('#getButton').addEventListener('click', async () => {
  const target = $('#targetUrl').value.trim();
  $('#getStatus').className = '';
  $('#getStatus').textContent = 'REQUESTING…';
  $('#responseExcerpt').textContent = 'Passing request through the read-only gateway…';
  try {
    const { response, data } = await decode(await fetch(`/fetch?url=${encodeURIComponent(target)}`));
    if (!response.ok) throw Object.assign(new Error(data.message || 'Gateway rejected request'), { data, status: response.status });
    $('#getStatus').textContent = `${response.status} READ ALLOWED`;
    $('#getStatus').className = 'allowed';
    $('#upstreamStatus').textContent = String(data.upstreamStatus);
    $('#payloadSize').textContent = `${data.bytes} B`;
    const marker = data.body.includes('Example Domain') ? '✓ Example Domain received\n\n' : '';
    $('#responseExcerpt').textContent = marker + data.body.slice(0, 850);
  } catch (error) {
    $('#getStatus').textContent = `${error.status || 'ERR'} BLOCKED`;
    $('#responseExcerpt').textContent = `${error.data?.error || 'request_failed'}: ${error.message}`;
  }
});

$('#postButton').addEventListener('click', async () => {
  try {
    const { response, data } = await decode(await fetch(`/fetch?url=${encodeURIComponent('https://example.com/')}`, { method: 'POST' }));
    $('#postStatus').textContent = `${response.status} ${data.error === 'method_denied' ? 'WRITE BLOCKED' : data.error}`;
    $('#postStatus').className = response.status === 405 ? 'blocked' : '';
  } catch (error) {
    $('#postStatus').textContent = `ERROR ${error.message}`;
  }
});

$('#hostButton').addEventListener('click', async () => {
  try {
    const { response, data } = await decode(await fetch(`/fetch?url=${encodeURIComponent('https://api.github.com/')}`));
    $('#hostStatus').textContent = `${response.status} ${data.error === 'host_denied' ? 'HOST BLOCKED' : data.error}`;
    $('#hostStatus').className = response.status === 403 ? 'blocked' : '';
  } catch (error) {
    $('#hostStatus').textContent = `ERROR ${error.message}`;
  }
});

setClock();
setInterval(setClock, 1000);
