# 🏋️‍♂️ BluGym

Sistem manajemen gym modern yang dibangun dengan **React**, **TypeScript**, dan **Supabase**. Proyek ini difokuskan pada arsitektur kode yang bersih (Feature-Based) dan logika bisnis yang kompleks untuk penjadwalan trainer.

## 🚀 Live Demo
**URL:** [https://ltf-gym-manager.vercel.app](https://ltf-gym-manager.vercel.app)  
**Demo Credentials:** `admin@example.com` / `password123`

## ✨ Key Features
- **Feature-Based Architecture:** Scalable and maintainable structure.
- **Trainer Schedule Manager:** Complex logic for managing shifts and off-days.
- **PT Session Booking:** Real-time availability check and booking system.
- **Responsive Design:** Built with Tailwind CSS for all devices.

## 🏗️ Architecture
This project uses a **Feature-Based Architecture**. Each feature (Members, Trainers, Sessions) is self-contained with its own hooks, services, and components.

> See detailed ARCHITECTURE.md for more info.

## 🛠️ Tech Stack
- **Frontend:** React, TypeScript, Tailwind CSS, React Router
- **Backend:** Supabase (Auth, Database, Real-time)
- **State Management:** React Hooks (Custom Hooks)

## 📦 Installation
```bash
git clone https://github.com/username/ltf-gym-manager.git
cd ltf-gym-manager
npm install
npm run dev
```

## 📝 Note on Logic
The scheduling system implements specific gym rules:
- Max 2 off-days per week.
- Max 1 weekday off.
- Automatic filtering of trainers based on their specialty and branch.

---
Developed by Dennis Hidayat