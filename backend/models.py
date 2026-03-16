from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from database import Base


class Course(Base):
    __tablename__ = "courses"

    course_id = Column(Integer, primary_key=True, index=True)
    course_name = Column(String(100), nullable=False, unique=True)
    total_years = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    students = relationship("Student", back_populates="course")
    subjects = relationship("Subject", back_populates="course")


class Student(Base):
    __tablename__ = "students"

    student_id = Column(String(32), primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    dob = Column(Date, nullable=False)
    gender = Column(String(20), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.course_id"), nullable=False)
    year = Column(Integer, nullable=False)
    semester = Column(Integer, nullable=False)
    password_hash = Column(String(64), nullable=False)
    profile_photo = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    course = relationship("Course", back_populates="students")
    chat_messages = relationship("ChatHistory", back_populates="student")
    quiz_attempts = relationship("QuizAttempt", back_populates="student")
    topic_progress = relationship("TopicProgress", back_populates="student")
    quiz_sessions = relationship("QuizSession", back_populates="student")


class Subject(Base):
    __tablename__ = "subjects"

    subject_code = Column(String(32), primary_key=True, index=True)
    subject_name = Column(String(255), nullable=False)
    credits = Column(Integer, nullable=False)
    type = Column(String(50), nullable=False)
    semester = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    course_id = Column(Integer, ForeignKey("courses.course_id"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    course = relationship("Course", back_populates="subjects")
    modules = relationship("Module", back_populates="subject")


class Module(Base):
    __tablename__ = "modules"

    module_id = Column(String(64), primary_key=True, index=True)
    subject_code = Column(String(32), ForeignKey("subjects.subject_code"), nullable=False)
    module_number = Column(Integer, nullable=False)
    module_title = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    subject = relationship("Subject", back_populates="modules")
    topics = relationship("Topic", back_populates="module")


class Topic(Base):
    __tablename__ = "topics"

    topic_id = Column(String(96), primary_key=True, index=True)
    module_id = Column(String(64), ForeignKey("modules.module_id"), nullable=False)
    topic = Column(String(500), nullable=False)

    module = relationship("Module", back_populates="topics")
    chat_messages = relationship("ChatHistory", back_populates="topic_ref")
    quiz_attempts = relationship("QuizAttempt", back_populates="topic_ref")
    progress_entries = relationship("TopicProgress", back_populates="topic_ref")
    quiz_sessions = relationship("QuizSession", back_populates="topic_ref")


class ChatHistory(Base):
    __tablename__ = "chat_history"

    chat_id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(32), ForeignKey("students.student_id"), nullable=False)
    topic_id = Column(String(96), ForeignKey("topics.topic_id"), nullable=False)
    role = Column(String(20), nullable=False)
    message = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    student = relationship("Student", back_populates="chat_messages")
    topic_ref = relationship("Topic", back_populates="chat_messages")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    attempt_id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(32), ForeignKey("students.student_id"), nullable=False)
    topic_id = Column(String(96), ForeignKey("topics.topic_id"), nullable=False)
    score = Column(Integer, nullable=False)
    total_questions = Column(Integer, nullable=False)
    percentage = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    student = relationship("Student", back_populates="quiz_attempts")
    topic_ref = relationship("Topic", back_populates="quiz_attempts")


class TopicProgress(Base):
    __tablename__ = "topic_progress"

    progress_id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(32), ForeignKey("students.student_id"), nullable=False)
    topic_id = Column(String(96), ForeignKey("topics.topic_id"), nullable=False)
    time_spent_seconds = Column(Integer, nullable=False, default=0, server_default="0")
    is_completed = Column(Boolean, nullable=False, default=False, server_default="0")
    completed_at = Column(DateTime(timezone=True), nullable=True)
    last_studied_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    student = relationship("Student", back_populates="topic_progress")
    topic_ref = relationship("Topic", back_populates="progress_entries")


class QuizSession(Base):
    __tablename__ = "quiz_sessions"

    session_id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(32), ForeignKey("students.student_id"), nullable=False)
    topic_id = Column(String(96), ForeignKey("topics.topic_id"), nullable=False)
    student_level = Column(Integer, nullable=False)
    quiz_payload = Column(Text, nullable=False)
    answers_payload = Column(Text, nullable=False)
    result_payload = Column(Text, nullable=False)
    score = Column(Integer, nullable=False)
    total_questions = Column(Integer, nullable=False)
    percentage = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    student = relationship("Student", back_populates="quiz_sessions")
    topic_ref = relationship("Topic", back_populates="quiz_sessions")
