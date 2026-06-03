from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.auth import require_hod
from app.core.database import get_db
from app.models.prediction import Prediction
from app.models.student import Student
from app.models.user import User

router = APIRouter()


def _latest_prediction_subquery(db: Session):
    return (
        db.query(
            Prediction.student_id,
            func.max(Prediction.created_at).label("latest_at"),
        )
        .group_by(Prediction.student_id)
        .subquery()
    )


@router.get("/overview")
def hod_overview(
    db: Session = Depends(get_db),
    _: User = Depends(require_hod),
):
    latest_sq = _latest_prediction_subquery(db)

    latest_preds = (
        db.query(Prediction)
        .join(latest_sq, (Prediction.student_id == latest_sq.c.student_id) &
              (Prediction.created_at == latest_sq.c.latest_at))
        .all()
    )

    total = len(latest_preds)
    high = sum(1 for p in latest_preds if p.risk_label == "high")
    medium = sum(1 for p in latest_preds if p.risk_label == "medium")
    low = sum(1 for p in latest_preds if p.risk_label == "low")
    avg_score = (sum(p.risk_score for p in latest_preds) / total) if total else 0.0
    risk_pct = (high / total * 100) if total else 0.0

    top_pred_ids = sorted(latest_preds, key=lambda p: p.risk_score, reverse=True)[:10]

    top_at_risk = []
    for pred in top_pred_ids:
        student = db.query(Student).filter(Student.id == pred.student_id).first()
        uploader = db.query(User).filter(User.id == student.uploaded_by).first() if student else None
        top_at_risk.append({
            "student_id": student.student_id if student else None,
            "name": student.name if student else None,
            "risk_score": pred.risk_score,
            "risk_label": pred.risk_label,
            "final_grade": student.final_grade if student else None,
            "uploaded_by_email": uploader.email if uploader else None,
        })

    return {
        "total_students": total,
        "high_risk": high,
        "medium_risk": medium,
        "low_risk": low,
        "risk_percentage": round(risk_pct, 1),
        "avg_risk_score": round(avg_score, 3),
        "top_at_risk": top_at_risk,
    }


@router.get("/faculty-breakdown")
def faculty_breakdown(
    db: Session = Depends(get_db),
    _: User = Depends(require_hod),
):
    latest_sq = _latest_prediction_subquery(db)

    faculty_members = db.query(User).filter(User.role == "faculty").all()

    result = []
    for faculty in faculty_members:
        students = db.query(Student).filter(Student.uploaded_by == faculty.id).all()
        student_ids = [s.id for s in students]

        if not student_ids:
            continue

        preds = (
            db.query(Prediction)
            .join(latest_sq, (Prediction.student_id == latest_sq.c.student_id) &
                  (Prediction.created_at == latest_sq.c.latest_at))
            .filter(Prediction.student_id.in_(student_ids))
            .all()
        )

        result.append({
            "faculty_name": faculty.full_name,
            "faculty_email": faculty.email,
            "total_students": len(preds),
            "high_risk": sum(1 for p in preds if p.risk_label == "high"),
            "medium_risk": sum(1 for p in preds if p.risk_label == "medium"),
            "low_risk": sum(1 for p in preds if p.risk_label == "low"),
        })

    return result
