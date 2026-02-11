# ShiftTrack 🕒

A comprehensive workforce management and shift analytics platform. **ShiftTrack** allows businesses to parse raw shift data from PDFs, visualize labor compliance, and detect policy violations through an intuitive dashboard.

---

## 🏗️ Technical Stack

### **Backend (Shift Engine)**
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+)
- **Database**: [SQLModel](https://sqlmodel.tiangolo.com/) with **PostgreSQL**
- **PDF Infrastructure**: [pdfplumber](https://github.com/jsvine/pdfplumber) for high-precision data extraction
- **Data Validation**: Pydantic v2
- **Alerting**: Rule-based detection for overtime, break violations, and split shifts

### **Frontend (ShiftPulse)**
- **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language**: TypeScript
- **State Management**: [Redux Toolkit](https://redux-toolkit.js.org/) + [RTK Query](https://redux-toolkit.js.org/rtk-query/overview) (API Sync)
- **Charts**: [Recharts](https://recharts.org/) (Interactive analytics)
- **Styling**: Tailwind CSS + Custom Glassmorphism System
- **Icons**: Lucide React

---

## 🚀 Getting Started

### **1. Backend Setup**
Navigate to the backend directory and initialize the environment:

```bash
cd Backend

# Create virtual environment
python3 -m venv .venv

# Activate environment
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the API server
uvicorn main:app --port 8000 --reload
```

### **2. Running the Parser**
To ingest shift data from your provider's PDF reports:

```bash
cd Backend
source .venv/bin/activate

# Execute the parser
python parse_shifts.py doc/your_shift_report.pdf
```
*The parser will extract shift timings, employee names, and break data, then store them in the configured PostgreSQL database.*

### **3. Frontend Setup**
Navigate to the frontend directory and start the dev server:

```bash
cd ShiftPulse

# Install dependencies
npm install

# Set up environment variables
# Ensure VITE_API_BASE_URL=http://localhost:8000 is set in .env

# Start development server
npm run dev
```

*Note: Ensure the backend `.env` file contains a valid `DATABASE_URL` (e.g., `postgresql://user:password@localhost/dbname`).*

---

## 📊 Core Features

- **Dashboard Overview**: Real-time summary of labor vs. schedule variance.
- **Compliance Engine**: Automatic detection of shifts worked without legally mandated breaks.
- **Analytical Charts**: Scatter plots for shift vs. break correlations and labor trends.
- **Employee Directory**: Deep-dive into individual employee performance and attendance scores.
- **Smart Alerts**: High-priority notifications for missed shifts or excessive overtime (>0.5h).

---

## 📂 Project Structure

- `/Backend`: FastAPI app, SQLModel schemas, and PDF parsing pipeline.
- `/ShiftPulse`: React application with RTK Query and Recharts.
- `/doc`: Directory for source shift data PDFs.
