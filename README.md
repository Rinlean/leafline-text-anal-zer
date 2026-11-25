<p align="center">
  <img src="./favicon.svg" width="64" height="64" alt="">
</p>

# Leafline

**Document analysis and AI summarization in the browser.** Paste text or upload a PDF to see word statistics and generate an optional summary.

[Quick start](#quick-start) · [Usage](#usage) · [Architecture](#architecture) · [Deploy](#deploy) · [Word documentation](./Leafline-Documentation.docx)

## Features

- **Text or PDF input** — Switch sources while keeping your draft and attachment. Each analysis uses the selected source.
- **Word statistics** — See total words, unique words, characters, and the five most frequent qualifying words.
- **Reading Map** — Trace a frequent word back to the original document. See up to five highlighted excerpts for the selected word, with PDF page numbers or paragraph numbers for pasted text. It runs in the browser, including when AI is off.
- **Optional AI summary** — Copy the result and see the model identifier when OpenRouter provides it. Statistics remain available if the summary fails.
- **Light and dark modes** — The interface starts with your device preference and remembers your choice.

## Quick start

You'll need Python 3. An [OpenRouter API key](https://openrouter.ai/keys) is required only for AI summaries.

From the project directory, create a virtual environment and install dependencies.

```powershell
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

To enable AI, create or edit `.env` beside `app.py`.

```dotenv
OPENROUTER_KEY=your_openrouter_api_key
```

Keep `.env` private. Git ignores this file.

```powershell
.\venv\Scripts\python.exe app.py
```

Open [localhost:5000](http://localhost:5000). On macOS or Linux, use `./venv/bin/python` in place of the Windows virtual environment executable. Restart Flask after changing `.env`.

## Usage

1. Select **Text** to type or paste content, or select **PDF** to attach a document with selectable text.
2. Leave **Generate AI summary** checked to request a summary. Uncheck it for browser-only statistics.
3. Click **Analyze document** and review the results. Use **Copy** to copy a completed summary.
4. In **Reading Map**, choose a frequent word to see where it appears. The map shows matching passages in source order and reports how many it found.

For a quick check, enter `Text text analysis`. Expect **3 words**, **2 unique words**, **18 characters**, and **text** at the top with **2 occurrences**. Word matching is case-insensitive. The frequency ranking excludes terms shorter than three characters.

## Architecture

The browser extracts PDF text and computes the statistics locally. With AI enabled, it sends the selected text to Flask at `POST /api/summarize`. Flask validates the request and forwards the text to OpenRouter. The PDF file itself stays in the browser, and the API key stays on the server.

| Tool | Role |
| --- | --- |
| HTML, CSS, JavaScript | Responsive interface, themes, text analysis, and clipboard interaction |
| PDF.js 2.10.377 | Extracts selectable text from PDFs in the browser |
| Flask, Requests, python-dotenv | Serves the app, validates summary requests, calls OpenRouter, and loads local configuration |
| [OpenRouter Free Models Router](https://openrouter.ai/openrouter/free) | Routes requests using `openrouter/free`. The underlying model can vary between requests. |
| Gunicorn | Runs Flask in deployment |

### Project layout

| Path | Contents |
| --- | --- |
| [app.py](./app.py) | Flask routes and OpenRouter integration |
| [index.html](./index.html), [style.css](./style.css), [app.js](./app.js) | Browser interface and analysis |
| [favicon.svg](./favicon.svg) | Leafline browser tab icon |
| [requirements.txt](./requirements.txt), [Procfile](./Procfile) | Python dependencies and deployment entry point |
| [Leafline-Documentation.docx](./Leafline-Documentation.docx) | Project guide with usage, data flow, tools, and demonstration checks |

## Limits

- PDFs may be up to **20 MB**. For scanned documents, extract the text with an OCR tool and paste it into Text mode.
- AI summaries accept up to **30,000 characters**. Use a shorter excerpt for the summary, or disable AI to analyze the full text locally.
- Check AI-generated summaries against the source before relying on them.

## Deploy

Use a Python web service such as [Render](https://render.com/docs/deploy-flask) to serve the frontend and API together. For Render, use `pip install -r requirements.txt` as the build command and `gunicorn --timeout 90 app:app` as the start command. Set `OPENROUTER_KEY` in the host's environment variables. Restrict access to the summary endpoint before exposing a shared key to public traffic.
