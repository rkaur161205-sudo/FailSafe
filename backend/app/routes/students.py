from io import StringIO

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.auth import require_faculty
from app.core.database import get_db
from app.models.prediction import Prediction
from app.models.student import Student
from app.models.user import User
from ml.predict import predict_student

router = APIRouter()


def _build_features(row) -> dict:
    return {
        "school": str(row["school"]),
        "sex": str(row["sex"]),
        "age": int(row["age"]),
        "address": str(row["address"]),
        "famsize": str(row["famsize"]),
        "Pstatus": str(row["Pstatus"]),
        "Medu": int(row["Medu"]),
        "Fedu": int(row["Fedu"]),
        "Mjob": str(row["Mjob"]),
        "Fjob": str(row["Fjob"]),
        "reason": str(row["reason"]),
        "guardian": str(row["guardian"]),
        "traveltime": int(row["traveltime"]),
        "studytime": int(row["studytime"]),
        "failures": int(row["failures"]),
        "schoolsup": str(row["schoolsup"]),
        "famsup": str(row["famsup"]),
        "paid": str(row["paid"]),
        "activities": str(row["activities"]),
        "nursery": str(row["nursery"]),
        "higher": str(row["higher"]),
        "internet": str(row["internet"]),
        "romantic": str(row["romantic"]),
        "famrel": int(row["famrel"]),
        "freetime": int(row["freetime"]),
        "goout": int(row["goout"]),
        "Dalc": int(row["Dalc"]),
        "Walc": int(row["Walc"]),
        "health": int(row["health"]),
        "absences": int(row["absences"]),
        "G1": int(row["G1"]),
        "G2": int(row["G2"]),
    }


@router.post("/upload")
def upload_students(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty),
):
    content = file.file.read().decode("utf-8")
    try:
        df = pd.read_csv(StringIO(content))
    except Exception:
        raise HTTPException(status_code=400, detail="Could not parse CSV file")

    required = {
        "student_id", "name", "school", "sex", "age", "address", "famsize", "Pstatus",
        "Medu", "Fedu", "Mjob", "Fjob", "reason", "guardian", "traveltime", "studytime",
        "failures", "schoolsup", "famsup", "paid", "activities", "nursery", "higher",
        "internet", "romantic", "famrel", "freetime", "goout", "Dalc", "Walc", "health",
        "absences", "G1", "G2", "final_grade",
    }
    missing = required - set(df.columns)
    if missing:
        raise HTTPException(status_code=400, detail=f"CSV missing columns: {missing}")

    counts = {"uploaded": 0, "high_risk": 0, "medium_risk": 0, "low_risk": 0}
    user_id = current_user.id  # capture before any flush/commit expires the session object

    for _, row in df.iterrows():
        student = db.query(Student).filter(Student.student_id == str(row["student_id"])).first()
        if not student:
            student = Student(student_id=str(row["student_id"]))
            db.add(student)

        student.uploaded_by = user_id
        student.name = str(row["name"])
        student.age = int(row["age"])
        student.absences = int(row["absences"])
        student.study_time = int(row["studytime"])
        student.failures = int(row["failures"])
        student.famrel = int(row["famrel"])
        student.freetime = int(row["freetime"])
        student.goout = int(row["goout"])
        student.dalc = int(row["Dalc"])
        student.walc = int(row["Walc"])
        student.health = int(row["health"])
        student.medu = int(row["Medu"])
        student.fedu = int(row["Fedu"])
        student.final_grade = int(row["final_grade"])

        db.flush()

        result = predict_student(_build_features(row))

        db.add(Prediction(
            student_id=student.id,
            risk_score=result["risk_score"],
            risk_label=result["risk_label"],
            shap_values=result["shap_values"],
            intervention_plan=result["intervention_plan"],
        ))

        counts["uploaded"] += 1
        counts[f"{result['risk_label']}_risk"] += 1

    db.commit()

    # Return counts + the full refreshed student list for this user
    all_students = db.query(Student).filter(Student.uploaded_by == user_id).all()
    student_list = []
    for s in all_students:
        latest = (
            db.query(Prediction)
            .filter(Prediction.student_id == s.id)
            .order_by(Prediction.created_at.desc())
            .first()
        )
        student_list.append({
            "id": s.id,
            "student_id": s.student_id,
            "name": s.name,
            "final_grade": s.final_grade,
            "risk_label": latest.risk_label if latest else None,
            "risk_score": latest.risk_score if latest else None,
        })

    return {**counts, "students": student_list}


@router.get("/")
def list_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty),
):
    user_id = current_user.id
    students = db.query(Student).filter(Student.uploaded_by == user_id).all()

    result = []
    for student in students:
        latest = (
            db.query(Prediction)
            .filter(Prediction.student_id == student.id)
            .order_by(Prediction.created_at.desc())
            .first()
        )
        result.append({
            "id": student.id,
            "student_id": student.student_id,
            "name": student.name,
            "final_grade": student.final_grade,
            "risk_label": latest.risk_label if latest else None,
            "risk_score": latest.risk_score if latest else None,
        })

    return result


@router.delete("/bulk")
def delete_students_bulk(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty),
):
    user_id = current_user.id
    student_ids = payload.get("student_ids", [])
    if not student_ids:
        raise HTTPException(status_code=400, detail="No student IDs provided")

    students = (
        db.query(Student)
        .filter(Student.student_id.in_(student_ids), Student.uploaded_by == user_id)
        .all()
    )
    if not students:
        raise HTTPException(status_code=404, detail="No matching students found")

    internal_ids = [s.id for s in students]
    db.query(Prediction).filter(Prediction.student_id.in_(internal_ids)).delete(synchronize_session=False)
    db.query(Student).filter(Student.id.in_(internal_ids)).delete(synchronize_session=False)
    db.commit()
    return {"deleted": len(students)}


@router.delete("/{student_id}")
def delete_student(
    student_id: str,
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

    db.query(Prediction).filter(Prediction.student_id == student.id).delete()
    db.delete(student)
    db.commit()
    return {"detail": "Student deleted"}


@router.get("/{student_id}/history")
def get_student_history(
    student_id: str,
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

    predictions = (
        db.query(Prediction)
        .filter(Prediction.student_id == student.id)
        .order_by(Prediction.created_at.asc())
        .all()
    )

    return [
        {
            "risk_score": p.risk_score,
            "risk_label": p.risk_label,
            "created_at": p.created_at,
        }
        for p in predictions
    ]


@router.get("/{student_id}/prediction")
def get_student_prediction(
    student_id: str,
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

    return {
        "student_id": student.student_id,
        "name": student.name,
        "final_grade": student.final_grade,
        "risk_score": prediction.risk_score,
        "risk_label": prediction.risk_label,
        "shap_values": prediction.shap_values,
        "intervention_plan": prediction.intervention_plan,
        "predicted_at": prediction.created_at,
        "intervention_applied": prediction.intervention_applied or False,
        "intervention_applied_at": prediction.intervention_applied_at,
        "intervention_notes": prediction.intervention_notes,
    }
