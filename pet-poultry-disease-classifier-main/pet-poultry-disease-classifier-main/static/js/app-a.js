let selectedFile = null;

// Drag & Drop
const dropZone = document.getElementById('dropZone');
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag'));
dropZone.addEventListener('drop', e => {
  e.preventDefault(); dropZone.classList.remove('drag');
  const f = e.dataTransfer.files[0];
  if (f) loadFile(f);
});

function handleFile(e) {
  const f = e.target.files[0];
  if (f) loadFile(f);
}

function loadFile(f) {
  if (f.size > 10 * 1024 * 1024) { showError('File too large! Max 10MB.'); return; }
  if (!f.type.startsWith('image/')) { showError('Please upload an image file (JPG/PNG/WEBP).'); return; }
  hideError();
  selectedFile = f;
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById('preview-img').src = ev.target.result;
    document.getElementById('preview-wrap').style.display = 'block';
    dropZone.style.display = 'none';
    document.getElementById('analyzeBtn').disabled = false;
  };
  reader.readAsDataURL(f);
}

function removeImage() {
  selectedFile = null;
  document.getElementById('preview-wrap').style.display = 'none';
  document.getElementById('dropZone').style.display = 'block';
  document.getElementById('analyzeBtn').disabled = true;
  document.getElementById('fileInput').value = '';
  showEmptyState();
}

function showEmptyState() {
  document.getElementById('empty-state').style.display = 'block';
  document.getElementById('analyzing-state').style.display = 'none';
  document.getElementById('result-state').style.display = 'none';
}

function showError(msg) {
  document.getElementById('error-text').textContent = msg;
  document.getElementById('error-msg').style.display = 'block';
}
function hideError() {
  document.getElementById('error-msg').style.display = 'none';
}

async function analyze() {
  if (!selectedFile) return;

  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('result-state').style.display = 'none';
  document.getElementById('analyzing-state').style.display = 'block';
  document.getElementById('analyzeBtn').disabled = true;
  document.getElementById('btn-text').textContent = '⏳ Analyzing...';
  hideError();

  const formData = new FormData();
  formData.append('image', selectedFile);

  try {
    const response = await fetch('http://127.0.0.1:5000/predict', { method: 'POST', body: formData });
    if (!response.ok) throw new Error('Server error: ' + response.status);
    const data = await response.json();
    showResults(data);
  } catch (err) {
    document.getElementById('analyzing-state').style.display = 'none';
    document.getElementById('empty-state').style.display = 'block';
    showError('Could not connect to model server. Make sure app.py is running!');
  } finally {
    document.getElementById('analyzeBtn').disabled = false;
    document.getElementById('btn-text').textContent = '🔬 Analyze Image';
  }
}

function showResults(data) {
  document.getElementById('analyzing-state').style.display = 'none';
  document.getElementById('result-state').style.display = 'block';

  const top = data.top;
  const conf = data.confidence;

  const emoji = top.includes('Cat') || top.includes('Feline') ? '🐱' :
                top.includes('Dog') || top.includes('Kennel') || top.includes('Parvovirus') ? '🐶' :
                top === 'Healthy' || top === 'PCR Healthy' ? '✅' : '🐔';

  const isHealthy = top.toLowerCase().includes('healthy');
  const banner = document.getElementById('result-banner');
  banner.className = 'result-banner ' + (isHealthy ? 'healthy' : 'disease');

  document.getElementById('result-icon').textContent = emoji;
  document.getElementById('result-name').textContent = top;
  document.getElementById('result-conf').textContent = `Confidence: ${conf.toFixed(1)}%`;

  const container = document.getElementById('bars-container');
  container.innerHTML = data.predictions.map((p) => `
    <div class="bar-item">
      <div class="bar-row">
        <span class="bar-name">${p.class}</span>
        <span class="bar-pct">${p.confidence.toFixed(1)}%</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width:0%" data-w="${p.confidence.toFixed(1)}%"></div>
      </div>
    </div>`).join('');

  setTimeout(() => {
    document.querySelectorAll('.bar-fill').forEach(b => b.style.width = b.dataset.w);
  }, 60);
}
