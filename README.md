# FailSafe — Student Risk Intelligence Platform

> Predict which students are at risk of academic failure before it's too late.

FailSafe is a full-stack web application that uses **XGBoost + SHAP** to identify at-risk students from uploaded CSV data, explain *why* each student is flagged, and help faculty track interventions — all through a clean, role-based dashboard.

---

## Screenshots

| Faculty Dashboard | Student Detail | HOD Overview |
|---|---|---|
| Upload CSV, view risk stats & model insights | SHAP bars, risk history chart, intervention tracking | Department-wide risk breakdown across all faculty |

---

## Features

| Feature | Description |
|---|---|
| **Role-based auth** | Faculty and HOD accounts with JWT — each role sees a different dashboard |
| **CSV bulk upload** | Upload student records; predictions run instantly and the list updates in one shot |
| **Risk prediction** | XGBoost classifies each student as High / Medium / Low risk with a probability score |
| **SHAP explanations** | Per-student bar chart showing exactly which features increased or decreased risk |
| **Intervention plans** | Context-aware recommendations auto-selected based on the top risk factor |
| **Intervention tracking** | Mark as applied, add notes, see the date — persisted per student |
| **Risk history** | SVG line chart tracking a student's risk score across multiple upload cycles |
| **HOD dashboard** | Top at-risk students across all faculty, per-faculty risk breakdown table |
| **Bulk delete** | Checkbox-select multiple students and remove them with one click |
| **Model insights** | Feature importance (SHAP) and risk distribution plots served from the backend |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v3, Axios |
| Backend | FastAPI, SQLAlchemy, Alembic, Pydantic |
| Database | PostgreSQL |
| ML | XGBoost, SHAP, scikit-learn, pandas |
| Auth | JWT (python-jose), bcrypt (passlib) |

---

## Project Structure

```
FAILSAFE/
├── backend/
│   ├── app/
│   │   ├── core/          # Config, database session, JWT auth, security
│   │   ├── models/        # SQLAlchemy models — User, Student, Prediction
│   │   ├── routes/        # API routers — auth, students, hod, interventions, ml
│   │   └── schemas/       # Pydantic request/response schemas
│   ├── ml/
│   │   ├── data/          # Training CSV + sample upload files
│   │   ├── train.py       # Training script — XGBoost + SHAP + plot generation
│   │   └── predict.py     # Inference module loaded at startup
│   ├── alembic/           # Database migration scripts
│   ├── .env               # Environment variables (not committed)
│   └── requirements.txt
└── frontend/
    └── src/
        ├── api/           # Axios client with JWT bearer interceptor
        └── pages/         # Login, Register, Dashboard, StudentDetail, HodDashboard
```

---

## Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL (running locally)

---

### 1 — Database

```sql
CREATE DATABASE failsafe;
```

---

### 2 — Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

pip install -r requirements.txt
```

Create `backend/.env`:

```env
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=failsafe
SECRET_KEY=any_long_random_string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

Run migrations and train the model:

```bash
python -m alembic upgrade head
python ml/train.py
```

Start the server:

```bash
uvicorn app.main:app
```

Runs at **http://localhost:8000**

---

### 3 — Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs at **http://localhost:5173**

---

## CSV Upload Format

The student CSV must contain the UCI Student Performance dataset fields used by the model, plus `student_id`, `name`, and `final_grade`:

```
student_id, name, school, sex, age, address, famsize, Pstatus,
Medu, Fedu, Mjob, Fjob, reason, guardian, traveltime, studytime,
failures, schoolsup, famsup, paid, activities, nursery, higher,
internet, romantic, famrel, freetime, goout, Dalc, Walc, health,
absences, G1, G2, final_grade
```

A sample file is at `backend/ml/data/sample_students.csv`.

---

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Create faculty or HOD account |
| POST | `/auth/login` | — | Login, receive JWT |
| POST | `/students/upload` | Faculty | Upload CSV, run predictions |
| GET | `/students/` | Faculty | List own students with latest risk |
| DELETE | `/students/bulk` | Faculty | Delete multiple students by ID |
| DELETE | `/students/{id}` | Faculty | Delete a single student |
| GET | `/students/{id}/prediction` | Faculty | Full prediction + SHAP values |
| GET | `/students/{id}/history` | Faculty | All predictions over time |
| PATCH | `/interventions/{id}` | Faculty | Mark intervention applied |
| GET | `/hod/overview` | HOD | Department stats + top at-risk |
| GET | `/hod/faculty-breakdown` | HOD | Per-faculty risk counts |
| GET | `/ml/plots/{name}` | — | Serve model insight PNG |

---

## Model Details

- **Algorithm:** XGBoost (`n_estimators=200`, `max_depth=5`, `learning_rate=0.05`, `subsample=0.8`, `colsample_bytree=0.8`)
- **Dataset:** UCI Student Performance (`backend/ml/data/student-mat.csv`)
- **Target:** `G3 < 10` → at risk (binary classification)
- **Training output:** SHAP feature-importance plot and risk-distribution plot are generated during training and exposed via `/ml/plots/{feature_importance|risk_distribution}`
- **Top risk factors (SHAP):** derived from the trained model at runtime; the exact ranking depends on the current training run
