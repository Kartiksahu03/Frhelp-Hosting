# FrHelp — AI-Powered EdTech Platform

[Live Demo](YOUR_LIVE_LINK) · [Portfolio](https://kartik-s-portfolio-tau.vercel.app/)

![FrHelp Screenshot](ADD_SCREENSHOT_PATH_OR_URL)

A production-grade EdTech platform with role-based access, course enrollment, payments, and an AI assistant — built end-to-end with the MERN stack.

## Features
- 🔐 JWT authentication across 15+ protected routes
- 👥 3 role types with RBAC: Student, Instructor, Admin
- 📚 100+ courses with enrollment & progress tracking
- 💳 Razorpay payment gateway — order creation, verification, enrollment automation
- 🤖 Groq-powered AI assistant handling 10+ user intent categories
- ☁️ Deployed on Vercel (frontend) + Render (backend) + MongoDB Atlas

## Tech Stack
React.js · Redux Toolkit · Node.js · Express.js · MongoDB Atlas · JWT · Razorpay · Groq AI · Cloudinary · Tailwind CSS

## Architecture
[ ] — a one-paragraph note on how the pieces fit together, e.g.: "React SPA calls a REST API built on Express. MongoDB stores users/courses/enrollments as separate collections linked by ObjectId refs. JWT middleware gates all `/api/protected/*` routes; role checks happen in a second middleware layer after auth."

## Getting Started
\`\`\`bash
git clone https://github.com/Kartiksahu03/[REPO_NAME].git
cd [REPO_NAME]
npm install

# backend .env
MONGO_URI=[ ]
JWT_SECRET=[ ]
RAZORPAY_KEY_ID=[ ]
RAZORPAY_KEY_SECRET=[ ]
GROQ_API_KEY=[ ]

npm run dev
\`\`\`

## What I'd improve next
[ ] — one or two honest lines here (e.g. "add automated tests for the enrollment flow," "containerize with Docker") shows self-awareness and works in your favor in interviews.
