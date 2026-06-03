from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from app.core.database import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    age = Column(Integer)
    absences = Column(Integer)
    study_time = Column(Integer)
    failures = Column(Integer)
    famrel = Column(Integer)
    freetime = Column(Integer)
    goout = Column(Integer)
    dalc = Column(Integer)
    walc = Column(Integer)
    health = Column(Integer)
    medu = Column(Integer)
    fedu = Column(Integer)
    final_grade = Column(Integer)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
