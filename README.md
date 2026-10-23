# TruthGuard — Adversarial Verification for Multi-Agent Document Q&A

[![TruthGuard Architecture](https://img.shields.io/badge/Architecture-MERN%20%2B%20Multi--Agent-indigo.svg)](#architecture)
[![Verification Engine](https://img.shields.io/badge/Verification-Adversarial%20Critic-emerald.svg)](#adversarial-verification-stages)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#)

TruthGuard is an enterprise-grade document question-answering system that solves a fundamental flaw of standard RAG (Retrieval-Augmented Generation) chatbots: **the silent conflation of contradictory, outdated, or unverified information**.

Standard chatbots retrieve matching passages and synthesize an answer even if the retrieved documents contradict each other or contain stale policies. **TruthGuard deploys a 4-stage adversarial verification pipeline** to independently inspect claims, cross-examine evidence sources, detect conflicting clauses, evaluate document supersession rules, and flag unresolved contradictions transparently.

---

## Table of Contents

1. [Key Features](#key-features)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [The 4-Stage Adversarial Verification Pipeline](#the-4-stage-adversarial-verification-pipeline)
5. [Prerequisites](#prerequisites)
6. [Installation & Setup](#installation--setup)
7. [Environment Configuration](#environment-configuration)
8. [Running the Application](#running-the-application)
9. [User Workflow & Guide](#user-workflow--guide)
10. [NPM Scripts Reference](#npm-scripts-reference)
11. [Testing & Verification](#testing--verification)
12. [Security Architecture](#security-architecture)
13. [Troubleshooting](#troubleshooting)
14. [Limitations & Future Improvements](#limitations--future-improvements)

---

## Key Features

- **Cross-Document Contradiction Detection**: Detects incompatible claims across multiple policies (e.g. "Work remotely 3 days" vs "Work remotely 2 days") and highlights differences side-by-side.
- **Evidence-Based Supersession Analysis**: Evaluates publication dates, effective dates, version labels, and explicit supersession links. Does *not* naively treat the newest upload as automatically authoritative without proof of precedence.
- **Strict Evidence Grounding**: The Synthesizer is forbidden from hallucinating outside knowledge as if it originated from uploaded documents.
- **Adversarial Critic Agent**: An independent critic analyzes candidate answers and retrieved passages for:
  - Scope and condition mismatches
  - Unsupported claims and missing citations
  - Temporal invalidity and policy expiration
  - Insufficient evidence gaps
- **Transparent Verification Statuses**: Every response is categorized into an explicit state:
  - `supported`: Verified with unambiguous citations.
  - `conflict_detected`: Direct contradictions identified between sources.
  - `unresolved`: Disagreement exists and precedence cannot be proven from available metadata.
  - `insufficient_evidence`: Knowledge base lacks relevant authoritative passages.
  - `verification_error`: Critic verification could not run or provider failed.
- **Isolated Multi-Tenant Security**: Per-user data isolation on all database queries, HttpOnly session cookies, input validation via Zod, rate limiting, and strict file validation (PDF, TXT, MD).
- **Dual Mode AI Provider**: Runs in **Demo/Development Mode** with a deterministic mock provider or in **Production Mode** using OpenAI (or OpenAI-compatible) models.

---

## Technology Stack

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS (enterprise security aesthetic)
- **Icons**: Lucide React
- **Routing**: React Router v6
- **Markdown**: React-Markdown for safe formatted responses
- **HTTP Client**: Axios with centralized error handling and credential support

### Backend
- **Runtime**: Node.js (ES Modules)
- **Web Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT in HttpOnly, SameSite cookies + bcryptjs password hashing
- **File Uploads & Processing**: Multer + `pdf-parse` for genuine searchable PDF text extraction
- **Security**: Helmet, CORS, express-rate-limit, cookie-parser, Zod schema validation
- **Testing**: Vitest

### AI & Verification
- **Official OpenAI SDK** with configurable model (`gpt-4o`, `gpt-4o-mini`, etc.)
- **Deterministic Mock Provider** for local offline testing, automated tests, and demo mode
- **Modular AI Provider Factory** enabling pluggable LLM backends

---

## Architecture Overview

```text
TruthGuard/
├── client/                      # React + Vite Frontend
│   ├── src/
│   │   ├── api/                 # Centralized Axios services (auth, docs, qa, health)
│   │   ├── components/          # Reusable UI (StatusBadge, ConflictPanel, Citations...)
│   │   ├── hooks/               # useAuth Context & custom hooks
│   │   ├── layouts/             # AppLayout (Sidebar, Header, Banner), AuthLayout
│   │   ├── pages/               # Dashboard, DocumentLibrary, Detail, Chat, Settings
│   │   ├── utils/               # Formatters, file helpers
│   │   ├── App.jsx              # Application router with ProtectedRoute guards
│   │   └── main.jsx             # React entry point
│   ├── index.html
│   ├── vite.config.js           # Vite configuration with /api reverse proxy
│   └── tailwind.config.js       # Enterprise styling palette
│
├── server/                      # Node.js + Express Backend
│   ├── src/
│   │   ├── config/              # Centralized environment configuration
│   │   ├── controllers/         # authController, documentController, qaController...
│   │   ├── middleware/          # auth, validate (Zod), errorHandler, rateLimit
│   │   ├── models/              # User, Document, DocumentChunk, Conversation
│   │   ├── routes/              # Express route definitions
│   │   ├── services/
│   │   │   ├── agents/          # SynthesizerAgent, CriticAgent, Orchestrator
│   │   │   │   ├── mockProvider.js    # Deterministic mock provider
│   │   │   │   ├── openaiProvider.js  # OpenAI API provider
│   │   │   │   └── providerFactory.js # Factory selecting mock vs openai
│   │   │   ├── document/        # processor.js (PDF/TXT/MD text extractor & chunker)
│   │   │   ├── retrieval/       # retrievalService.js (Tokenization & scoring engine)
│   │   │   └── verification/    # resolutionService.js (Conflict & precedence resolver)
│   │   ├── utils/               # Filename sanitizer, ID generators, regex escaper
│   │   ├── app.js               # Express application middleware pipeline
│   │   └── server.js            # Server bootstrap and MongoDB connection
│   ├── test/                    # Automated Vitest test suite
│   └── package.json
│
├── uploads/                     # Isolated uploaded documents directory
├── .env.example                 # Environment configuration template
├── package.json                 # Monorepo management scripts
└── README.md
```

---

## The 4-Stage Adversarial Verification Pipeline

```text
               [User Question]
                      │
                      ▼
 ┌─────────────────────────────────────────┐
 │   Stage 1: Retriever Agent               │
 │   - Scopes search strictly to User ID   │
 │   - Tokenizes query, filters stopwords  │
 │   - Ranks & scores DocumentChunks       │
 │   - Preserves provenance & timestamps   │
 └────────────────────┬────────────────────┘
                      │ (Evidence Passages)
                      ▼
 ┌─────────────────────────────────────────┐
 │   Stage 2: Synthesizer Agent            │
 │   - Drafts answer grounded in passages  │
 │   - Emits structured JSON with citations│
 │   - Prohibited from external knowledge  │
 └────────────────────┬────────────────────┘
                      │ (Candidate Answer + Citations)
                      ▼
 ┌─────────────────────────────────────────┐
 │   Stage 3: Adversarial Critic Agent     │
 │   - Contradiction Detection across docs │
 │   - Staleness & Supersession analysis   │
 │   - Verification of cited excerpts      │
 │   - Identifies ungrounded statements    │
 └────────────────────┬────────────────────┘
                      │ (Adversarial Findings)
                      ▼
 ┌─────────────────────────────────────────┐
 │   Stage 4: Resolution & Synthesis       │
 │   - Computes final Verification Status  │
 │   - Inserts Side-by-Side Conflict Panel │
 │   - Explains precedence if established  │
 │   - Marks unresolved if proof lacks     │
 └─────────────────────────────────────────┘
```

1. **Stage 1: Retriever Agent**: Scans user-owned `DocumentChunk` records using multi-term keyword matching and frequency scoring. Returns passages with document version, effective date, and chunk position metadata.
2. **Stage 2: Synthesizer Agent**: Formulates a response grounded exclusively on the retrieved passages. Cites specific document IDs and chunk IDs.
3. **Stage 3: Adversarial Critic Agent**: Analyzes the passages and the draft answer for contradictions, version discrepancies, unsupported claims, and temporal staleness.
4. **Stage 4: Resolution Service**: Determines the final outcome status. If contradictions exist, builds side-by-side evidence comparisons. If precedence is proven by supersession links or explicit document rules, provides the reasoning; otherwise, marks the conflict as explicitly `unresolved`.

---

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: A running local MongoDB instance (`mongodb://localhost:27017/truthguard`) or MongoDB Atlas URI

---

## Installation & Setup

1. **Clone or Navigate to the Workspace**:
   ```bash
   cd jatayu
   ```

2. **Install Root and Workspace Dependencies**:
   ```bash
   npm run install:all
   ```
   *(Or run `npm install` in the root, `server/`, and `client/` directories).*

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` in the root:
   ```bash
   cp .env.example .env
   ```

---

## Environment Configuration

TruthGuard loads `.env` automatically from the project root.

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Express backend listening port | `5000` |
| `NODE_ENV` | Environment mode (`development` or `production`) | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/truthguard` |
| `JWT_SECRET` | Secret key for signing authentication tokens | *(strong random secret)* |
| `JWT_EXPIRES_IN` | Token expiration duration | `7d` |
| `CLIENT_URL` | Frontend URL for CORS configuration | `http://localhost:5173` |
| `AI_PROVIDER` | AI backend provider: `gemini`, `openai`, or `mock` | `gemini` |
| `GEMINI_API_KEY` | Google Gemini API key | *(your Gemini key)* |
| `GEMINI_MODEL` | Gemini model identifier | `gemini-3.5-flash-lite` |
| `OPENAI_API_KEY` | OpenAI API key (if using OpenAI) | `""` |
| `OPENAI_MODEL` | OpenAI model identifier | `gpt-4o-mini` |
| `DEMO_MODE` | Enable simulated verification with UI banner | `false` |
| `MAX_FILE_SIZE_MB`| Maximum uploaded document size in MB | `20` |
| `UPLOAD_DIR` | Directory to store uploaded files safely | `uploads` |
| `AUTH_RATE_LIMIT_MAX` | Max auth requests per 15-minute window | `20` |

### Setting Up Google Gemini (Active)
To run with Google Gemini:
1. In `.env`, configure:
   ```env
   AI_PROVIDER=gemini
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-3.5-flash-lite
   DEMO_MODE=false
   ```
2. TruthGuard includes automatic failover resilience across Google's fastest flash models (`gemini-3.5-flash-lite` and `gemini-3.5-flash`).

### Setting Up OpenAI (Alternative)
To use OpenAI instead:
1. In `.env`, set:
   ```env
   AI_PROVIDER=openai
   OPENAI_API_KEY=sk-your-openai-api-key-here
   OPENAI_MODEL=gpt-4o-mini
   DEMO_MODE=false
   ```

### Setting Up Offline Demo Mode
To run completely offline without an external API:
1. In `.env`, set:
   ```env
   AI_PROVIDER=mock
   DEMO_MODE=true
   ```
2. The server will use the intelligent `MockProvider` which performs deterministic multi-agent synthesis, detects conflicts, and identifies supersessions. A prominent `DEMO MODE` banner will be displayed in the UI.

---

## Running the Application

### Option A: Run Both Concurrently (Recommended)
From the root directory:
```bash
npm run dev
```
This boots:
- **Backend API**: `http://localhost:5000`
- **Frontend UI**: `http://localhost:5173`

### Option B: Run Services Separately
In terminal 1 (Backend):
```bash
npm run dev:server
```
In terminal 2 (Frontend):
```bash
npm run dev:client
```

---

## User Workflow & Guide

### 1. Register & Log In
- Navigate to `http://localhost:5173`.
- Click **Create an account** and register with a valid email and 8+ character password.
- Sessions are maintained securely via HttpOnly cookies.

### 2. Upload Documents
- Navigate to **Documents** in the sidebar.
- Click **Upload Document**.
- Supported file types: `.pdf`, `.txt`, `.md`.
- Enter metadata:
  - **Title** (e.g., "Remote Work Policy 2023")
  - **Category** (e.g., "HR Policies")
  - **Version Label** (e.g., "v1.0")
  - **Effective Date** & **Publication Date**
  - **Supersedes Document**: Optionally select an earlier version if this policy explicitly replaces it.
- Click **Upload & Process**. The server extracts text, splits it into overlapping chunks, and stores metadata in MongoDB.

### 3. Ask Questions & Verify Claims
- Navigate to **AI Research** in the sidebar.
- Ask questions such as:
  - *"What is our policy on remote work days per week?"*
  - *"Has any newer policy superseded our contractor guidelines?"*
- TruthGuard will:
  1. Retrieve relevant passages.
  2. Synthesize an answer.
  3. Run adversarial critique across differing document versions.
  4. Display the result with an **Evidence Status Badge**, citations, side-by-side **Conflict Panels**, and precedence explanations.

### 4. Review Document Details & Supersession
- Click any document in the Document Library or click a citation in the chat.
- View extracted text, chunk count, publication dates, and related version histories.

---

## NPM Scripts Reference

From the root project directory:

| Script | Command | Description |
| :--- | :--- | :--- |
| `npm run install:all` | `npm install && ...` | Installs root, server, and client dependencies |
| `npm run dev` | `concurrently ...` | Starts server and client simultaneously in dev mode |
| `npm run dev:server` | `cd server && npm run dev` | Starts server with nodemon |
| `npm run dev:client` | `cd client && npm run dev` | Starts client with Vite dev server |
| `npm run build` | `cd client && npm run build` | Creates production client bundle in `client/dist` |
| `npm test` | `cd server && npm test` | Runs all 7 test suites (75 automated tests) |
| `npm run test:unit` | `cd server && npm run test:unit` | Runs unit test suites (critic cases, synthesizer, helpers) |
| `npm run test:integration`| `cd server && npm run test:integration` | Runs integration test suites (auth, docs, retrieval, API) |
| `npm run test:e2e` | `cd server && npm run test:e2e` | Runs full Express REST route integration tests |
| `npm run test:gemini` | `cd server && npm run test:gemini` | Manual verification using real Google Gemini API |
| `npm run lint` | `cd client && npm run lint` | Runs ESLint on the frontend codebase |

---

## Testing & Verification

TruthGuard includes a comprehensive test suite of 75 automated tests across 7 test files, running in Vitest against an isolated local test database (`mongodb://127.0.0.1:27017/truthguard_test`):

```bash
# Run all automated tests (75 tests)
npm test

# Run unit tests only (26 tests)
npm run test:unit

# Run integration tests only (49 tests)
npm run test:integration

# Run API endpoint integration tests
npm run test:e2e

# Optional: Run live test with real Google Gemini key
npm run test:gemini
```

### Verified Test Domains
1. **Authentication & Security** (`test/auth.test.js` - 13 tests): Registration, login, duplicate email prevention, password hashing, 401s on unauthenticated access, JWT cookie / Bearer token validation, tenant isolation.
2. **Document Processing & Storage** (`test/document.test.js` - 11 tests): Uploads (.pdf, .txt, .md), chunking, indexing, empty file handling, extension validation, cascading deletion, disk cleanup.
3. **Retrieval Engine** (`test/retrieval.test.js` - 8 tests): Keyword tokenization, stopword removal, relevance ranking, multi-tenant isolation, deduplication, supersession metadata survival.
4. **Synthesizer Agent** (`test/synthesizer.test.js` - 5 tests): Grounded answer formulation, rejection of hallucinated/fabricated citations, missing evidence handling, provider timeout/error fallback.
5. **Adversarial Verification 10 Cases** (`test/critic-cases.test.js` - 10 tests): Cases A through J (unresolved conflicts, temporal supersession, unsupported claims, distinct scopes, partial contradictions, numeric discrepancies).
6. **REST API Endpoints** (`test/api-routes.test.js` - 17 tests): Express routing, Zod validation, conversation lifecycle, health endpoint, cascading document/chunk deletion.
7. **Core Pipeline Unit Tests** (`test/backend.test.js` - 11 tests): Helper sanitization, sliding chunk windowing, mock provider deterministic analysis.

---

## Security Architecture

1. **Authentication & Session Security**:
   - Passwords hashed using `bcryptjs` with salt rounds.
   - JWT tokens stored in `HttpOnly`, `SameSite: Lax` cookies (with `Secure` in production).
   - Rate limiting on authentication routes prevents brute force attacks.
2. **Strict Multi-Tenant Isolation**:
   - Every database query for documents, chunks, and conversations enforces `{ owner: req.user.id }`.
   - Document deletion cascades to associated chunks and securely unlinks local files.
3. **File Upload Security**:
   - Safe UUID-based filename generation prevents filesystem path traversal.
   - File extensions and MIME types restricted to PDF, TXT, and Markdown.
   - File size limits enforced via Multer (`MAX_FILE_SIZE_MB`).
4. **Prompt Injection & AI Boundary Defense**:
   - Uploaded document content is treated as untrusted data, never as system instructions.
   - Clear system/user separation and explicit instructions instructing agents to disregard embedded commands in uploaded text.
5. **No Secret Leakage**:
   - Stack traces suppressed in production.
   - API keys and tokens never returned to client or logged.

---

## Troubleshooting

### 1. MongoDB Connection Error (`ECONNREFUSED`)
- Ensure your MongoDB server is running:
  - Local service: `mongod` or start MongoDB service from Services on Windows.
  - Or use MongoDB Atlas and set `MONGODB_URI=mongodb+srv://...` in `.env`.

### 2. "Insufficient Evidence" on all queries
- Make sure you have uploaded at least one document and its processing status shows **Processed** (green badge).
- Image-only/scanned PDFs cannot be extracted without OCR; ensure your PDF contains selectable text.

### 3. Port Conflicts
- Default ports are `5000` (server) and `5173` (client). If either is in use, change `PORT` in `.env` and restart.

---

## Limitations & Future Improvements

- **OCR Support**: Current PDF extraction parses text streams via `pdf-parse`. Scanned image PDFs will indicate that no searchable text was found; integrating Tesseract.js is planned.
- **Dense Vector Search**: Current retrieval uses an indexed multi-term keyword matching and scoring engine. A pluggable vector embedding adapter (e.g. OpenAI `text-embedding-3-small` or pgvector) can be dropped into `retrievalService.js`.
- **Live Document Streaming**: Future iterations can stream token generation using Server-Sent Events (SSE).
