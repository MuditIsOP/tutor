import json
import os
import secrets
from datetime import date, datetime
from pathlib import Path
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session

from ai_service import (
    AIConfigurationError,
    SyllabusContext,
    build_quiz_system_prompt,
    build_tutor_system_prompt,
    create_chat_completion,
    create_quiz_completion,
    infer_student_level,
    normalize_quiz_payload,
)
from auth import generate_student_id, hash_password
from database import Base, SessionLocal, engine, get_db
from models import Admin, ChatHistory, Course, Module, QuizAttempt, QuizSession, Student, Subject, Topic, TopicProgress
from schemas import (
    AdminCourseCreateRequest,
    AdminCourseUpdateRequest,
    AdminLoginRequest,
    AdminLoginResponse,
    AdminProfile,
    AdminStudentCreateRequest,
    AdminStudentUpdateRequest,
    AdminSubjectUpsertRequest,
    AITutorRequest,
    AITutorResponse,
    ChatMessageResponse,
    CourseResponse,
    LoginRequest,
    LoginResponse,
    ModuleResponse,
    PasswordResetRequest,
    PasswordResetResponse,
    ProgressActivityResponse,
    ProgressResponse,
    QuizGenerateRequest,
    QuizSessionDetailResponse,
    QuizSessionSummaryResponse,
    QuizResponse,
    QuizSubmitRequest,
    QuizSubmitResponse,
    QuizResultItem,
    StudentProfile,
    StudentUpdateRequest,
    StudentRegister,
    StudentRegisterResponse,
    SubjectResponse,
    StrengthWeaknessItem,
    SubjectProgressResponse,
    TopicProgressResponse,
    TopicProgressUpdateRequest,
    TopicResponse,
)
from seed import (
    import_modules_from_csv,
    import_subjects_from_excel,
    import_topics_from_csv,
    migrate_students_table,
    seed_admin,
    seed_courses,
)


app = FastAPI(title="ChatGPT-based Virtual Tutor System API")
BASE_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

ADMIN_TABLES = {
    "admins": "username",
    "courses": "course_id",
    "students": "student_id",
    "subjects": "subject_code",
    "modules": "module_id",
    "topics": "topic_id",
    "chat_history": "chat_id",
    "quiz_attempts": "attempt_id",
    "quiz_sessions": "session_id",
    "topic_progress": "progress_id",
}
ADMIN_SESSIONS: dict[str, str] = {}


def get_student_or_404(db: Session, student_id: str) -> Student:
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
    return student


def get_topic_bundle_or_404(db: Session, topic_id: str):
    bundle = (
        db.query(Topic, Module, Subject)
        .join(Module, Topic.module_id == Module.module_id)
        .join(Subject, Module.subject_code == Subject.subject_code)
        .filter(Topic.topic_id == topic_id)
        .first()
    )
    if not bundle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found.")
    return bundle


def get_admin_or_404(db: Session, username: str) -> Admin:
    admin = db.get(Admin, username)
    if not admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin account not found.")
    return admin


def build_syllabus_context(student: Student, topic: Topic, module: Module, subject: Subject) -> SyllabusContext:
    return SyllabusContext(
        course=student.course.course_name,
        year=student.year,
        subject=subject.subject_name,
        module=module.module_title,
        topic=topic.topic,
    )


def serialize_chat_message(chat_message: ChatHistory) -> ChatMessageResponse:
    return ChatMessageResponse.model_validate(chat_message)


def build_admin_profile(admin: Admin) -> AdminProfile:
    return AdminProfile(username=admin.username)


def build_student_profile(student: Student) -> StudentProfile:
    return StudentProfile(
        student_id=student.student_id,
        name=student.name,
        dob=student.dob,
        gender=student.gender,
        email=student.email,
        phone=student.phone,
        course_id=student.course_id,
        course_name=student.course.course_name,
        year=student.year,
        semester=student.semester,
        profile_photo=student.profile_photo,
        created_at=student.created_at,
        updated_at=student.updated_at,
    )


def parse_form_bool(value: str | None) -> bool:
    if value is None:
        return False
    return value.strip().lower() in {"1", "true", "yes", "on"}


def delete_uploaded_photo(photo_url: str | None) -> None:
    if not photo_url or not photo_url.startswith("http://127.0.0.1:8002/uploads/"):
        return

    file_name = photo_url.rsplit("/", maxsplit=1)[-1]
    file_path = UPLOADS_DIR / file_name
    if file_path.exists():
        file_path.unlink()


def get_or_create_topic_progress(db: Session, student_id: str, topic_id: str) -> TopicProgress:
    entry = (
        db.query(TopicProgress)
        .filter(TopicProgress.student_id == student_id, TopicProgress.topic_id == topic_id)
        .first()
    )
    if entry:
        return entry

    entry = TopicProgress(student_id=student_id, topic_id=topic_id)
    db.add(entry)
    db.flush()
    return entry


def build_topic_progress_response(entry: TopicProgress) -> TopicProgressResponse:
    return TopicProgressResponse.model_validate(entry)


def ensure_admin_bootstrap(db: Session) -> None:
    Base.metadata.create_all(bind=engine)
    seed_admin(db)


def create_admin_session(admin: Admin) -> str:
    token = secrets.token_urlsafe(32)
    ADMIN_SESSIONS[token] = admin.username
    return token


def require_admin_auth(
    x_admin_token: str | None = Header(default=None, alias="X-Admin-Token"),
    db: Session = Depends(get_db),
) -> Admin:
    ensure_admin_bootstrap(db)
    if not x_admin_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin authentication required.")

    username = ADMIN_SESSIONS.get(x_admin_token)
    if not username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin session expired. Please log in again.")

    admin = db.get(Admin, username)
    if not admin:
        ADMIN_SESSIONS.pop(x_admin_token, None)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin account not found.")

    return admin


def delete_student_related_records(db: Session, student_id: str) -> None:
    db.query(ChatHistory).filter(ChatHistory.student_id == student_id).delete()
    db.query(QuizAttempt).filter(QuizAttempt.student_id == student_id).delete()
    db.query(QuizSession).filter(QuizSession.student_id == student_id).delete()
    db.query(TopicProgress).filter(TopicProgress.student_id == student_id).delete()


def delete_subject_related_records(db: Session, subject_code: str) -> None:
    module_ids = [
        module_id
        for (module_id,) in db.query(Module.module_id).filter(Module.subject_code == subject_code).all()
    ]
    if not module_ids:
        return

    topic_ids = [topic_id for (topic_id,) in db.query(Topic.topic_id).filter(Topic.module_id.in_(module_ids)).all()]
    if topic_ids:
        db.query(ChatHistory).filter(ChatHistory.topic_id.in_(topic_ids)).delete(synchronize_session=False)
        db.query(QuizAttempt).filter(QuizAttempt.topic_id.in_(topic_ids)).delete(synchronize_session=False)
        db.query(QuizSession).filter(QuizSession.topic_id.in_(topic_ids)).delete(synchronize_session=False)
        db.query(TopicProgress).filter(TopicProgress.topic_id.in_(topic_ids)).delete(synchronize_session=False)
        db.query(Topic).filter(Topic.topic_id.in_(topic_ids)).delete(synchronize_session=False)

    db.query(Module).filter(Module.module_id.in_(module_ids)).delete(synchronize_session=False)


def serialize_table_rows(db: Session, table_name: str, limit: int = 200) -> dict[str, object]:
    order_column = ADMIN_TABLES.get(table_name)
    if not order_column:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown table.")

    column_rows = db.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
    columns = [row[1] for row in column_rows]
    rows = db.execute(
        text(f"SELECT * FROM {table_name} ORDER BY {order_column} DESC LIMIT :limit"),
        {"limit": limit},
    ).mappings().all()
    count = db.execute(text(f"SELECT COUNT(*) FROM {table_name}")).scalar_one()
    return {"table": table_name, "columns": columns, "rows": [dict(row) for row in rows], "count": count}


def upsert_subject_bundle(
    db: Session,
    payload: AdminSubjectUpsertRequest,
    *,
    allow_existing: bool,
) -> Subject:
    normalized_subject_code = payload.subject_code.strip().upper()
    subject = db.get(Subject, normalized_subject_code)
    if subject and not allow_existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subject code already exists.")
    if not subject and allow_existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found.")

    course = db.get(Course, payload.course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Selected course does not exist.")
    if payload.year > course.total_years:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Year exceeds course duration.")

    if not subject:
        subject = Subject(subject_code=normalized_subject_code)
        db.add(subject)

    subject.subject_name = payload.subject_name.strip()
    subject.credits = payload.credits
    subject.type = payload.type.strip()
    subject.semester = payload.semester
    subject.year = payload.year
    subject.course_id = payload.course_id
    db.flush()

    existing_module_ids = [
        module_id
        for (module_id,) in db.query(Module.module_id).filter(Module.subject_code == normalized_subject_code).all()
    ]
    if existing_module_ids:
        db.query(Topic).filter(Topic.module_id.in_(existing_module_ids)).delete(synchronize_session=False)
        db.query(Module).filter(Module.subject_code == normalized_subject_code).delete(synchronize_session=False)
        db.flush()

    for module_number, module_payload in enumerate(payload.modules, start=1):
        module_id = f"{normalized_subject_code}_{module_number}"
        module = Module(
            module_id=module_id,
            subject_code=normalized_subject_code,
            module_number=module_number,
            module_title=module_payload.module_title.strip(),
        )
        db.add(module)

        for topic_index, topic_text in enumerate(module_payload.topics, start=1):
            db.add(
                Topic(
                    topic_id=f"{module_id}_{topic_index}",
                    module_id=module_id,
                    topic=topic_text.strip(),
                )
            )

    db.commit()
    db.refresh(subject)
    return subject


def build_quiz_result(quiz: QuizResponse, answers: dict[str, str]) -> QuizSubmitResponse:
    results: list[QuizResultItem] = []
    score = 0

    for question in quiz.questions:
        selected_answer = answers.get(question.id)
        is_correct = selected_answer == question.correct_answer
        if is_correct:
            score += 1

        results.append(
            QuizResultItem(
                id=question.id,
                question=question.question,
                selected_answer=selected_answer,
                correct_answer=question.correct_answer,
                is_correct=is_correct,
                explanation=question.explanation,
            )
        )

    total_questions = len(quiz.questions)
    percentage = round((score / total_questions) * 100, 2) if total_questions else 0.0

    return QuizSubmitResponse(
        score=score,
        total_questions=total_questions,
        percentage=percentage,
        results=results,
    )


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_admin(db)
        seed_courses(db)
        migrate_students_table(db)
        import_subjects_from_excel(db)
        import_modules_from_csv(db)
        import_topics_from_csv(db)


@app.get("/")
def health_check():
    return {"message": "Virtual Tutor backend is running."}


@app.post("/admin/login", response_model=AdminLoginResponse)
def admin_login(payload: AdminLoginRequest, db: Session = Depends(get_db)):
    ensure_admin_bootstrap(db)
    username = payload.username.strip()
    admin = db.query(Admin).filter(Admin.username == username).first()
    if not admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin account not found.")
    if admin.password_hash != hash_password(payload.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials.")

    token = create_admin_session(admin)
    return {"message": "Admin login successful.", "admin": build_admin_profile(admin), "token": token}


@app.get("/admin/overview")
def get_admin_overview(admin: Admin = Depends(require_admin_auth), db: Session = Depends(get_db)):
    return {
        "admin_username": admin.username,
        "tables": {table_name: serialize_table_rows(db, table_name, limit=1)["count"] for table_name in ADMIN_TABLES},
    }


@app.get("/admin/tables")
def get_admin_tables(admin: Admin = Depends(require_admin_auth)):
    return [{"table": table_name} for table_name in ADMIN_TABLES]


@app.get("/admin/tables/{table_name}")
def get_admin_table(
    table_name: str,
    limit: int = Query(default=200, ge=1, le=500),
    admin: Admin = Depends(require_admin_auth),
    db: Session = Depends(get_db),
):
    return serialize_table_rows(db, table_name, limit)


@app.get("/courses", response_model=list[CourseResponse])
def get_courses(db: Session = Depends(get_db)):
    return db.query(Course).order_by(Course.course_id.asc()).all()


@app.post("/admin/courses", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(payload: AdminCourseCreateRequest, admin: Admin = Depends(require_admin_auth), db: Session = Depends(get_db)):
    existing_course = db.query(Course).filter(Course.course_name == payload.course_name.strip()).first()
    if existing_course:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Course name already exists.")

    next_course_id = (db.query(Course.course_id).order_by(Course.course_id.desc()).first() or (0,))[0] + 1
    course = Course(
        course_id=next_course_id,
        course_name=payload.course_name.strip(),
        total_years=payload.total_years,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@app.put("/admin/courses/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: int,
    payload: AdminCourseUpdateRequest,
    admin: Admin = Depends(require_admin_auth),
    db: Session = Depends(get_db),
):
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    duplicate = (
        db.query(Course)
        .filter(Course.course_name == payload.course_name.strip(), Course.course_id != course_id)
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Course name already exists.")

    course.course_name = payload.course_name.strip()
    course.total_years = payload.total_years
    db.commit()
    db.refresh(course)
    return course


@app.delete("/admin/courses/{course_id}")
def delete_course(course_id: int, admin: Admin = Depends(require_admin_auth), db: Session = Depends(get_db)):
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    student_exists = db.query(Student.student_id).filter(Student.course_id == course_id).first()
    if student_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete a course that still has students.",
        )

    subject_exists = db.query(Subject.subject_code).filter(Subject.course_id == course_id).first()
    if subject_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete a course that still has subjects.",
        )

    db.delete(course)
    db.commit()
    return {"message": "Course deleted successfully."}


@app.get("/students", response_model=list[StudentProfile])
def get_students(db: Session = Depends(get_db)):
    students = db.query(Student).join(Course).order_by(Student.created_at.desc()).all()
    return [build_student_profile(student) for student in students]


@app.post("/admin/students", response_model=StudentProfile, status_code=status.HTTP_201_CREATED)
def create_student_from_admin(
    payload: AdminStudentCreateRequest,
    admin: Admin = Depends(require_admin_auth),
    db: Session = Depends(get_db),
):
    existing_student = db.query(Student).filter(Student.email == payload.email.lower()).first()
    if existing_student:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already registered.")

    course = db.get(Course, payload.course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Selected course does not exist.")
    if payload.year > course.total_years:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Year exceeds course duration.")

    student = Student(
        student_id=generate_student_id(db, date.today(), payload.course_id),
        name=" ".join(payload.name.split()),
        dob=payload.dob,
        gender=payload.gender,
        email=payload.email.lower(),
        phone=payload.phone,
        course_id=payload.course_id,
        year=payload.year,
        semester=payload.semester,
        password_hash=hash_password(payload.password),
        profile_photo=None,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return build_student_profile(student)


@app.get("/students/{student_id}", response_model=StudentProfile)
def get_student(student_id: str, db: Session = Depends(get_db)):
    student = get_student_or_404(db, student_id)
    return build_student_profile(student)


@app.put("/admin/students/{student_id}", response_model=StudentProfile)
def update_student_from_admin(
    student_id: str,
    payload: AdminStudentUpdateRequest,
    admin: Admin = Depends(require_admin_auth),
    db: Session = Depends(get_db),
):
    student = get_student_or_404(db, student_id)
    course = db.get(Course, payload.course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Selected course does not exist.")
    if payload.year > course.total_years:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Year exceeds course duration.")

    duplicate = (
        db.query(Student)
        .filter(Student.email == payload.email.lower(), Student.student_id != student_id)
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already registered.")

    student.name = " ".join(payload.name.split())
    student.dob = payload.dob
    student.gender = payload.gender
    student.email = payload.email.lower()
    student.phone = payload.phone
    student.course_id = payload.course_id
    student.year = payload.year
    student.semester = payload.semester
    if payload.new_password:
        student.password_hash = hash_password(payload.new_password)

    db.commit()
    db.refresh(student)
    return build_student_profile(student)


@app.delete("/admin/students/{student_id}")
def delete_student_from_admin(
    student_id: str,
    admin: Admin = Depends(require_admin_auth),
    db: Session = Depends(get_db),
):
    student = get_student_or_404(db, student_id)
    delete_student_related_records(db, student_id)
    if student.profile_photo:
        delete_uploaded_photo(student.profile_photo)
    db.delete(student)
    db.commit()
    return {"message": "Student deleted successfully."}


@app.get("/subjects", response_model=list[SubjectResponse])
def get_subjects(db: Session = Depends(get_db)):
    return db.query(Subject).order_by(Subject.year.asc(), Subject.semester.asc(), Subject.subject_code.asc()).all()


@app.get("/admin/subjects", response_model=list[SubjectResponse])
def get_all_subjects_for_admin(admin: Admin = Depends(require_admin_auth), db: Session = Depends(get_db)):
    return db.query(Subject).order_by(Subject.course_id.asc(), Subject.year.asc(), Subject.subject_code.asc()).all()


@app.post("/admin/subjects", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject_from_admin(
    payload: AdminSubjectUpsertRequest,
    admin: Admin = Depends(require_admin_auth),
    db: Session = Depends(get_db),
):
    return upsert_subject_bundle(db, payload, allow_existing=False)


@app.put("/admin/subjects/{subject_code}", response_model=SubjectResponse)
def update_subject_from_admin(
    subject_code: str,
    payload: AdminSubjectUpsertRequest,
    admin: Admin = Depends(require_admin_auth),
    db: Session = Depends(get_db),
):
    updated_payload = payload.model_copy(update={"subject_code": subject_code})
    return upsert_subject_bundle(db, updated_payload, allow_existing=True)


@app.delete("/admin/subjects/{subject_code}")
def delete_subject_from_admin(
    subject_code: str,
    admin: Admin = Depends(require_admin_auth),
    db: Session = Depends(get_db),
):
    normalized_subject_code = subject_code.strip().upper()
    subject = db.get(Subject, normalized_subject_code)
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found.")

    delete_subject_related_records(db, normalized_subject_code)
    db.delete(subject)
    db.commit()
    return {"message": "Subject deleted successfully."}


@app.get("/subjects/{course_id}/{semester}", response_model=list[SubjectResponse])
def get_subjects_by_course_and_semester(course_id: int, semester: int, db: Session = Depends(get_db)):
    return (
        db.query(Subject)
        .filter(Subject.course_id == course_id, Subject.semester == semester)
        .order_by(Subject.semester.asc(), Subject.subject_code.asc())
        .all()
    )


@app.get("/modules", response_model=list[ModuleResponse])
def get_modules(db: Session = Depends(get_db)):
    return db.query(Module).order_by(Module.subject_code.asc(), Module.module_number.asc()).all()


@app.get("/modules/{subject_code}", response_model=list[ModuleResponse])
def get_modules_by_subject(subject_code: str, db: Session = Depends(get_db)):
    return (
        db.query(Module)
        .filter(Module.subject_code == subject_code.upper())
        .order_by(Module.module_number.asc())
        .all()
    )


@app.get("/topics", response_model=list[TopicResponse])
def get_topics(db: Session = Depends(get_db)):
    return db.query(Topic).order_by(Topic.module_id.asc(), Topic.topic.asc()).all()


@app.get("/topics/{module_id}", response_model=list[TopicResponse])
def get_topics_by_module(module_id: str, db: Session = Depends(get_db)):
    return (
        db.query(Topic)
        .filter(Topic.module_id == module_id.upper())
        .order_by(Topic.topic_id.asc())
        .all()
    )


@app.get("/topic/{topic_id}", response_model=TopicResponse)
def get_topic(topic_id: str, db: Session = Depends(get_db)):
    topic = db.get(Topic, topic_id)
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found.")
    return topic


@app.get("/chat-history/{student_id}/{topic_id}", response_model=list[ChatMessageResponse])
def get_chat_history(student_id: str, topic_id: str, db: Session = Depends(get_db)):
    messages = (
        db.query(ChatHistory)
        .filter(ChatHistory.student_id == student_id, ChatHistory.topic_id == topic_id)
        .order_by(ChatHistory.timestamp.asc(), ChatHistory.chat_id.asc())
        .all()
    )
    return messages


@app.get("/topic-progress/{student_id}/{topic_id}", response_model=TopicProgressResponse)
def get_topic_progress(student_id: str, topic_id: str, db: Session = Depends(get_db)):
    get_student_or_404(db, student_id)
    topic = db.get(Topic, topic_id)
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found.")

    entry = (
        db.query(TopicProgress)
        .filter(TopicProgress.student_id == student_id, TopicProgress.topic_id == topic_id)
        .first()
    )

    if not entry:
        entry = TopicProgress(
            student_id=student_id,
            topic_id=topic_id,
            time_spent_seconds=0,
            is_completed=False,
            last_studied_at=datetime.utcnow(),
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)

    return build_topic_progress_response(entry)


@app.post("/topic-progress", response_model=TopicProgressResponse)
def update_topic_progress(payload: TopicProgressUpdateRequest, db: Session = Depends(get_db)):
    get_student_or_404(db, payload.student_id)
    topic = db.get(Topic, payload.topic_id)
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found.")

    entry = get_or_create_topic_progress(db, payload.student_id, payload.topic_id)
    entry.time_spent_seconds += payload.seconds_spent
    entry.last_studied_at = datetime.utcnow()

    if payload.mark_completed and not entry.is_completed:
        entry.is_completed = True
        entry.completed_at = datetime.utcnow()
    elif payload.mark_completed and entry.is_completed and entry.completed_at is None:
        entry.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(entry)
    return build_topic_progress_response(entry)


@app.post("/register", response_model=StudentRegisterResponse, status_code=status.HTTP_201_CREATED)
async def register_student(
    name: str = Form(...),
    dob: str = Form(...),
    gender: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    course_id: int = Form(...),
    year: int = Form(...),
    semester: int = Form(...),
    password: str = Form(...),
    profile_photo: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
):
    payload = StudentRegister(
        name=name,
        dob=dob,
        gender=gender,
        email=email,
        phone=phone,
        course_id=course_id,
        year=year,
        semester=semester,
        password=password,
    )

    existing_student = db.query(Student).filter(Student.email == payload.email).first()
    if existing_student:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered.",
        )

    course = db.get(Course, payload.course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Selected course does not exist.",
        )

    student_id = generate_student_id(db, date.today(), payload.course_id)
    profile_photo_url = None

    if profile_photo and profile_photo.filename:
        extension = Path(profile_photo.filename).suffix.lower() or ".jpg"
        safe_extension = extension if extension in {".jpg", ".jpeg", ".png", ".webp"} else ".jpg"
        file_name = f"{student_id}-{uuid4().hex}{safe_extension}"
        file_path = UPLOADS_DIR / file_name
        file_path.write_bytes(await profile_photo.read())
        profile_photo_url = f"http://127.0.0.1:8002/uploads/{file_name}"

    student = Student(
        student_id=student_id,
        name=payload.name,
        dob=payload.dob,
        gender=payload.gender,
        email=payload.email,
        phone=payload.phone,
        course_id=payload.course_id,
        year=payload.year,
        semester=payload.semester,
        password_hash=hash_password(payload.password),
        profile_photo=profile_photo_url,
    )

    db.add(student)
    db.commit()
    db.refresh(student)

    return {
        "student_id": student.student_id,
        "message": "Student registered successfully.",
    }


@app.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    normalized_identifier = payload.identifier.strip()
    student = (
        db.query(Student)
        .filter(
            (Student.student_id == normalized_identifier.upper())
            | (Student.email == normalized_identifier.lower())
        )
        .first()
    )
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student account not found.",
        )

    if student.password_hash != hash_password(payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    return {
        "message": "Login successful.",
        "student": build_student_profile(student),
    }


@app.post("/reset-password", response_model=PasswordResetResponse)
def reset_password(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    normalized_identifier = payload.identifier.strip()
    student = (
        db.query(Student)
        .filter(
            ((Student.student_id == normalized_identifier.upper()) | (Student.email == normalized_identifier.lower()))
            & (Student.dob == payload.dob)
        )
        .first()
    )
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="We could not verify that student account with the provided date of birth.",
        )

    student.password_hash = hash_password(payload.new_password)
    db.commit()

    return PasswordResetResponse(message="Password reset successful. You can log in with your new password.")


@app.put("/students/{student_id}", response_model=StudentProfile)
async def update_student(
    student_id: str,
    name: str = Form(...),
    dob: str = Form(...),
    gender: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    course_id: int = Form(...),
    year: int = Form(...),
    semester: int = Form(...),
    remove_profile_photo: str | None = Form(default=None),
    current_password: str | None = Form(default=None),
    new_password: str | None = Form(default=None),
    profile_photo: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
):
    student = get_student_or_404(db, student_id)
    payload = StudentUpdateRequest(
        name=name,
        dob=dob,
        gender=gender,
        email=email,
        phone=phone,
        course_id=course_id,
        year=year,
        semester=semester,
        remove_profile_photo=parse_form_bool(remove_profile_photo),
        current_password=current_password,
        new_password=new_password,
    )

    course = db.get(Course, payload.course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Selected course does not exist.")
    if payload.year > course.total_years:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Academic year exceeds the selected course duration.",
        )

    existing_email_owner = (
        db.query(Student)
        .filter(Student.email == payload.email, Student.student_id != student_id)
        .first()
    )
    if existing_email_owner:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already registered.")

    if payload.new_password:
        if student.password_hash != hash_password(payload.current_password or ""):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect.",
            )
        student.password_hash = hash_password(payload.new_password)

    if payload.remove_profile_photo and student.profile_photo:
        delete_uploaded_photo(student.profile_photo)
        student.profile_photo = None

    if profile_photo and profile_photo.filename:
        delete_uploaded_photo(student.profile_photo)

        extension = Path(profile_photo.filename).suffix.lower() or ".jpg"
        safe_extension = extension if extension in {".jpg", ".jpeg", ".png", ".webp"} else ".jpg"
        file_name = f"{student.student_id}-{uuid4().hex}{safe_extension}"
        file_path = UPLOADS_DIR / file_name
        file_path.write_bytes(await profile_photo.read())
        student.profile_photo = f"http://127.0.0.1:8002/uploads/{file_name}"

    student.name = payload.name
    student.dob = payload.dob
    student.gender = payload.gender
    student.email = payload.email
    student.phone = payload.phone
    student.course_id = payload.course_id
    student.year = payload.year
    student.semester = payload.semester

    db.commit()
    db.refresh(student)
    return build_student_profile(student)


@app.post("/ai-tutor", response_model=AITutorResponse)
def ai_tutor(payload: AITutorRequest, db: Session = Depends(get_db)):
    student = get_student_or_404(db, payload.student_id)
    topic, module, subject = get_topic_bundle_or_404(db, payload.topic_id)
    progress_entry = get_or_create_topic_progress(db, payload.student_id, payload.topic_id)
    progress_entry.last_studied_at = datetime.utcnow()
    db.commit()

    history = (
        db.query(ChatHistory)
        .filter(ChatHistory.student_id == payload.student_id, ChatHistory.topic_id == payload.topic_id)
        .order_by(ChatHistory.timestamp.desc(), ChatHistory.chat_id.desc())
        .limit(10)
        .all()
    )
    ordered_history = list(reversed(history))
    history_texts = [message.message for message in ordered_history]
    student_level = infer_student_level(history_texts + [payload.message])
    context = build_syllabus_context(student, topic, module, subject)

    student_message = ChatHistory(
        student_id=payload.student_id,
        topic_id=payload.topic_id,
        role="user",
        message=payload.message,
    )
    db.add(student_message)
    db.commit()
    db.refresh(student_message)

    messages = [{"role": "system", "content": build_tutor_system_prompt(context, student_level)}]
    for item in ordered_history:
        messages.append({"role": item.role, "content": item.message})
    messages.append({"role": "user", "content": payload.message})

    try:
        ai_text = create_chat_completion(messages)
    except AIConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"AI tutor request failed: {exc}") from exc

    ai_message = ChatHistory(
        student_id=payload.student_id,
        topic_id=payload.topic_id,
        role="assistant",
        message=ai_text,
    )
    db.add(ai_message)
    db.commit()
    db.refresh(ai_message)

    return {
        "student_message": serialize_chat_message(student_message),
        "ai_message": serialize_chat_message(ai_message),
        "inferred_student_level": student_level,
    }


@app.post("/generate-quiz", response_model=QuizResponse)
def generate_quiz(payload: QuizGenerateRequest, db: Session = Depends(get_db)):
    student = get_student_or_404(db, payload.student_id)
    topic, module, subject = get_topic_bundle_or_404(db, payload.topic_id)
    context = build_syllabus_context(student, topic, module, subject)

    messages = [
        {"role": "system", "content": build_quiz_system_prompt(context, payload.student_level)},
        {"role": "user", "content": "Generate the quiz now and return only the wrapped JSON."},
    ]

    try:
        quiz_payload = normalize_quiz_payload(create_quiz_completion(messages), context, payload.student_level)
        return QuizResponse.model_validate(quiz_payload)
    except AIConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Quiz generation failed: {exc}") from exc


@app.post("/submit-quiz", response_model=QuizSubmitResponse)
def submit_quiz(payload: QuizSubmitRequest, db: Session = Depends(get_db)):
    get_student_or_404(db, payload.student_id)
    get_topic_bundle_or_404(db, payload.topic_id)
    result = build_quiz_result(payload.quiz, payload.answers)

    quiz_session = QuizSession(
        student_id=payload.student_id,
        topic_id=payload.topic_id,
        student_level=payload.student_level,
        quiz_payload=payload.quiz.model_dump_json(),
        answers_payload=json.dumps(payload.answers),
        result_payload=result.model_dump_json(),
        score=result.score,
        total_questions=result.total_questions,
        percentage=result.percentage,
    )
    db.add(quiz_session)

    progress_entry = get_or_create_topic_progress(db, payload.student_id, payload.topic_id)
    progress_entry.last_studied_at = datetime.utcnow()
    progress_entry.time_spent_seconds += 180
    if result.percentage >= 70 and not progress_entry.is_completed:
        progress_entry.is_completed = True
        progress_entry.completed_at = datetime.utcnow()

    db.commit()

    return result


@app.get("/quiz-history/{student_id}", response_model=list[QuizSessionSummaryResponse])
def get_quiz_history(
    student_id: str,
    subject_code: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    get_student_or_404(db, student_id)
    normalized_subject_code = subject_code.upper() if subject_code else None

    rows = (
        db.query(QuizSession, Topic, Module, Subject)
        .join(Topic, QuizSession.topic_id == Topic.topic_id)
        .join(Module, Topic.module_id == Module.module_id)
        .join(Subject, Module.subject_code == Subject.subject_code)
        .filter(QuizSession.student_id == student_id)
    )
    if normalized_subject_code:
        rows = rows.filter(Subject.subject_code == normalized_subject_code)

    sessions: list[QuizSessionSummaryResponse] = []
    for session, topic, module, subject in rows.order_by(QuizSession.created_at.desc()).all():
        sessions.append(
            QuizSessionSummaryResponse(
                session_id=session.session_id,
                topic_id=topic.topic_id,
                topic_name=topic.topic,
                subject_code=subject.subject_code,
                subject_name=subject.subject_name,
                module_title=module.module_title,
                score=session.score,
                total_questions=session.total_questions,
                percentage=session.percentage,
                student_level=session.student_level,
                created_at=session.created_at,
            )
        )

    return sessions


@app.get("/quiz-session/{session_id}", response_model=QuizSessionDetailResponse)
def get_quiz_session(session_id: int, db: Session = Depends(get_db)):
    session = db.get(QuizSession, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz session not found.")

    return QuizSessionDetailResponse(
        session_id=session.session_id,
        student_id=session.student_id,
        topic_id=session.topic_id,
        student_level=session.student_level,
        score=session.score,
        total_questions=session.total_questions,
        percentage=session.percentage,
        created_at=session.created_at,
        quiz=QuizResponse.model_validate_json(session.quiz_payload),
        answers=json.loads(session.answers_payload),
        result=QuizSubmitResponse.model_validate_json(session.result_payload),
    )


@app.get("/progress/{student_id}", response_model=ProgressResponse)
def get_progress(
    student_id: str,
    subject_code: str | None = Query(default=None),
    activity_type: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    student = get_student_or_404(db, student_id)
    normalized_subject_code = subject_code.upper() if subject_code else None
    normalized_activity_type = activity_type.lower() if activity_type else None

    subject_query = db.query(Subject).filter(
        Subject.course_id == student.course_id,
        Subject.semester == student.semester,
    )
    if normalized_subject_code:
        subject_query = subject_query.filter(Subject.subject_code == normalized_subject_code)
    selected_subjects = subject_query.order_by(Subject.semester.asc(), Subject.subject_code.asc()).all()
    subject_map = {subject.subject_code: subject for subject in selected_subjects}

    module_rows = (
        db.query(Module, Subject)
        .join(Subject, Module.subject_code == Subject.subject_code)
        .filter(Subject.subject_code.in_(subject_map.keys()))
        .all()
        if subject_map
        else []
    )
    module_to_subject: dict[str, str] = {}
    module_counts_by_subject: dict[str, int] = {code: 0 for code in subject_map}
    module_topic_counts: dict[str, int] = {}
    for module, subject in module_rows:
        module_to_subject[module.module_id] = subject.subject_code
        module_counts_by_subject[subject.subject_code] += 1

    topic_rows = (
        db.query(Topic, Module, Subject)
        .join(Module, Topic.module_id == Module.module_id)
        .join(Subject, Module.subject_code == Subject.subject_code)
        .filter(Subject.subject_code.in_(subject_map.keys()))
        .all()
        if subject_map
        else []
    )
    topic_counts_by_subject: dict[str, int] = {code: 0 for code in subject_map}
    completed_topics_by_subject: dict[str, int] = {code: 0 for code in subject_map}
    time_spent_by_subject: dict[str, int] = {code: 0 for code in subject_map}
    topic_to_subject: dict[str, str] = {}
    topic_to_module: dict[str, str] = {}
    for topic, module, subject in topic_rows:
        topic_to_subject[topic.topic_id] = subject.subject_code
        topic_to_module[topic.topic_id] = module.module_id
        topic_counts_by_subject[subject.subject_code] += 1
        module_topic_counts[module.module_id] = module_topic_counts.get(module.module_id, 0) + 1

    topic_progress_rows = (
        db.query(TopicProgress, Topic, Module, Subject)
        .join(Topic, TopicProgress.topic_id == Topic.topic_id)
        .join(Module, Topic.module_id == Module.module_id)
        .join(Subject, Module.subject_code == Subject.subject_code)
        .filter(TopicProgress.student_id == student_id)
    )
    if normalized_subject_code:
        topic_progress_rows = topic_progress_rows.filter(Subject.subject_code == normalized_subject_code)
    progress_entries = topic_progress_rows.all()

    progress_by_topic: dict[str, TopicProgress] = {}
    completed_topics_by_module: dict[str, int] = {}
    for progress_entry, topic, module, subject in progress_entries:
        progress_by_topic[topic.topic_id] = progress_entry
        time_spent_by_subject[subject.subject_code] = (
            time_spent_by_subject.get(subject.subject_code, 0) + progress_entry.time_spent_seconds
        )
        if progress_entry.is_completed:
            completed_topics_by_subject[subject.subject_code] = (
                completed_topics_by_subject.get(subject.subject_code, 0) + 1
            )
            completed_topics_by_module[module.module_id] = completed_topics_by_module.get(module.module_id, 0) + 1

    completed_modules_by_subject: dict[str, int] = {code: 0 for code in subject_map}
    for module_id, total_module_topics in module_topic_counts.items():
        completed_module_topics = completed_topics_by_module.get(module_id, 0)
        if total_module_topics and completed_module_topics >= total_module_topics:
            subject_for_module = module_to_subject.get(module_id)
            if subject_for_module:
                completed_modules_by_subject[subject_for_module] = (
                    completed_modules_by_subject.get(subject_for_module, 0) + 1
                )

    subject_progress: list[SubjectProgressResponse] = []
    for subject_code_key, subject in subject_map.items():
        total_topics = topic_counts_by_subject.get(subject_code_key, 0)
        completed_topics = completed_topics_by_subject.get(subject_code_key, 0)
        progress_percentage = round((completed_topics / total_topics) * 100, 2) if total_topics else 0.0
        subject_progress.append(
            SubjectProgressResponse(
                subject_code=subject.subject_code,
                subject_name=subject.subject_name,
                completed_topics=completed_topics,
                total_topics=total_topics,
                completed_modules=completed_modules_by_subject.get(subject_code_key, 0),
                total_modules=module_counts_by_subject.get(subject_code_key, 0),
                progress_percentage=progress_percentage,
                time_spent_seconds=time_spent_by_subject.get(subject_code_key, 0),
            )
        )

    activities: list[ProgressActivityResponse] = []

    if normalized_activity_type in {None, "study"}:
        study_rows = (
            db.query(ChatHistory, Topic, Module, Subject)
            .join(Topic, ChatHistory.topic_id == Topic.topic_id)
            .join(Module, Topic.module_id == Module.module_id)
            .join(Subject, Module.subject_code == Subject.subject_code)
            .filter(ChatHistory.student_id == student_id, ChatHistory.role == "user")
        )
        if normalized_subject_code:
            study_rows = study_rows.filter(Subject.subject_code == normalized_subject_code)

        for chat_message, topic, module, subject in study_rows.order_by(ChatHistory.timestamp.desc()).all():
            topic_progress_entry = progress_by_topic.get(topic.topic_id)
            activities.append(
                ProgressActivityResponse(
                    activity_id=f"study-{chat_message.chat_id}",
                    activity_type="study",
                    quiz_session_id=None,
                    subject_code=subject.subject_code,
                    subject_name=subject.subject_name,
                    module_id=module.module_id,
                    module_title=module.module_title,
                    topic_id=topic.topic_id,
                    topic_name=topic.topic,
                    summary=chat_message.message,
                    time_spent_seconds=topic_progress_entry.time_spent_seconds if topic_progress_entry else 0,
                    is_completed=topic_progress_entry.is_completed if topic_progress_entry else False,
                    timestamp=chat_message.timestamp,
                )
            )

    if normalized_activity_type in {None, "quiz"}:
        quiz_rows = (
            db.query(QuizSession, Topic, Module, Subject)
            .join(Topic, QuizSession.topic_id == Topic.topic_id)
            .join(Module, Topic.module_id == Module.module_id)
            .join(Subject, Module.subject_code == Subject.subject_code)
            .filter(QuizSession.student_id == student_id)
        )
        if normalized_subject_code:
            quiz_rows = quiz_rows.filter(Subject.subject_code == normalized_subject_code)

        for quiz_session, topic, module, subject in quiz_rows.order_by(QuizSession.created_at.desc()).all():
            activities.append(
                ProgressActivityResponse(
                    activity_id=f"quiz-session-{quiz_session.session_id}",
                    activity_type="quiz",
                    quiz_session_id=quiz_session.session_id,
                    subject_code=subject.subject_code,
                    subject_name=subject.subject_name,
                    module_id=module.module_id,
                    module_title=module.module_title,
                    topic_id=topic.topic_id,
                    topic_name=topic.topic,
                    summary=f"Completed a quiz on {topic.topic}.",
                    is_completed=progress_by_topic.get(topic.topic_id).is_completed if progress_by_topic.get(topic.topic_id) else False,
                    score=quiz_session.score,
                    total_questions=quiz_session.total_questions,
                    percentage=quiz_session.percentage,
                    timestamp=quiz_session.created_at,
                )
            )

        legacy_quiz_rows = (
            db.query(QuizAttempt, Topic, Module, Subject)
            .join(Topic, QuizAttempt.topic_id == Topic.topic_id)
            .join(Module, Topic.module_id == Module.module_id)
            .join(Subject, Module.subject_code == Subject.subject_code)
            .filter(QuizAttempt.student_id == student_id)
        )
        if normalized_subject_code:
            legacy_quiz_rows = legacy_quiz_rows.filter(Subject.subject_code == normalized_subject_code)

        for quiz_attempt, topic, module, subject in legacy_quiz_rows.order_by(QuizAttempt.created_at.desc()).all():
            activities.append(
                ProgressActivityResponse(
                    activity_id=f"quiz-legacy-{quiz_attempt.attempt_id}",
                    activity_type="quiz",
                    quiz_session_id=None,
                    subject_code=subject.subject_code,
                    subject_name=subject.subject_name,
                    module_id=module.module_id,
                    module_title=module.module_title,
                    topic_id=topic.topic_id,
                    topic_name=topic.topic,
                    summary=f"Completed a quiz on {topic.topic}.",
                    is_completed=progress_by_topic.get(topic.topic_id).is_completed if progress_by_topic.get(topic.topic_id) else False,
                    score=quiz_attempt.score,
                    total_questions=quiz_attempt.total_questions,
                    percentage=quiz_attempt.percentage,
                    timestamp=quiz_attempt.created_at,
                )
            )

    quiz_metric_rows = (
        db.query(QuizSession, Topic, Module, Subject)
        .join(Topic, QuizSession.topic_id == Topic.topic_id)
        .join(Module, Topic.module_id == Module.module_id)
        .join(Subject, Module.subject_code == Subject.subject_code)
        .filter(QuizSession.student_id == student_id)
    )
    if normalized_subject_code:
        quiz_metric_rows = quiz_metric_rows.filter(Subject.subject_code == normalized_subject_code)

    quiz_metrics = quiz_metric_rows.order_by(QuizSession.created_at.desc()).all()
    if not quiz_metrics:
        legacy_metric_rows = (
            db.query(QuizAttempt, Topic, Module, Subject)
            .join(Topic, QuizAttempt.topic_id == Topic.topic_id)
            .join(Module, Topic.module_id == Module.module_id)
            .join(Subject, Module.subject_code == Subject.subject_code)
            .filter(QuizAttempt.student_id == student_id)
        )
        if normalized_subject_code:
            legacy_metric_rows = legacy_metric_rows.filter(Subject.subject_code == normalized_subject_code)
        quiz_metrics = legacy_metric_rows.order_by(QuizAttempt.created_at.desc()).all()

    averages_by_subject: dict[str, list[float]] = {}
    latest_quiz_percentage: float | None = None
    all_percentages: list[float] = []
    for quiz_metric, _topic, _module, subject in quiz_metrics:
        percentage = float(quiz_metric.percentage)
        all_percentages.append(percentage)
        averages_by_subject.setdefault(subject.subject_code, []).append(percentage)
        if latest_quiz_percentage is None:
            latest_quiz_percentage = percentage

    ranking: list[StrengthWeaknessItem] = []
    for subject_code_key, percentages in averages_by_subject.items():
        subject = subject_map.get(subject_code_key) or db.get(Subject, subject_code_key)
        if not subject:
            continue
        ranking.append(
            StrengthWeaknessItem(
                subject_code=subject_code_key,
                subject_name=subject.subject_name,
                average_percentage=round(sum(percentages) / len(percentages), 2),
                attempts=len(percentages),
            )
        )

    ranking.sort(key=lambda item: item.average_percentage, reverse=True)

    activities.sort(key=lambda item: item.timestamp, reverse=True)

    return ProgressResponse(
        total_activities=len(activities),
        study_activities=sum(1 for item in activities if item.activity_type == "study"),
        quiz_activities=sum(1 for item in activities if item.activity_type == "quiz"),
        completed_topics=sum(item.completed_topics for item in subject_progress),
        total_topics=sum(item.total_topics for item in subject_progress),
        total_time_spent_seconds=sum(item.time_spent_seconds for item in subject_progress),
        average_quiz_percentage=round(sum(all_percentages) / len(all_percentages), 2) if all_percentages else 0.0,
        latest_quiz_percentage=latest_quiz_percentage,
        subject_progress=subject_progress,
        strengths=ranking[:3],
        weaknesses=list(reversed(ranking[-3:])),
        activities=activities,
    )
