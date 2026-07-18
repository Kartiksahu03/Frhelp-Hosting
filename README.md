1. FrHelp

```markdown
<div align="center">

# 🎓 FrHelp — AI-Powered EdTech Platform

**Learn, enroll, and get help — with an AI that actually knows your course.**

A full-stack learning platform with role-based access for students, instructors, and admins — course enrollment, progress tracking, payments, and a Groq-powered AI assistant, all built from scratch.

[![Live Demo](https://img.shields.io/badge/Live_Demo-000?style=for-the-badge&logo=vercel&logoColor=white)](https://frhelp-frontend.vercel.app/)
&nbsp;
[![MERN](https://img.shields.io/badge/Stack-MERN-00C853?style=for-the-badge)](#tech-stack)
&nbsp;
[![Groq](https://img.shields.io/badge/AI-Groq_LLaMA_3.3-FF6F00?style=for-the-badge)](#)
&nbsp;
[![Razorpay](https://img.shields.io/badge/Payments-Razorpay-0C2451?style=for-the-badge)](#)

</div>

---

## 🔗 Links

- **Live app:** https://frhelp-frontend.vercel.app/
- **Source code:** https://github.com/Kartiksahu03/Frhelp-Hosting
- **Portfolio:** https://kartik-s-portfolio-tau.vercel.app
- **LinkedIn:** https://linkedin.com/in/kartik-sahu03

> ⚠️ The backend runs on Render's free tier, which sleeps after inactivity — the first load may take ~30–50 seconds to wake up.

---

## ✨ Features

- **👥 Role-based access** — separate Student, Instructor, and Admin experiences, all enforced server-side, not just hidden in the UI.
- **🔐 15+ protected routes** — JWT authentication and authorization middleware guard every sensitive endpoint.
- **📚 Course management** — 100+ courses with enrollment, progress tracking, and instructor-side course creation.
- **💳 Integrated payments** — Razorpay handles order creation, payment verification, and automatic enrollment on success.
- **🤖 AI assistant** — Groq-powered assistant classifies 10+ user intent categories (e.g. "how do I enroll," "where's my progress," "refund policy") and responds accordingly, cutting down manual support load.
- **📱 Responsive UI** — built with React and Tailwind CSS, works cleanly across screen sizes.
- **☁️ Production deployment** — Vercel (frontend) + Render (backend) + MongoDB Atlas (database).

---

## 🛠️ Tech Stack

**Frontend:** React.js · Redux Toolkit · Tailwind CSS · Axios

**Backend:** Node.js · Express.js · MongoDB (Mongoose) · JWT

**Payments:** Razorpay

**AI:** Groq API (LLaMA 3.3) — intent classification & assistant responses

**Storage:** Cloudinary (media)

**Deployment:** Vercel · Render · MongoDB Atlas

---

## 🏗️ Architecture

```
frhelp/
├── client/                 # React frontend
│   └── src/
│       ├── app/            # Redux store
│       ├── features/       # auth · courses · enrollment · ai (slice + api each)
│       ├── components/     # layout · course-cards · dashboard · ai-chat
│       ├── pages/          # role-specific dashboards: Student · Instructor · Admin
│       └── services/       # axios instance + JWT interceptors
│
└── server/                 # Express + MongoDB API
    ├── models/             # User · Course · Enrollment · Payment
    ├── controllers/        # auth · course · enrollment · payment · ai
    ├── routes/             # one router per domain, role-gated
    ├── middlewares/        # JWT protect · role-check · error handler
    └── services/           # razorpayService.js · aiService.js
```

Role checks happen in a dedicated middleware layer after JWT verification, so each route declares which roles can access it rather than checking permissions inline in controllers.

---

## 🚀 Getting Started (Local)

### Prerequisites
- Node.js 18+
- A [MongoDB Atlas](https://www.mongodb.com/atlas) connection string
- A [Razorpay](https://razorpay.com/) test account (key ID + secret)
- A free [Groq API key](https://console.groq.com/keys)

### 1. Clone
```bash
git clone https://github.com/Kartiksahu03/Frhelp-Hosting.git
cd Frhelp-Hosting
```

### 2. Backend
```bash
cd server
npm install
cp .env.example .env
npm run dev
```

`server/.env`:
```
PORT=5000
MONGO_URI=your_mongodb_atlas_uri
JWT_SECRET=any_long_random_string
JWT_EXPIRES_IN=7d
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
GROQ_API_KEY=your_groq_key
CLIENT_URL=http://localhost:5173
```

### 3. Frontend
```bash
cd client
npm install
cp .env.example .env
npm run dev
```

`client/.env`:
```
VITE_API_URL=http://localhost:5000/api
```

Open the printed URL and sign up as a Student, or seed an Instructor/Admin account [ ]describe how, if there's a seed script or manual DB flag.

---

## 🤖 How the AI Assistant Works

[ ] — one or two lines on the actual mechanism, mirroring what you wrote for Paisa, e.g.: "User questions are sent to Groq with a fixed intent-category schema and few-shot examples; the classified intent routes to a handler that pulls the relevant course/enrollment data before responding."

---

## 🗺️ Roadmap

- [ ] Automated test suite (Jest + Supertest)
- [ ] Docker + docker-compose for one-command local setup
- [ ] Instructor-side analytics dashboard
- [ ] Email notifications for enrollment/payment confirmation

---

## 👤 Author

**Kartik Sahu** — Full-Stack Developer
[Portfolio](https://kartik-s-portfolio-tau.vercel.app) · [GitHub](https://github.com/Kartiksahu03) · [LinkedIn](https://linkedin.com/in/kartik-sahu03)

---

<div align="center">
<sub>Built with the MERN stack, Razorpay, and Groq AI.</sub>
</div>
```
