# Arogya Vanni

**A multilingual health-information app for understanding general health topics, prescriptions, and medical reports.**

This guide explains what the project uses, how its parts work together, how to configure OpenAI safely, and how to run it on Windows.

> **Important:** Arogya Vanni provides general information only. It is not a doctor, diagnosis, medical device, or emergency service. Do not start, stop, or change medication based on an AI response. For emergencies, contact local emergency services or seek urgent medical care. This project has not been clinically, legally, or security reviewed for real patient care.

## What can the app do?

- Create an account and sign in.
- Ask general health questions using text or voice.
- Review voice transcription before sending; read answers and play spoken responses.
- Upload a prescription, medical report, or medicine-package image/PDF for an explanation in a selected language. Package analysis reads visible text and expiry dates; loose pills are not identified by appearance.
- Ask follow-up questions about the analyzed document by text or voice.
- Identify uploads that do not appear to be medical documents instead of presenting them as medical findings.
- Automatically save conversations and document analyses when history is enabled, or save individual items with the **Save to History** button. Uploaded files are not retained.
- Unsaved document results stay on the current page and are lost after refresh or navigation. Saved analyses can be reopened from **History**.
- Use Kannada, English, Hindi, Telugu, Tamil, Malayalam, Marathi, or Bengali. Some interface and help text may still appear in English.

Speech recognition and translations can be inaccurate. Confirm unclear document details with a qualified healthcare professional or pharmacist.

## How the project works

| Part | What it does |
| --- | --- |
| **Frontend** | The website shown in the browser. Built with React and Vite. It displays the screens and sends requests to the backend. |
| **Backend** | The Python/FastAPI service. It handles accounts, validates uploads, accesses MongoDB, and calls OpenAI. It keeps the OpenAI key out of the browser. |
| **MongoDB** | Stores account information and, when history is enabled, conversations and written document-analysis results. It does not store uploaded files. |
| **OpenAI API** | Provides AI answers and document analysis, turns voice recordings into text, and generates spoken answers. API usage may incur charges. |

### Technologies used

- **Frontend:** React 19, JavaScript/JSX, Vite, Tailwind CSS, React Router, Framer Motion, Lucide icons, Axios.
- **Backend:** Python, FastAPI, Pydantic, Uvicorn, PyMongo.
- **Database:** MongoDB.
- **AI models:** `gpt-5-mini` for chat and document analysis, `whisper-1` for transcription, and `gpt-4o-mini-tts` for speech.
- **Security:** Argon2 password hashing and signed, HTTP-only session cookies.

## Before you start

Install or have access to:

1. **Python 3.10 or later** (Python 3.13 is supported by the selected dependencies).
2. **Node.js 22 or later** and npm.
3. **MongoDB 7 or later**, running locally or available through a MongoDB connection URI.
4. An **OpenAI API key** for AI features.

The app's default MongoDB connection is `mongodb://localhost:27017`. Start your local MongoDB service before running the app, or configure `MONGODB_URI` for a reachable MongoDB instance.

## Configure OpenAI and the project

### 1. Create an OpenAI API key

Create a key in the [OpenAI API key settings](https://platform.openai.com/api-keys). Make sure your OpenAI API account and billing/usage limits allow API requests. A ChatGPT subscription and API usage are managed separately.

**Keep the key private. Do not paste it into chat, commit it, put it in frontend files, or use a variable starting with `VITE_`.** If it is exposed, revoke it and create a replacement.

### 2. Create the root `.env` file

Open PowerShell in the project root (`D:\Project\ArogyaVanni AI`) and run:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

This only creates `.env` when it does not already exist. If you already have a root `.env`, the command leaves it untouched and opens it for editing.

Set these values in the root `.env`:

```dotenv
OPENAI_API_KEY=paste-your-private-api-key-here
JWT_SECRET=replace-this-with-a-random-secret
FRONTEND_ORIGINS=http://localhost:5173
COOKIE_SECURE=false
```

Replace the example text with your own values. Do not add quotes around the OpenAI key.

Generate a random session secret in PowerShell:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Copy the output into `JWT_SECRET`. Keep it private. The `.env` file belongs in the **project root**, next to `README.md`—not inside `backend` or `frontend`. It is ignored by Git.

Other settings are optional for a local run. Defaults include `MONGODB_URI=mongodb://localhost:27017`, database name `arogya_vanni`, a maximum upload size of 8 MiB, and development mode. You can add `MONGODB_URI` and `MONGODB_DATABASE` to the root `.env` if needed.

## Run the application on Windows

Run the backend and frontend in **two separate PowerShell terminals**. Keep both terminals open while you use the app.

### 1. Start the backend

In the first terminal:

```powershell
cd "D:\Project\ArogyaVanni AI\backend"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

The virtual environment and dependency installation are normally needed only on the first run. On later runs, open the backend terminal and use:

```powershell
cd "D:\Project\ArogyaVanni AI\backend"
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

The backend API is at [http://localhost:8000](http://localhost:8000). Its health check is [http://localhost:8000/api/health](http://localhost:8000/api/health), and interactive API documentation is at [http://localhost:8000/docs](http://localhost:8000/docs).

### 2. Start the frontend

Open a second PowerShell terminal:

```powershell
cd "D:\Project\ArogyaVanni AI\frontend"
npm ci
npm run dev
```

`npm ci` is normally needed only on the first run or after dependencies change. On later runs:

```powershell
cd "D:\Project\ArogyaVanni AI\frontend"
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. During development, Vite forwards `/api` requests to the backend at `http://localhost:8000`.

### Stop the servers

In each terminal, press **Ctrl+C** to stop its server.

## Run tests and build

Run backend tests from the `backend` directory:

```powershell
cd "D:\Project\ArogyaVanni AI\backend"
.\.venv\Scripts\Activate.ps1
python -m pytest tests\test_core.py -q
```

Build the frontend from the `frontend` directory:

```powershell
cd "D:\Project\ArogyaVanni AI\frontend"
npm run build
```

Backend tests use mocks for AI and database behavior; a passing test suite does not prove that your real OpenAI or MongoDB credentials work.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| **The app says the OpenAI key is missing or invalid** | Check `OPENAI_API_KEY` in the root `.env`, ensure the key is active and API billing/limits are set up, then stop and restart the backend. |
| **The backend cannot start or AI requests fail** | Check that dependencies installed successfully and that the backend terminal has no error. Visit `/api/health` to check backend/database availability. |
| **MongoDB is unavailable** | Start the MongoDB service or correct `MONGODB_URI` in the root `.env`, then restart the backend. |
| **The browser cannot reach the API** | Run both servers. The default frontend address is `http://localhost:5173` and the backend is `http://localhost:8000`. Check `FRONTEND_ORIGINS` if you changed the frontend address. |
| **A port is already in use** | Stop the other app using port `5173` or `8000`, then retry. |
| **PowerShell blocks virtual-environment activation** | In that terminal only, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` and activate again. |

After changing `.env`, restart the **backend** so it reads the updated configuration.

## Privacy and safety

- Never put the OpenAI API key in frontend code or expose it to the browser.
- Do not upload documents containing information you do not have permission to share. Avoid unnecessary identifying information.
- Voice recordings and uploaded prescriptions, reports, and medicine packages are sent to the configured AI service for processing and are not saved as files by this app.
- Conversation history and written document-analysis results are saved only when history is enabled. Users can delete saved history or their account.
- Follow-up questions about a document are kept in the current page session and are not saved to document history.
- Do not treat AI answers, document explanations, or the emergency phrase screen as medical advice or validated clinical triage.
- Use HTTPS, a strong unique `JWT_SECRET`, secure cookies, and explicit trusted frontend origins before any production deployment. Do not expose a development server or MongoDB port publicly.

This project has not undergone independent clinical, privacy, security, accessibility, or regulatory review and is not ready for real patient care.
