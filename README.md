# 💸 EasyPay — Smart UPI Wallet

### Feature-rich UPI Payment Simulation App using AI

🔗 **Live Demo:** https://2303A52110.github.io/EasyPay

📂 **Repository:** https://github.com/2303A52110/EasyPay

---

## 🧠 Overview

**EasyPay** is a fully functional UPI wallet simulation app inspired by popular Indian payment apps like PhonePe and Google Pay.

Built entirely with frontend technologies, it simulates real-world UPI flows including payments, recharges, bill payments, and an AI-powered money assistant that responds in Telugu, Hindi & English.

It provides a simple and interactive interface for users to perform simulated transactions and understand digital payment systems.

---

## ✨ Key Features

- 🔐 **Secure Authentication** — Register & login with 6-digit MPIN + fingerprint biometric
- 💸 **UPI Payments** — Send money via UPI ID, phone number or QR code
- 🗨️ **Chat & Pay** — WhatsApp-style chat with inline payment requests
- 📱 **Recharge** — Mobile, DTH & data recharge with real operator packs
- 🧾 **Bill Payments** — Electricity, water, gas, broadband, OTT & more
- 🗂️ **Transaction History** — Grouped & filterable history with date labels
- 🤖 **EasyAI Assistant** — AI-powered money assistant in Telugu/Hindi/English
- 🏦 **Balance Tracker** — Real-time balance with downloadable bank statement
- 📲 **Scan & Pay** — QR code payment simulation
- ⚙️ **Settings** — Profile management, MPIN change & fingerprint setup

---
```
## 🏗️ System Architecture

[User Input]
   │
   ▼
[Frontend: HTML/CSS/JS]
   │
   ▼
[localStorage: State Management]
   │
   ▼
[Backend: Express (app.js)]
   │
   ▼
[OpenRouter API (EasyAI)]
   │
   ▼
[UI Response]
```
---
```
## 🛠️ Tech Stack

Layer        : Technology
--------------:----------------------------------
Frontend     : HTML5, CSS3, JavaScript (ES6+)
Backend      : Node.js, Express
AI Engine    : OpenRouter API (LLM)
Storage      : Browser localStorage
Fonts        : Google Fonts (Inter, JetBrains Mono)
Deployment   : GitHub Pages
```
---
```
## 📁 Project Structure

EasyPay/
│
├── public/
│   ├── index.html        # Single Page Application
│   ├── css/
│   │   └── style.css     # Styles & animations
│   ├── js/
│   │   └── app.js        # Frontend logic
│
├── app.js                # Express backend + AI proxy
├── package.json          # Dependencies
└── README.md
```
---

## 🤖 EasyAI — Money Assistant

EasyAI is a context-aware banking assistant powered by **OpenRouter API** that:

- 💰 Knows your real balance & transaction history
- 🗣️ Responds naturally in **Telugu, Hindi & English** (Hinglish/Tenglish)
- 📊 Gives spending insights & saving tips
- 🤝 Uses friendly tone — anna, akka, yaar, bro!

---

## ⚠️ Limitations

- Dependent on external API availability
- No real bank integration — simulation only
- Data stored locally, not on a server

---

## 🔮 Future Enhancements

- 🌙 Dark mode UI
- 🔔 Push notifications
- 👤 Cloud-based user authentication
- 📊 Spending analytics & charts
- 🌍 Multi-language full support
- 💳 Virtual card generation

---

## 🌟 Why This Project Matters

This project demonstrates:

- ✅ Real-world AI integration (LLMs via OpenRouter)
- ✅ Full UPI payment flow simulation
- ✅ Mobile-first responsive UI design
- ✅ Frontend state management without a framework
- ✅ Deployment & production readiness

---

## ⭐ Support

If you found this useful:

👉 Give it a ⭐ on GitHub  
👉 Share with others

---

## 🏁 Final Note

EasyPay is a step toward building intelligent fintech tools powered by AI — bridging the gap between learning and real-world application development.
