# 📖 MenuxPro Help Center & Operational Guide

Welcome to the **MenuxPro** ecosystem. This document serves as the master guide explaining what MenuxPro is, how it transforms café and restaurant operations, and how it delivers value to both **Restaurant Owners** and **End-Customers**.

---

## 🌟 What is MenuxPro?

**MenuxPro** is a premium, bilingual (French & Arabic), real-time digital QR menu and table-ordering Operating System tailored for the modern food and beverage industry (with a primary focus on Tunisia and the MENA region). 

Rather than acting as a static PDF viewer, MenuxPro turns every table's QR code into an interactive, real-time client terminal connected directly to a cashier/kitchen dashboard. It merges premium aesthetics (warm cream `#FCFBF9`, espresso `#3A322D`, and caramel `#C9A07E`) with high-performance real-time synchronization.

---

## 🏢 How MenuxPro Helps Restaurant Owners

Modern restaurant management suffers from high staff turnover, order delays, billing errors, and rising printing costs. MenuxPro provides a complete operational cockpit to solve these challenges:

### 1. Massive Operational Efficiency
* **Waiter Time Optimization**: Serveurs no longer need to walk to a table three times (once to hand the menu, once to take the order, and once to bring the bill). They only walk to deliver the food, reducing waiter workloads by up to 50%.
* **Zero Order Errors**: Since customers input their own orders and notes (e.g., "sans oignons" or "glace supplémentaire") directly from their phone, cashier transcription errors are eliminated.
* **Instant Menu Updates**: Out of espresso beans? Changing pricing for the weekend? Owners can edit items, upload photos, and update availability instantly in the dashboard without wasting money on reprint costs.

### 2. Boosted Revenues & Faster Table Rotation
* **Increased Average Order Value (AOV)**: Elegant visual categorization, daily specials prompts, and frictionless one-click additions encourage customers to order more, boosting average order sizes by **20% to 25%**.
* **Accelerated Table Turnover**: Shortening order submission and bill settlement times reduces overall table sitting duration, allowing owners to seat more customers during busy rush hours.

### 3. Real-Time Cashier Console (`/dashboard/kitchen`)
* Powered by **Supabase Realtime**, the cashier dashboard plays instant sound alerts and displays incoming table requests or orders in milliseconds.
* Cashiers can track table states (`EMPTY` → `ACTIVE` → `AWAITING_PAYMENT`) and coordinate kitchen staff seamlessly.

---

## ☕ How MenuxPro Helps Customers (Clients)

For customers, ordering at busy cafés can be frustrating. MenuxPro creates a frictionless, luxury experience right at their fingertips:

### 1. True "Zero-Friction" Ordering
* **No Apps to Download**: Scanning the QR code opens the digital menu instantly in the phone's browser.
* **Natively Bilingual (French / Arabic)**: Instantly toggle language views with full Right-to-Left (RTL) support. Customers can browse and read descriptions in their preferred local language.

### 2. Transparent Order Timeline (`/r/[slug]/t/[tableId]/sent`)
* Once ordered, customers can watch their preparation timeline update live on screen (e.g., "En préparation" ⏳, "Servi" ☕).
* This transparency reduces anxiety and makes wait times feel shorter.

### 3. Service Commands at a Touch
* **Appeler le Serveur**: Customers can trigger a service call directly from their screen. The cashier dashboard flashes an alert showing the exact table ID calling for assistance.
* **Demander l'Addition**: Clients can request the bill in one click. Cashiers immediately get a `BILL_REQUESTED` notification and can prepare the receipt, saving valuable minutes during checkout.

---

## 📊 Plan Structure & Pricing Tiers

MenuxPro features structured subscription tiers designed to support cafés from startup stages to multi-venue scaling:

| Plan | Pricing | Target Audience | Core Features |
| :--- | :--- | :--- | :--- |
| **FREE** | **0 DT/mois** | Startup & Testing | QR Menu (Consultation only), up to 8 items, randomized slug (`/r/free-xxxx`), Menux watermark. |
| **PRO** | **19 DT/mois** | Standard Cafés & Diners | **Unlimited items**, custom slug (`/r/mon-cafe`), no watermark, **real-time table orders**, cashier console, activity logs, daily email summaries. |
| **MAX** | **49 DT/mois** | Premium Establishments | All PRO features, **White-Label** (no Menux branding), custom CSS editor, custom favicon/favicon, priority WhatsApp support. |

---

## 🛠️ The Technology Behind the Experience

MenuxPro is built using a modern, serverless, high-performance stack:

* **Frontend**: Next.js 14 App Router with Tailwind CSS, custom fonts (Playfair Display & Noto Sans Arabic), and micro-animations for a smooth, premium feel.
* **Real-time Engine**: **Supabase Realtime** powers the instant sync pipeline between table transactions and cashier screens.
* **Authentication**: **Firebase Auth** handles secure staff credentials, PIN codes, and SuperAdmin customized claims.
* **Database**: **PostgreSQL** configured via **Prisma ORM** for transaction safety.
