import { Plus, RefreshCw, Save, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import AdminShell from "../components/AdminShell";
import Card from "../components/Card";
import { deleteJson, fetchJson, postJson, putJson } from "../lib/api";
import { clearStoredAdmin, getStoredAdmin } from "../lib/session";

const initialCourseForm = {
  courseId: "",
  course_name: "",
  total_years: 4,
};

const initialStudentForm = {
  studentId: "",
  name: "",
  dob: "",
  gender: "Female",
  email: "",
  phone: "",
  course_id: "",
  year: "",
  semester: "",
  password: "",
};

const emptyModule = { module_title: "", topics_text: "" };
const initialSubjectForm = {
  editingCode: "",
  subject_code: "",
  subject_name: "",
  credits: 4,
  type: "Core",
  semester: "",
  year: "",
  course_id: "",
  modules: [{ ...emptyModule }],
};

function AdminDashboard() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [overview, setOverview] = useState(null);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState("students");
  const [tableData, setTableData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [courseForm, setCourseForm] = useState(initialCourseForm);
  const [studentForm, setStudentForm] = useState(initialStudentForm);
  const [subjectForm, setSubjectForm] = useState(initialSubjectForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const availableSemesters = studentForm.year
    ? [Number(studentForm.year) * 2 - 1, Number(studentForm.year) * 2]
    : [];
  const subjectSemesters = subjectForm.year
    ? [Number(subjectForm.year) * 2 - 1, Number(subjectForm.year) * 2]
    : [];

  const selectedCourse = useMemo(
    () => courses.find((course) => String(course.course_id) === String(studentForm.course_id)),
    [courses, studentForm.course_id],
  );
  const subjectCourse = useMemo(
    () => courses.find((course) => String(course.course_id) === String(subjectForm.course_id)),
    [courses, subjectForm.course_id],
  );
  const studentYears = selectedCourse
    ? Array.from({ length: selectedCourse.total_years }, (_, index) => index + 1)
    : [];
  const subjectYears = subjectCourse
    ? Array.from({ length: subjectCourse.total_years }, (_, index) => index + 1)
    : [];

  const loadAdminData = async (tableName = selectedTable) => {
    try {
      const [overviewData, tablesData, coursesData, studentsData, subjectsData, tableRows] =
        await Promise.all([
          fetchJson("/admin/overview"),
          fetchJson("/admin/tables"),
          fetchJson("/courses"),
          fetchJson("/students"),
          fetchJson("/admin/subjects"),
          fetchJson(`/admin/tables/${tableName}`),
        ]);

      setOverview(overviewData);
      setTables(tablesData);
      setCourses(coursesData);
      setStudents(studentsData);
      setSubjects(subjectsData);
      setTableData(tableRows);
    } catch (error) {
      if (error.message.includes("Admin session expired") || error.message.includes("Admin authentication required")) {
        clearStoredAdmin();
        navigate("/admin/login");
        return;
      }
      throw error;
    }
  };

  useEffect(() => {
    const storedAdmin = getStoredAdmin();
    if (!storedAdmin) {
      navigate("/admin/login");
      return;
    }

    setAdmin(storedAdmin);

    const load = async () => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        await loadAdminData();
      } catch (error) {
        setErrorMessage(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [navigate]);

  const refreshSelectedTable = async (tableName = selectedTable) => {
    try {
      const data = await fetchJson(`/admin/tables/${tableName}`);
      setSelectedTable(tableName);
      setTableData(data);
    } catch (error) {
      if (error.message.includes("Admin session expired") || error.message.includes("Admin authentication required")) {
        clearStoredAdmin();
        navigate("/admin/login");
        return;
      }
      throw error;
    }
  };

  const handleCourseSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        course_name: courseForm.course_name,
        total_years: Number(courseForm.total_years),
      };

      if (courseForm.courseId) {
        await putJson(`/admin/courses/${courseForm.courseId}`, payload);
        setSuccessMessage("Course updated successfully.");
      } else {
        await postJson("/admin/courses", payload);
        setSuccessMessage("Course created successfully.");
      }

      setCourseForm(initialCourseForm);
      await loadAdminData("courses");
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleStudentSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        name: studentForm.name,
        dob: studentForm.dob,
        gender: studentForm.gender,
        email: studentForm.email,
        phone: studentForm.phone,
        course_id: Number(studentForm.course_id),
        year: Number(studentForm.year),
        semester: Number(studentForm.semester),
      };

      if (studentForm.studentId) {
        await putJson(`/admin/students/${studentForm.studentId}`, {
          ...payload,
          new_password: studentForm.password || null,
        });
        setSuccessMessage("Student updated successfully.");
      } else {
        await postJson("/admin/students", {
          ...payload,
          password: studentForm.password,
        });
        setSuccessMessage("Student created successfully.");
      }

      setStudentForm(initialStudentForm);
      await loadAdminData("students");
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleStudentDelete = async (studentId) => {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!window.confirm("Delete this student account? This will also remove their progress and quiz history.")) {
        return;
      }
      await deleteJson(`/admin/students/${studentId}`);
      setSuccessMessage("Student deleted successfully.");
      if (studentForm.studentId === studentId) {
        setStudentForm(initialStudentForm);
      }
      await loadAdminData("students");
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleCourseDelete = async (courseId) => {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!window.confirm("Delete this course? This only works when no students or subjects are attached.")) {
        return;
      }
      await deleteJson(`/admin/courses/${courseId}`);
      setSuccessMessage("Course deleted successfully.");
      if (String(courseForm.courseId) === String(courseId)) {
        setCourseForm(initialCourseForm);
      }
      await loadAdminData("courses");
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleSubjectSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        subject_code: subjectForm.subject_code,
        subject_name: subjectForm.subject_name,
        credits: Number(subjectForm.credits),
        type: subjectForm.type,
        semester: Number(subjectForm.semester),
        year: Number(subjectForm.year),
        course_id: Number(subjectForm.course_id),
        modules: subjectForm.modules.map((module) => ({
          module_title: module.module_title,
          topics: module.topics_text
            .split(",")
            .map((topic) => topic.trim())
            .filter(Boolean),
        })),
      };

      if (subjectForm.editingCode) {
        await putJson(`/admin/subjects/${subjectForm.editingCode}`, payload);
        setSuccessMessage("Subject updated successfully.");
      } else {
        await postJson("/admin/subjects", payload);
        setSuccessMessage("Subject created successfully.");
      }

      setSubjectForm(initialSubjectForm);
      await loadAdminData("subjects");
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleSubjectDelete = async (subjectCode) => {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (
        !window.confirm("Delete this subject? This will also remove its modules, topics, and related study records.")
      ) {
        return;
      }
      await deleteJson(`/admin/subjects/${subjectCode}`);
      setSuccessMessage("Subject deleted successfully.");
      if (subjectForm.editingCode === subjectCode) {
        setSubjectForm(initialSubjectForm);
      }
      await loadAdminData("subjects");
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  if (!admin) {
    return null;
  }

  return (
    <AdminShell
      admin={admin}
      title="Admin Dashboard"
      subtitle="Manage tables, courses, students, and syllabus structure"
    >
      {errorMessage ? (
        <p className="rounded-[10px] bg-red-50/70 px-4 py-3 text-sm text-danger">{errorMessage}</p>
      ) : null}
      {successMessage ? (
        <p className="rounded-[10px] bg-green-50/70 px-4 py-3 text-sm text-success">{successMessage}</p>
      ) : null}

      <section id="overview" className="grid gap-6 md:grid-cols-3 scroll-mt-24">
        <Card title="Admin Access" subtitle="Your console identity for this session.">
          <div className="rounded-[16px] bg-white/45 px-4 py-5 text-center">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
              <ShieldCheck size={18} className="text-accent" />
              {admin.username}
            </div>
          </div>
        </Card>
        <Card title="Tracked Tables" subtitle="All tables currently available in the database.">
          <div className="rounded-[16px] bg-white/45 px-4 py-5 text-center text-3xl font-bold text-ink">
            {Object.keys(overview?.tables || {}).length}
          </div>
        </Card>
        <Card title="Quick Refresh" subtitle="Reload the full admin state after changes.">
          <button
            type="button"
            onClick={() => loadAdminData()}
            className="primary-button inline-flex items-center gap-2"
            disabled={isLoading}
          >
            <RefreshCw size={18} />
            Refresh Console
          </button>
        </Card>
      </section>

      <section id="tables" className="space-y-4 scroll-mt-24">
        <Card title="Table Browser" subtitle="Browse all current database tables in one place.">
          <div className="grid gap-4">
            <div className="flex flex-wrap items-end gap-4">
              <label className="block min-w-[220px]">
                <span className="mb-2 block text-sm font-medium text-muted">Choose Table</span>
                <select
                  className="glass-input"
                  value={selectedTable}
                  onChange={async (event) => {
                    const nextTable = event.target.value;
                    try {
                      await refreshSelectedTable(nextTable);
                    } catch (error) {
                      setErrorMessage(error.message);
                    }
                  }}
                >
                  {tables.map((table) => (
                    <option key={table.table} value={table.table}>
                      {table.table}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-[14px] bg-white/45 px-4 py-3 text-sm text-muted">
                Rows available: <span className="font-semibold text-ink">{tableData?.count ?? 0}</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-[18px] border border-white/45 bg-white/35">
              <table className="min-w-full text-left text-sm text-muted">
                <thead className="bg-white/45 text-ink">
                  <tr>
                    {(tableData?.columns || []).map((column) => (
                      <th key={column} className="px-4 py-3 font-semibold">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(tableData?.rows || []).map((row, index) => (
                    <tr key={index} className="border-t border-white/35">
                      {tableData.columns.map((column) => (
                        <td key={`${index}-${column}`} className="max-w-[280px] px-4 py-3 align-top">
                          <div className="line-clamp-4 break-words">{String(row[column] ?? "")}</div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </section>

      <section id="courses" className="space-y-4 scroll-mt-24">
        <Card title="Course Manager" subtitle="Add new courses or update the current course list.">
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="grid gap-3">
              {courses.map((course) => (
                <div
                  key={course.course_id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] bg-white/45 px-4 py-4"
                >
                  <div>
                    <p className="font-semibold text-ink">{course.course_name}</p>
                    <p className="text-sm text-muted">
                      Course ID {course.course_id} | {course.total_years} years
                    </p>
                  </div>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      setCourseForm({
                        courseId: course.course_id,
                        course_name: course.course_name,
                        total_years: course.total_years,
                      })
                    }
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="secondary-button inline-flex items-center gap-2 text-danger"
                    onClick={() => handleCourseDelete(course.course_id)}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              ))}
            </div>

            <form className="grid self-start gap-4" onSubmit={handleCourseSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-muted">Course Name</span>
                <input
                  className="glass-input"
                  value={courseForm.course_name}
                  onChange={(event) =>
                    setCourseForm((current) => ({ ...current, course_name: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-muted">Total Years</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  className="glass-input"
                  value={courseForm.total_years}
                  onChange={(event) =>
                    setCourseForm((current) => ({ ...current, total_years: event.target.value }))
                  }
                  required
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <button type="submit" className="primary-button inline-flex items-center gap-2">
                  <Save size={18} />
                  {courseForm.courseId ? "Update Course" : "Add Course"}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setCourseForm(initialCourseForm)}
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        </Card>
      </section>
      <section id="students" className="space-y-4 scroll-mt-24">
        <Card title="Student Manager" subtitle="Add, edit, reset credentials, or remove a student account.">
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="grid gap-3">
              {students.map((studentItem) => (
                <div
                  key={studentItem.student_id}
                  className="rounded-[16px] bg-white/45 px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{studentItem.name}</p>
                      <p className="text-sm text-muted">
                        {studentItem.student_id} | {studentItem.email}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {studentItem.course_name} | Year {studentItem.year} | Semester {studentItem.semester}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          setStudentForm({
                            studentId: studentItem.student_id,
                            name: studentItem.name,
                            dob: studentItem.dob,
                            gender: studentItem.gender,
                            email: studentItem.email,
                            phone: studentItem.phone,
                            course_id: String(studentItem.course_id),
                            year: String(studentItem.year),
                            semester: String(studentItem.semester),
                            password: "",
                          })
                        }
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="secondary-button inline-flex items-center gap-2 text-danger"
                        onClick={() => handleStudentDelete(studentItem.student_id)}
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <form className="grid self-start gap-4" onSubmit={handleStudentSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-muted">Name</span>
                <input
                  className="glass-input"
                  value={studentForm.name}
                  onChange={(event) =>
                    setStudentForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-muted">DOB</span>
                <input
                  type="date"
                  className="glass-input"
                  value={studentForm.dob}
                  onChange={(event) =>
                    setStudentForm((current) => ({ ...current, dob: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-muted">Gender</span>
                <select
                  className="glass-input"
                  value={studentForm.gender}
                  onChange={(event) =>
                    setStudentForm((current) => ({ ...current, gender: event.target.value }))
                  }
                >
                  <option>Female</option>
                  <option>Male</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-muted">Email</span>
                <input
                  type="email"
                  className="glass-input"
                  value={studentForm.email}
                  onChange={(event) =>
                    setStudentForm((current) => ({ ...current, email: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-muted">Phone</span>
                <input
                  className="glass-input"
                  value={studentForm.phone}
                  onChange={(event) =>
                    setStudentForm((current) => ({ ...current, phone: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-muted">Course</span>
                <select
                  className="glass-input"
                  value={studentForm.course_id}
                  onChange={(event) =>
                    setStudentForm((current) => ({
                      ...current,
                      course_id: event.target.value,
                      year: "",
                      semester: "",
                    }))
                  }
                  required
                >
                  <option value="">Select course</option>
                  {courses.map((course) => (
                    <option key={course.course_id} value={course.course_id}>
                      {course.course_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-muted">Year</span>
                <select
                  className="glass-input"
                  value={studentForm.year}
                  onChange={(event) =>
                    setStudentForm((current) => ({
                      ...current,
                      year: event.target.value,
                      semester: "",
                    }))
                  }
                  required
                >
                  <option value="">Select year</option>
                  {studentYears.map((year) => (
                    <option key={year} value={year}>
                      Year {year}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-muted">Semester</span>
                <select
                  className="glass-input"
                  value={studentForm.semester}
                  onChange={(event) =>
                    setStudentForm((current) => ({ ...current, semester: event.target.value }))
                  }
                  required
                >
                  <option value="">Select semester</option>
                  {availableSemesters.map((semester) => (
                    <option key={semester} value={semester}>
                      Semester {semester}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-muted">
                  {studentForm.studentId ? "New Password (optional)" : "Password"}
                </span>
                <input
                  type="password"
                  className="glass-input"
                  value={studentForm.password}
                  onChange={(event) =>
                    setStudentForm((current) => ({ ...current, password: event.target.value }))
                  }
                  required={!studentForm.studentId}
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <button type="submit" className="primary-button inline-flex items-center gap-2">
                  <Save size={18} />
                  {studentForm.studentId ? "Update Student" : "Add Student"}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setStudentForm(initialStudentForm)}
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        </Card>
      </section>

      <section id="syllabus" className="space-y-4 scroll-mt-24">
        <Card
          title="Subject + Module Builder"
          subtitle="Create or update a subject, choose the course, then define modules with comma-separated topics."
        >
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="grid gap-3">
              {subjects.map((subject) => (
                <div
                  key={subject.subject_code}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] bg-white/45 px-4 py-4"
                >
                  <div>
                    <p className="font-semibold text-ink">{subject.subject_name}</p>
                    <p className="text-sm text-muted">
                      {subject.subject_code} | Course {subject.course_id} | Year {subject.year} | Semester {subject.semester}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={async () => {
                      const moduleRows = await fetchJson(`/modules/${subject.subject_code}`);
                      const modulesWithTopics = await Promise.all(
                        moduleRows.map(async (module) => {
                          const topics = await fetchJson(`/topics/${module.module_id}`);
                          return {
                            module_title: module.module_title,
                            topics_text: topics.map((topic) => topic.topic).join(", "),
                          };
                        }),
                      );
                      setSubjectForm({
                        editingCode: subject.subject_code,
                        subject_code: subject.subject_code,
                        subject_name: subject.subject_name,
                        credits: subject.credits,
                        type: subject.type,
                        semester: String(subject.semester),
                        year: String(subject.year),
                        course_id: String(subject.course_id),
                        modules: modulesWithTopics.length ? modulesWithTopics : [{ ...emptyModule }],
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="secondary-button inline-flex items-center gap-2 text-danger"
                    onClick={() => handleSubjectDelete(subject.subject_code)}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              ))}
            </div>

            <form className="grid self-start gap-4" onSubmit={handleSubjectSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-muted">Subject Code</span>
                <input
                  className="glass-input"
                  value={subjectForm.subject_code}
                  onChange={(event) =>
                    setSubjectForm((current) => ({ ...current, subject_code: event.target.value.toUpperCase() }))
                  }
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-muted">Subject Name</span>
                <input
                  className="glass-input"
                  value={subjectForm.subject_name}
                  onChange={(event) =>
                    setSubjectForm((current) => ({ ...current, subject_name: event.target.value }))
                  }
                  required
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-muted">Credits</span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    className="glass-input"
                    value={subjectForm.credits}
                    onChange={(event) =>
                      setSubjectForm((current) => ({ ...current, credits: event.target.value }))
                    }
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-muted">Type</span>
                  <input
                    className="glass-input"
                    value={subjectForm.type}
                    onChange={(event) =>
                      setSubjectForm((current) => ({ ...current, type: event.target.value }))
                    }
                    required
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-muted">Course</span>
                <select
                  className="glass-input"
                  value={subjectForm.course_id}
                  onChange={(event) =>
                    setSubjectForm((current) => ({
                      ...current,
                      course_id: event.target.value,
                      year: "",
                      semester: "",
                    }))
                  }
                  required
                >
                  <option value="">Select course</option>
                  {courses.map((course) => (
                    <option key={course.course_id} value={course.course_id}>
                      {course.course_name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-muted">Year</span>
                  <select
                    className="glass-input"
                    value={subjectForm.year}
                    onChange={(event) =>
                      setSubjectForm((current) => ({
                        ...current,
                        year: event.target.value,
                        semester: "",
                      }))
                    }
                    required
                  >
                    <option value="">Select year</option>
                    {subjectYears.map((year) => (
                      <option key={year} value={year}>
                        Year {year}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-muted">Semester</span>
                  <select
                    className="glass-input"
                    value={subjectForm.semester}
                    onChange={(event) =>
                      setSubjectForm((current) => ({ ...current, semester: event.target.value }))
                    }
                    required
                  >
                    <option value="">Select semester</option>
                    {subjectSemesters.map((semester) => (
                      <option key={semester} value={semester}>
                        Semester {semester}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid gap-4">
                {subjectForm.modules.map((module, index) => (
                  <div key={index} className="rounded-[16px] bg-white/45 p-4">
                    <p className="mb-3 text-sm font-semibold text-ink">Module {index + 1}</p>
                    <div className="grid gap-3">
                      <input
                        className="glass-input"
                        placeholder="Module heading"
                        value={module.module_title}
                        onChange={(event) =>
                          setSubjectForm((current) => ({
                            ...current,
                            modules: current.modules.map((item, moduleIndex) =>
                              moduleIndex === index
                                ? { ...item, module_title: event.target.value }
                                : item,
                            ),
                          }))
                        }
                        required
                      />
                      <textarea
                        className="glass-input min-h-[100px]"
                        placeholder="Topic one, Topic two, Topic three"
                        value={module.topics_text}
                        onChange={(event) =>
                          setSubjectForm((current) => ({
                            ...current,
                            modules: current.modules.map((item, moduleIndex) =>
                              moduleIndex === index
                                ? { ...item, topics_text: event.target.value }
                                : item,
                            ),
                          }))
                        }
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="secondary-button inline-flex items-center gap-2"
                  onClick={() =>
                    setSubjectForm((current) => ({
                      ...current,
                      modules: [...current.modules, { ...emptyModule }],
                    }))
                  }
                >
                  <Plus size={16} />
                  Add Module
                </button>
                {subjectForm.modules.length > 1 ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      setSubjectForm((current) => ({
                        ...current,
                        modules: current.modules.slice(0, -1),
                      }))
                    }
                  >
                    Remove Last Module
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                <button type="submit" className="primary-button inline-flex items-center gap-2">
                  <Save size={18} />
                  {subjectForm.editingCode ? "Update Subject" : "Add Subject"}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setSubjectForm(initialSubjectForm)}
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        </Card>
      </section>
    </AdminShell>
  );
}

export default AdminDashboard;
