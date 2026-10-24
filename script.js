const TOTAL_AYAHS = 6236;
const STORAGE_KEY = "ayahTab.currentAyah";
let audio = null;

async function getStoredAyahIndex() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || 1);
    });
  });
}

async function setStoredAyahIndex(index) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: index }, () => resolve());
  });
}

function randomAyah() {
  return Math.floor(Math.random() * TOTAL_AYAHS) + 1;
}

async function fetchAyah(ayahNumber) {
  const [arRes, enRes, tafsirRes] = await Promise.all([
    fetch(`https://api.alquran.cloud/v1/ayah/${ayahNumber}/ar.alafasy`),
    fetch(`https://api.alquran.cloud/v1/ayah/${ayahNumber}/en.asad`),
    fetch(`https://api.alquran.cloud/v1/ayah/${ayahNumber}/en.tafsir`),
  ]);

  if (!arRes.ok || !enRes.ok || !tafsirRes.ok) {
    throw new Error("Failed to fetch ayah data");
  }

  const arData = await arRes.json();
  const enData = await enRes.json();
  const tafsirData = await tafsirRes.json();

  return {
    arabic: arData.data.text,
    translation: enData.data.text,
    tafsir: tafsirData.data.text,
    surah: arData.data.surah.englishName,
    numberInSurah: arData.data.numberInSurah,
    audio: arData.data.audio
  };
}

function renderAyah(data, ayahNumber) {
  document.getElementById("ayah-ar").textContent = data.arabic;
  document.getElementById("ayah-en").textContent = data.translation;
  document.getElementById("tafsir-text").textContent = data.tafsir;
  document.getElementById("ayah-ref").textContent =
    `${data.surah} • Ayah ${data.numberInSurah} • Global #${ayahNumber}`;
}

async function showAyah(ayahNumber) {
  try {
    const ayah = await fetchAyah(ayahNumber);
    renderAyah(ayah, ayahNumber);

    if (audio) audio.pause();
    audio = new Audio(ayah.audio);

    const playBtn = document.getElementById("play");
    playBtn.onclick = () => audio && audio.play();

    await setStoredAyahIndex(ayahNumber);
  } catch (err) {
    document.getElementById("ayah-ar").textContent = "Could not load ayah.";
    document.getElementById("ayah-en").textContent = String(err.message || err);
  }
}

(async function init() {
  const current = randomAyah();
  await showAyah(current);

  document.getElementById("next").addEventListener("click", async () => {
    let index = await getStoredAyahIndex();
    index = index >= TOTAL_AYAHS ? 1 : index + 1;
    await showAyah(index);
  });

  document.getElementById("prev").addEventListener("click", async () => {
    let index = await getStoredAyahIndex();
    index = index <= 1 ? TOTAL_AYAHS : index - 1;
    await showAyah(index);
  });
})();
