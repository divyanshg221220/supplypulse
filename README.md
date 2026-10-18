# SupplyPulse 🌐⚡

**Real-time AI-Powered Supply Chain Risk Monitoring & Autonomous Logistics Intelligence**

SupplyPulse is a modern, high-performance web platform designed to give operations teams, logistics directors, and supply chain analysts full situational awareness across their global supply network. By combining interactive geospatial mapping, predictive 72-hour risk modeling, generative AI event intelligence, anomaly detection, and real-time reroute scenario simulations, SupplyPulse turns supply chain disruptions into actionable decisions.

---

## ✨ Key Features

- 🗺️ **Interactive Global Logistics Network**:
  - Leaflet-powered global topology tracking suppliers, factories, ports, distribution centers, and warehouses across Americas, EMEA, and APAC.
  - Multi-modal route visualization (Sea, Air, Rail, Road) with live status indications, shipment counts, and transit lead times.

- 📈 **72-Hour Risk Forecast & Executive KPIs**:
  - Predictive risk timeline tracking regional risk progression.
  - Core performance metrics: Network Health Score, On-Time Delivery Rate, High-Risk Node Counters, and Disruption Impact values.

- 🤖 **Gemini AI Event Intelligence**:
  - Live external event correlation (severe weather, geopolitical shifts, labor strikes, port congestions).
  - AI-driven root-cause assessments, proactive mitigation recommendations, and impact scoring.

- ⚠️ **Anomaly Detection & Real-Time Alerts**:
  - Categorized alert streams (`weather`, `congestion`, `supplier`, `transit`, `quality`, `geopolitical`).
  - Severity-tiered alerts (`critical`, `warning`, `info`) with contextual deep-dives per node.

- 🔄 **Autonomous Reroute & Scenario Simulator**:
  - What-if simulation engine to test trade-offs between cost, lead-time variance, and carbon footprint before executing reroutes.
  - Interactive multi-modal center and node inspection drawer.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Frontend / UI**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS v4](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/) / Base UI
- **Mapping & Charts**: [Leaflet](https://leafletjs.com/) & [React-Leaflet](https://react-leaflet.js.org/), [Recharts](https://recharts.org/)
- **Icons & Styling**: [Lucide React](https://lucide.dev/), `tw-animate-css`, `clsx`, `tailwind-merge`
- **AI Integration**: Google Gemini API for real-time risk intelligence & scenario analysis
- **Package Manager**: [pnpm](https://pnpm.io/)

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18.18+ or v20+ recommended)
- [pnpm](https://pnpm.io/) (v9+ or matching `packageManager` specification)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/divyanshg221220/supplypulse.git
   cd supplypulse
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**:
   Create a `.env.local` file in the root directory:
   ```env
   # Google Gemini API Key for AI Event Intelligence
   GEMINI_API_KEY=your_gemini_api_key_here
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Run the development server**:
   ```bash
   pnpm dev
   ```

5. **Open in browser**:
   Navigate to [http://localhost:3000](http://localhost:3000) to view the dashboard.

---

## 📂 Project Structure

```text
supplypulse/
├── app/                        # Next.js App Router
│   ├── api/                    # Server-side API endpoints
│   │   ├── ai/                 # AI intelligence & Gemini integration
│   │   ├── anomalies/          # Anomaly detection endpoints
│   │   ├── health/             # Health check & status APIs
│   │   ├── nodes/              # Supply node details & queries
│   │   ├── routes/             # Transit route calculations
│   │   └── simulate/           # Disruption scenario engine
│   ├── globals.css             # Theme definitions and base styles
│   ├── layout.tsx              # Root HTML shell & metadata
│   └── page.tsx                # Main Dashboard entry point
├── components/                 # React UI components
│   ├── dashboard/              # Domain-specific modules
│   │   ├── alerts-feed.tsx     # Disruption alert feed
│   │   ├── anomaly-center.tsx  # Anomaly tracking dashboard
│   │   ├── dashboard-shell.tsx # Core responsive dashboard container
│   │   ├── logistics-map.tsx   # Interactive Leaflet map canvas
│   │   ├── multimodal-center.tsx # Multi-modal transport analytics
│   │   ├── node-drawer.tsx     # Detailed node inspection slide-over
│   │   ├── reroute-modal.tsx   # Contingency rerouting modal
│   │   └── scenario-simulator.tsx # What-if scenario testing tool
│   └── ui/                     # Reusable design system primitives
├── lib/                        # Utilities & domain services
│   ├── api.ts                  # Client-side API fetchers
│   ├── simulation-engine.ts    # Lead time, cost & risk calculations
│   ├── supply-data.ts          # Network topology & mock supply data
│   └── utils.ts                # Style & utility helpers
└── public/                     # Static assets, icons, and map markers
```

---

## 📦 Available Scripts

- `pnpm dev` – Starts the development server at `localhost:3000`.
- `pnpm build` – Compiles and builds the production bundle.
- `pnpm start` – Starts the Next.js production server.

---

## 🤝 Contributing

Contributions, feedback, and feature requests are welcome! Feel free to check the issues page or submit a pull request.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
