from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class CourseResponse(BaseModel):
    course_id: int
    course_name: str
    total_years: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SubjectResponse(BaseModel):
    subject_code: str
    subject_name: str
    credits: int
    type: str
    semester: int
    year: int
    course_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ModuleResponse(BaseModel):
    module_id: str
    subject_code: str
    module_number: int
    module_title: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TopicResponse(BaseModel):
    topic_id: str
    module_id: str
    topic: str

    model_config = ConfigDict(from_attributes=True)


class StudentRegister(BaseModel):
    name: str = Field(..., min_length=3, max_length=120)
    dob: date
    gender: str
    email: EmailStr
    phone: str = Field(..., min_length=7, max_length=20)
    course_id: int
    year: int = Field(..., ge=1, le=10)
    semester: int = Field(..., ge=1, le=20)
    password: str = Field(..., min_length=8)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        checks = [
            any(character.isupper() for character in value),
            any(character.islower() for character in value),
            any(character.isdigit() for character in value),
            any(not character.isalnum() for character in value),
        ]
        if not all(checks):
            raise ValueError(
                "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
            )
        return value

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        cleaned_value = " ".join(value.split())
        if len(cleaned_value) < 3:
            raise ValueError("Name must be at least 3 characters long.")
        return cleaned_value

    @model_validator(mode="after")
    def validate_year_and_semester(self):
        valid_semesters = {self.year * 2 - 1, self.year * 2}
        if self.semester not in valid_semesters:
            raise ValueError("Semester must match the selected academic year.")
        return self


class StudentRegisterResponse(BaseModel):
    student_id: str
    message: str


class LoginRequest(BaseModel):
    identifier: str
    password: str


class PasswordResetRequest(BaseModel):
    identifier: str
    dob: date
    new_password: str = Field(..., min_length=8)

    @field_validator("new_password")
    @classmethod
    def validate_reset_password_strength(cls, value: str) -> str:
        checks = [
            any(character.isupper() for character in value),
            any(character.islower() for character in value),
            any(character.isdigit() for character in value),
            any(not character.isalnum() for character in value),
        ]
        if not all(checks):
            raise ValueError(
                "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
            )
        return value


class PasswordResetResponse(BaseModel):
    message: str


class StudentProfile(BaseModel):
    student_id: str
    name: str
    dob: date
    gender: str
    email: EmailStr
    phone: str
    course_id: int
    course_name: str
    year: int
    semester: int
    profile_photo: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LoginResponse(BaseModel):
    message: str
    student: StudentProfile


class StudentUpdateRequest(BaseModel):
    name: str = Field(..., min_length=3, max_length=120)
    dob: date
    gender: str
    email: EmailStr
    phone: str = Field(..., min_length=7, max_length=20)
    course_id: int
    year: int = Field(..., ge=1, le=10)
    semester: int = Field(..., ge=1, le=20)
    remove_profile_photo: bool = False
    current_password: str | None = None
    new_password: str | None = Field(default=None, min_length=8)

    @field_validator("name")
    @classmethod
    def validate_updated_name(cls, value: str) -> str:
        cleaned_value = " ".join(value.split())
        if len(cleaned_value) < 3:
            raise ValueError("Name must be at least 3 characters long.")
        return cleaned_value

    @field_validator("new_password")
    @classmethod
    def validate_optional_password_strength(cls, value: str | None) -> str | None:
        if value is None:
            return value

        checks = [
            any(character.isupper() for character in value),
            any(character.islower() for character in value),
            any(character.isdigit() for character in value),
            any(not character.isalnum() for character in value),
        ]
        if not all(checks):
            raise ValueError(
                "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
            )
        return value

    @model_validator(mode="after")
    def validate_year_semester_and_password(self):
        valid_semesters = {self.year * 2 - 1, self.year * 2}
        if self.semester not in valid_semesters:
            raise ValueError("Semester must match the selected academic year.")
        if self.new_password and not self.current_password:
            raise ValueError("Current password is required to set a new password.")
        return self


class ChatMessageResponse(BaseModel):
    chat_id: int
    student_id: str
    topic_id: str
    role: str
    message: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class AITutorRequest(BaseModel):
    student_id: str
    topic_id: str
    message: str = Field(..., min_length=1)


class AITutorResponse(BaseModel):
    student_message: ChatMessageResponse
    ai_message: ChatMessageResponse
    inferred_student_level: int


class QuizGenerateRequest(BaseModel):
    student_id: str
    topic_id: str
    student_level: int = Field(..., ge=1, le=10)


class QuizQuestion(BaseModel):
    id: str
    difficulty: str
    question: str
    options: dict[str, str]
    correct_answer: str
    explanation: str


class QuizResponse(BaseModel):
    course: str
    year: int
    subject: str
    module: str
    topic: str
    student_level: int
    difficulty_progression: str
    total_questions: int
    questions: list[QuizQuestion]


class QuizSubmitRequest(BaseModel):
    student_id: str
    topic_id: str
    student_level: int = Field(..., ge=1, le=10)
    quiz: QuizResponse
    answers: dict[str, str]


class QuizResultItem(BaseModel):
    id: str
    question: str
    selected_answer: str | None
    correct_answer: str
    is_correct: bool
    explanation: str


class QuizSubmitResponse(BaseModel):
    score: int
    total_questions: int
    percentage: float
    results: list[QuizResultItem]


class ProgressActivityResponse(BaseModel):
    activity_id: str
    activity_type: str
    quiz_session_id: int | None = None
    subject_code: str
    subject_name: str
    module_id: str
    module_title: str
    topic_id: str
    topic_name: str
    summary: str
    time_spent_seconds: int | None = None
    is_completed: bool | None = None
    score: int | None = None
    total_questions: int | None = None
    percentage: float | None = None
    timestamp: datetime


class SubjectProgressResponse(BaseModel):
    subject_code: str
    subject_name: str
    completed_topics: int
    total_topics: int
    completed_modules: int
    total_modules: int
    progress_percentage: float
    time_spent_seconds: int


class StrengthWeaknessItem(BaseModel):
    subject_code: str
    subject_name: str
    average_percentage: float
    attempts: int


class ProgressResponse(BaseModel):
    total_activities: int
    study_activities: int
    quiz_activities: int
    completed_topics: int
    total_topics: int
    total_time_spent_seconds: int
    average_quiz_percentage: float
    latest_quiz_percentage: float | None
    subject_progress: list[SubjectProgressResponse]
    strengths: list[StrengthWeaknessItem]
    weaknesses: list[StrengthWeaknessItem]
    activities: list[ProgressActivityResponse]


class TopicProgressUpdateRequest(BaseModel):
    student_id: str
    topic_id: str
    seconds_spent: int = Field(default=0, ge=0, le=86400)
    mark_completed: bool = False


class TopicProgressResponse(BaseModel):
    student_id: str
    topic_id: str
    time_spent_seconds: int
    is_completed: bool
    completed_at: datetime | None
    last_studied_at: datetime

    model_config = ConfigDict(from_attributes=True)


class QuizSessionSummaryResponse(BaseModel):
    session_id: int
    topic_id: str
    topic_name: str
    subject_code: str
    subject_name: str
    module_title: str
    score: int
    total_questions: int
    percentage: float
    student_level: int
    created_at: datetime


class QuizSessionDetailResponse(BaseModel):
    session_id: int
    student_id: str
    topic_id: str
    student_level: int
    score: int
    total_questions: int
    percentage: float
    created_at: datetime
    quiz: QuizResponse
    answers: dict[str, str]
    result: QuizSubmitResponse
