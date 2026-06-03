from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Text, DateTime, ForeignKey, JSON, Boolean
from app.core.database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    risk_score = Column(Float)
    risk_label = Column(String)
    shap_values = Column(JSON)
    intervention_plan = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    intervention_applied = Column(Boolean, default=False)
    intervention_applied_at = Column(DateTime, nullable=True)
    intervention_notes = Column(Text, nullable=True)
