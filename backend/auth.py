import hashlib
from datetime import date

from sqlalchemy.orm import Session

from models import Student


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def generate_student_id(
    db: Session,
    registration_date: date,
    course_id: int,
) -> str:
    year_prefix = registration_date.year
    prefix = f"STD{year_prefix}{course_id:02d}"

    count = db.query(Student).filter(Student.student_id.like(f"{prefix}%")).count() + 1
    return f"{prefix}{count:03d}"
