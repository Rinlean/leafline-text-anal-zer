const byId = (id) => document.getElementById(id);
const theme = byId("theme");
const fileInput = byId("pdf");
const removePdf = byId("remove-pdf");
const status = byId("status");
const summary = byId("sum");
const copy = byId("copy");
const model = byId("model");

let savedTheme;
try {
  savedTheme = localStorage.getItem("leafline-theme");
} catch {
  // Theme switching still works if storage is disabled.
}
function applyTheme(isDark) {
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  theme.setAttribute("aria-checked", String(isDark));
}

applyTheme(savedTheme === "dark" ||
  (savedTheme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches));
theme.addEventListener("click", () => {
  const isDark = theme.getAttribute("aria-checked") !== "true";
  applyTheme(isDark);
  try {
    localStorage.setItem("leafline-theme", isDark ? "dark" : "light");
  } catch {
    // The current theme stays active until the page is closed.
  }
});

fileInput.addEventListener("change", () => {
  removePdf.hidden = !fileInput.files.length;
});
removePdf.addEventListener("click", () => {
  fileInput.value = "";
  removePdf.hidden = true;
  fileInput.focus();
});

async function extractPdfText(file) {
  if (file.size > 20_000_000) throw new Error("Choose a PDF of 20 MB or smaller.");
  const reader = window.pdfjsLib;
  if (!reader) throw new Error("The PDF reader could not load. Reload the page or paste your text.");
  reader.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js";
  const task = reader.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false });
  try {
    const pdf = await task.promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map(({ str }) => str || "").join(" "));
    }
    const text = pages.join("\n").trim();
    if (!text) throw new Error("This PDF has no selectable text. For scans, paste text from an OCR tool.");
    return pages;
  } finally {
    await task.destroy();
  }
}

const wordPattern = /[\p{L}\p{N}][\p{L}\p{N}\p{M}]*(?:[’'-][\p{L}\p{N}][\p{L}\p{N}\p{M}]*)*/gu;
const normalizeWord = (word) => word.toLowerCase().normalize("NFC");

function analyzeLocally(text) {
  const words = (text.match(wordPattern) || []).map(normalizeWord);
  const counts = new Map();
  for (const word of words) counts.set(word, (counts.get(word) || 0) + 1);
  const top = [...counts].filter(([word]) => [...word].length >= 3)
    .sort(([a, aCount], [b, bCount]) => bCount - aCount || a.localeCompare(b)).slice(0, 5);
  byId("wc").textContent = words.length.toLocaleString();
  byId("unique").textContent = counts.size.toLocaleString();
  byId("characters").textContent = [...text].length.toLocaleString();
  byId("freq").replaceChildren(...(top.length ? top.map(([word, count]) => {
    const item = document.createElement("li");
    item.textContent = `${word} · ${count.toLocaleString()}`;
    return item;
  }) : [Object.assign(document.createElement("li"), { textContent: "No qualifying words." })]));
  return top;
}

function setUpReadingMap(sections, locationType, top) {
  const select = byId("map-term");
  const list = byId("map-passages");
  const count = byId("map-count");
  const matchesByWord = new Map(top.map(([word]) => [word, { total: 0, excerpts: [] }]));
  const segmenter = new Intl.Segmenter(undefined, { granularity: "sentence" });
  sections.forEach((section, index) => {
    for (const { segment } of segmenter.segment(section)) {
      const passage = segment.trim();
      const seen = new Set();
      for (const match of passage.matchAll(wordPattern)) {
        const word = normalizeWord(match[0]);
        const result = matchesByWord.get(word);
        if (!result || seen.has(word)) continue;
        seen.add(word);
        result.total++;
        if (result.excerpts.length < 5) {
          const start = Math.max(0, match.index - 90);
          const end = Math.min(passage.length, match.index + match[0].length + 150);
          result.excerpts.push({
            location: `${locationType} ${index + 1}`,
            before: (start ? "…" : "") + passage.slice(start, match.index),
            word: match[0],
            after: passage.slice(match.index + match[0].length, end) + (end < passage.length ? "…" : "")
          });
        }
      }
    }
  });

  select.replaceChildren(...top.map(([word]) => new Option(word, word)));
  select.disabled = !top.length;
  select.onchange = () => {
    list.replaceChildren();
    const result = matchesByWord.get(select.value);
    if (!result) {
      count.textContent = "No frequent words to trace.";
      return;
    }
    count.textContent = `Showing ${result.excerpts.length} of ${result.total} matching passages.`;
    for (const excerpt of result.excerpts) {
      const item = document.createElement("li");
      const location = document.createElement("small");
      const highlight = document.createElement("mark");
      location.textContent = excerpt.location;
      highlight.textContent = excerpt.word;
      item.append(location, excerpt.before, highlight, excerpt.after);
      list.append(item);
    }
  };
  select.onchange();
}

async function getSummary(text) {
  const response = await fetch("/api/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || `Summary request failed (HTTP ${response.status}).`);
  if (typeof data?.summary !== "string" || !data.summary.trim()) {
    throw new Error("The server returned an empty or invalid summary.");
  }
  return data;
}

copy.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(summary.textContent);
    byId("copy-status").textContent = "Summary copied.";
  } catch {
    byId("copy-status").textContent = "Clipboard unavailable. Select and copy the summary manually.";
  }
});

const form = byId("analysis-form");
const source = form.elements.namedItem("source");
function showSource() {
  const usePdf = source.value === "pdf";
  byId("text-source").hidden = usePdf;
  byId("pdf-source").hidden = !usePdf;
}
showSource();
form.addEventListener("change", (event) => {
  if (event.target.name === "source") {
    showSource();
    status.hidden = true;
    byId("empty").hidden = false;
    byId("out").hidden = true;
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const go = byId("go");
  if (go.disabled) return;
  const usePdf = source.value === "pdf";
  const pdf = usePdf ? fileInput.files[0] : null;
  const includeSummary = byId("include-summary").checked;
  go.disabled = true;
  byId("source-switch").disabled = true;
  status.hidden = true;
  byId("empty").hidden = false;
  byId("out").hidden = true;

  try {
    if (usePdf && !pdf) throw new Error("Choose a PDF to analyze.");
    if (pdf) {
      status.textContent = "Reading PDF…";
      status.hidden = false;
    }
    const pages = pdf ? await extractPdfText(pdf) : null;
    const text = pages ? pages.join("\n").trim() : byId("text").value.trim();
    if (!text) throw new Error("Enter text to analyze.");
    const top = analyzeLocally(text);
    setUpReadingMap(pages || text.split(/\r?\n[\t ]*\r?\n(?:[\t ]*\r?\n)*/), pdf ? "Page" : "Paragraph", top);
    status.hidden = true;
    byId("empty").hidden = true;
    byId("out").hidden = false;
    byId("summary-section").hidden = !includeSummary;
    if (!includeSummary) return;

    summary.textContent = "Generating summary…";
    model.hidden = true;
    copy.disabled = true;
    byId("copy-status").textContent = "";
    try {
      const data = await getSummary(text);
      summary.textContent = data.summary;
      model.textContent = data.model ? `Model: ${data.model}` : "";
      model.hidden = !data.model;
      copy.disabled = false;
    } catch (error) {
      summary.textContent = `Summary unavailable. ${error.message}`;
    }
  } catch (error) {
    status.textContent = error.message;
    status.hidden = false;
  } finally {
    go.disabled = false;
    byId("source-switch").disabled = false;
  }
});
