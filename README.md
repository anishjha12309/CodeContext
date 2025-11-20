# CodeContext

CodeContext is a developer-focused web application that makes code review clearer, collaborative, and context-rich. It combines a modern Next.js interface, real-time collaboration features, and meeting/transcription capabilities to streamline how teams understand and discuss code.

## 🚀 Overview

The platform allows developers to upload and explore code with proper structure, review files with line-level context, collaborate in real-time, and even run meetings with optional transcription. Everything is built with full-stack type-safety and a clean architecture designed for scaling.

## 🧱 Tech Stack

- **Next.js (App Router)** – UI + routing  
- **TypeScript** – full-stack type-safety  
- **Tailwind CSS** – fast, minimal UI styling  
- **tRPC** – type-safe API layer  
- **Prisma** – database ORM  
- **Supabase** – file storage + real-time channels  
- **AssemblyAI** – meeting transcription (optional)  
- **ESLint + Prettier** – code quality and formatting  
- **WebRTC / WebSockets** – real-time meetings + presence  

## ✨ Core Features

### 📄 Contextual Code Review
- View files with surrounding context  
- Clean UI for code navigation  
- Line-level comments and threaded discussions  

### 👥 Real-Time Collaboration
- Live presence indicators  
- State sync across multiple reviewers  
- Smooth multi-user interactions  

### 🎥 Meetings + Transcription
- Start/join project-linked meetings  
- Share code context during calls  
- Optional audio recording & transcription using AssemblyAI  
- Transcripts stored & searchable inside the project  

### 📤 File Uploads
- Upload and manage project files via Supabase Storage  

### 💳 Mock Payment Flow
- Included demo subscription flow (for feature gating)  

## 📂 Project Structure
/
├─ src/
│ ├─ app/ # Next.js routes & pages
│ ├─ components/ # Reusable UI components
│ ├─ lib/ # Helpers (uploads, payments, utils)
│ ├─ server/
│ │ ├─ api/ # tRPC routers
│ │ └─ db/ # Prisma client
│ └─ styles/ # Tailwind styles
├─ prisma/ # Prisma schema & migrations
├─ public/ # Assets
└─ start-database.sh
