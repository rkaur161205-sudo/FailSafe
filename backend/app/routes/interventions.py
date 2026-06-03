from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.auth import require_faculty
from app.core.database import get_db
from app.models.prediction import Prediction
from app.models.student import Student
from app.models.user import User

router = APIRouter()


class InterventionUpdate(BaseModel):
    notes: Optional[str] = None


@router.patch("/{student_id}")
def mark_intervention_applied(
    student_id: str,
    body: InterventionUpdate = InterventionUpdate(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty),
):
    student = (
        db.query(Student)
        .filter(Student.student_id == student_id, Student.uploaded_by == current_user.id)
        .first()
    )
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    prediction = (
        db.query(Prediction)
        .filter(Prediction.student_id == student.id)
        .order_by(Prediction.created_at.desc())
        .first()
    )
    if not prediction:
        raise HTTPException(status_code=404, detail="No prediction found for this student")

    prediction.intervention_applied = True
    prediction.intervention_applied_at = datetime.utcnow()
    prediction.intervention_notes = body.notes
    db.commit()
    db.refresh(prediction)

    return {
        "student_id": student.student_id,
        "intervention_applied": prediction.intervention_applied,
        "intervention_applied_at": prediction.intervention_applied_at,
        "intervention_notes": prediction.intervention_notes,
    }


@router.get("/")
def list_interventions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty),
):
    students = db.query(Student).filter(Student.uploaded_by == current_user.id).all()

    result = []
    for student in students:
        prediction = (
            db.query(Prediction)
            .filter(Prediction.student_id == student.id)
            .order_by(Prediction.created_at.desc())
            .first()
        )
        result.append({
            "student_id": student.student_id,
            "name": student.name,
            "risk_label": prediction.risk_label if prediction else None,
            "intervention_plan": prediction.intervention_plan if prediction else None,
            "intervention_applied": prediction.intervention_applied if prediction else False,
            "intervention_applied_at": prediction.intervention_applied_at if prediction else None,
            "intervention_notes": prediction.intervention_notes if prediction else None,
        })

    return result
