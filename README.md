# Leafline

Leafline analyzes pasted text and PDFs with selectable text. It counts words, unique words and characters, ranks frequent words, and can generate an AI summary.

## Run locally on Windows

From the project directory, run these commands in PowerShell.

```powershell
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

For AI summaries, add your OpenRouter key to the local `.env` beside `app.py`. Keep this file private. The repository ignores it.

```dotenv
OPENROUTER_KEY=your_openrouter_api_key
```

```powershell
.\venv\Scripts\python.exe app.py
```

Open [http://localhost:5000](http://localhost:5000). Restart Flask after changing the key.

## Analyze a document

1. Select **Text** to type or paste text, or **PDF** to upload a document. Both outputs use the selected source. Switching preserves your draft and attachment. Use **Remove PDF** to clear the attachment.
2. Leave **Generate AI summary** checked to request a summary. Uncheck it to calculate statistics entirely in your browser.
3. Select **Analyze document**. The results show total and distinct words, character count including spaces, and up to five frequent words. Word counts are case-insensitive, recognize Unicode letters and numbers, and keep internal apostrophes and hyphens. The ranking excludes words shorter than three characters.
4. Copy the summary when it is ready. Leafline shows the model identifier when OpenRouter reports it. Local results remain available if summarization fails.
5. Use the **Dark mode** switch to toggle between Light and Dark. Leafline starts with your device preference and remembers your selection when browser storage is available.

## Tools and model

| Tool | Role |
| --- | --- |
| HTML, CSS and JavaScript | Responsive interface, themes, browser-side statistics and clipboard interaction |
| PDF.js 2.10.377 | Extracts the text layer from PDFs in the browser via a CDN |
| Python and Flask | Serves the interface and handles `POST /api/summarize` |
| Requests and python-dotenv | Calls OpenRouter over HTTPS and loads the local API key |
| OpenRouter Chat Completions | Uses [`openrouter/free`](https://openrouter.ai/openrouter/free), which selects an available free model. The actual model can vary between requests. |
| Gunicorn | Runs Flask on a compatible production host using `gunicorn app:app` |

## Data flow and limits

PDF files stay in the browser. If AI is enabled, the browser sends the selected source text to Flask, which forwards it to OpenRouter with a summarization instruction. The key stays on the server. Review AI output against the source before relying on it.

PDF files may be up to 20 MB and must contain selectable text. For scanned documents, use an OCR tool and paste its output. AI summaries accept up to 30,000 characters. For longer text, turn AI off to view local statistics or summarize a shorter excerpt.

## Quick verification

- Paste `Text text analysis` with AI off. Expect 3 words, 2 unique words, and `text` at the top with 2 occurrences.
- Switch to PDF, attach a selectable-text document, and verify the counts reflect only the PDF. Switch back to Text and verify the original counts.
- Enable AI and check the summary, model display when provided, and Copy button. If AI fails, verify the counts remain visible.
- Switch between Light and Dark and reload to verify the preference.

## Deployment

GitHub Pages can serve the static frontend. The full app needs a Python host for Flask and OpenRouter. Set `OPENROUTER_KEY` in the host's environment and use the included Gunicorn command. Restrict access to the summary endpoint before exposing a shared API key to public traffic.

See [the Word guide](Leafline-Documentation.docx) for the feature walkthrough and architecture.
