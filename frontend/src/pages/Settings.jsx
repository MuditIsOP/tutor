import { Camera, Eye, EyeOff, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import PhoneInput from "react-phone-input-2";
import { useNavigate } from "react-router-dom";

import AppShell from "../components/AppShell";
import Card from "../components/Card";
import { API_BASE_URL, fetchJson } from "../lib/api";
import { getStoredStudent, setStoredStudent } from "../lib/session";

const emptyPasswordState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const passwordRules = [
  { id: "length", label: "At least 8 characters" },
  { id: "upper", label: "One uppercase letter" },
  { id: "lower", label: "One lowercase letter" },
  { id: "number", label: "One number" },
  { id: "special", label: "One special character" },
];

function formatDateForApi(dateValue) {
  if (!dateValue) {
    return "";
  }

  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");
  const day = String(dateValue.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function Settings() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [formData, setFormData] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswordHelp, setShowPasswordHelp] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const storedStudent = getStoredStudent();
    if (!storedStudent) {
      navigate("/login");
      return;
    }

    const loadSettings = async () => {
      try {
        const [courseData, studentData] = await Promise.all([
          fetchJson("/courses"),
          fetchJson(`/students/${storedStudent.student_id}`),
        ]);
        setCourses(courseData);
        setStudent(studentData);
        setFormData({
          name: studentData.name,
          dob: new Date(studentData.dob),
          gender: studentData.gender,
          email: studentData.email,
          phone: String(studentData.phone || "").replace(/\D/g, ""),
          course_id: String(studentData.course_id),
          year: String(studentData.year),
          semester: String(studentData.semester),
          removeProfilePhoto: false,
          ...emptyPasswordState,
        });
      } catch (error) {
        setErrorMessage(error.message);
      }
    };

    loadSettings();
  }, [navigate]);

  const selectedCourse = courses.find(
    (course) => String(course.course_id) === String(formData?.course_id || ""),
  );

  const availableYears = useMemo(
    () =>
      selectedCourse
        ? Array.from({ length: selectedCourse.total_years }, (_, index) => index + 1)
        : [],
    [selectedCourse],
  );

  const availableSemesters = formData?.year
    ? [Number(formData.year) * 2 - 1, Number(formData.year) * 2]
    : [];

  const passwordChecks = {
    length: (formData?.newPassword || "").length >= 8,
    upper: /[A-Z]/.test(formData?.newPassword || ""),
    lower: /[a-z]/.test(formData?.newPassword || ""),
    number: /\d/.test(formData?.newPassword || ""),
    special: /[^A-Za-z0-9]/.test(formData?.newPassword || ""),
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
      ...(name === "course_id" ? { year: "", semester: "" } : {}),
      ...(name === "year" ? { semester: "" } : {}),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!student || !formData) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const normalizedName = formData.name.trim().replace(/\s+/g, " ");
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (normalizedName.length < 3) {
        throw new Error("Name must be at least 3 characters long.");
      }
      if (!emailPattern.test(formData.email)) {
        throw new Error("Please enter a valid email address.");
      }
      if (!formData.phone || formData.phone.length < 8) {
        throw new Error("Please enter a valid phone number.");
      }
      if (!formData.dob) {
        throw new Error("Please select your date of birth.");
      }
      if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
        throw new Error("New password and confirm password must match.");
      }

      const sensitiveChanges = [];
      if (formData.email.trim() !== student.email) {
        sensitiveChanges.push("email");
      }
      if (Number(formData.course_id) !== student.course_id) {
        sensitiveChanges.push("course");
      }
      if (Number(formData.year) !== student.year) {
        sensitiveChanges.push("year");
      }
      if (Number(formData.semester) !== student.semester) {
        sensitiveChanges.push("semester");
      }
      if (formData.newPassword) {
        sensitiveChanges.push("password");
      }
      if (profilePhoto) {
        sensitiveChanges.push("profile photo");
      }
      if (formData.removeProfilePhoto) {
        sensitiveChanges.push("remove profile photo");
      }

      if (
        sensitiveChanges.length &&
        !window.confirm(
          `Please confirm these sensitive changes: ${sensitiveChanges.join(", ")}. Continue?`,
        )
      ) {
        setIsSubmitting(false);
        return;
      }

      const payload = new FormData();
      payload.append("name", normalizedName);
      payload.append("dob", formatDateForApi(formData.dob));
      payload.append("gender", formData.gender);
      payload.append("email", formData.email.trim());
      payload.append("phone", `+${formData.phone}`);
      payload.append("course_id", formData.course_id);
      payload.append("year", formData.year);
      payload.append("semester", formData.semester);
      payload.append("remove_profile_photo", String(formData.removeProfilePhoto));
      if (formData.currentPassword) {
        payload.append("current_password", formData.currentPassword);
      }
      if (formData.newPassword) {
        payload.append("new_password", formData.newPassword);
      }
      if (profilePhoto) {
        payload.append("profile_photo", profilePhoto);
      }

      const response = await fetch(`${API_BASE_URL}/students/${student.student_id}`, {
        method: "PUT",
        body: payload,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Unable to update settings.");
      }

      setStudent(data);
      setStoredStudent(data);
      setFormData({
        name: data.name,
        dob: new Date(data.dob),
        gender: data.gender,
        email: data.email,
        phone: String(data.phone || "").replace(/\D/g, ""),
        course_id: String(data.course_id),
        year: String(data.year),
        semester: String(data.semester),
        removeProfilePhoto: false,
        ...emptyPasswordState,
      });
      setProfilePhoto(null);
      setSuccessMessage("Settings updated successfully.");
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!student || !formData) {
    return null;
  }

  return (
    <AppShell
      student={student}
      title="Settings"
      subtitle="Update your student profile, password, and academic details"
    >
      <Card
        title="Profile Settings"
        subtitle="Everything here saves back to your account and updates the dashboard immediately."
        className="rounded-panel"
      >
        <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-muted">Full Name</span>
            <input
              type="text"
              name="name"
              minLength={3}
              className="glass-input"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-muted">Date of Birth</span>
            <DatePicker
              selected={formData.dob}
              onChange={(dateValue) =>
                setFormData((current) => ({ ...current, dob: dateValue }))
              }
              dateFormat="dd MMM yyyy"
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              maxDate={new Date()}
              className="glass-input"
              yearDropdownItemNumber={100}
              scrollableYearDropdown
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-muted">Gender</span>
            <select
              name="gender"
              className="glass-input"
              value={formData.gender}
              onChange={handleChange}
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
              name="email"
              className="glass-input"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-muted">Phone</span>
            <PhoneInput
              country="in"
              value={formData.phone}
              onChange={(value) =>
                setFormData((current) => ({ ...current, phone: value.replace(/\D/g, "") }))
              }
              enableSearch
              disableSearchIcon
              containerClass="phone-field"
              inputClass="glass-input"
              inputProps={{
                name: "phone",
                required: true,
              }}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-muted">Course</span>
            <select
              name="course_id"
              className="glass-input"
              value={formData.course_id}
              onChange={handleChange}
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
              name="year"
              className="glass-input"
              value={formData.year}
              onChange={handleChange}
              disabled={!selectedCourse}
              required
            >
              <option value="">{selectedCourse ? "Select year" : "Select course first"}</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  Year {year}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-muted">Semester</span>
            <select
              name="semester"
              className="glass-input"
              value={formData.semester}
              onChange={handleChange}
              disabled={!formData.year}
              required
            >
              <option value="">{formData.year ? "Select semester" : "Select year first"}</option>
              {availableSemesters.map((semester) => (
                <option key={semester} value={semester}>
                  Semester {semester}
                </option>
              ))}
            </select>
          </label>

          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-muted">Profile Photo</span>
            <div className="grid gap-4">
              <div className="flex items-center gap-4 rounded-[16px] bg-white/40 px-4 py-4">
                {student.profile_photo && !formData.removeProfilePhoto ? (
                  <img
                    src={student.profile_photo}
                    alt={student.name}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accentSecondary text-xl font-semibold text-white">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-sm text-muted">
                  <p className="font-semibold text-ink">Current avatar</p>
                  <p className="mt-1">
                    {student.profile_photo && !formData.removeProfilePhoto
                      ? "Uploaded profile photo"
                      : "Letter avatar will be shown"}
                  </p>
                </div>
              </div>

              <label className="glass-input flex cursor-pointer items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-muted">
                  <Camera size={18} />
                  {profilePhoto ? profilePhoto.name : "Upload a new profile photo"}
                </span>
                <span className="rounded-[10px] bg-white/50 px-3 py-2 text-xs font-semibold text-ink">
                  Choose File
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    setProfilePhoto(event.target.files?.[0] || null);
                    setFormData((current) => ({ ...current, removeProfilePhoto: false }));
                  }}
                />
              </label>

              <label className="inline-flex items-center gap-3 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={formData.removeProfilePhoto}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      removeProfilePhoto: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded accent-accent"
                />
                Remove current profile photo and use the letter avatar
              </label>
            </div>
          </label>

          <div className="md:col-span-2 grid gap-5 rounded-[18px] bg-white/35 p-5 lg:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-muted">Current Password</span>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  name="currentPassword"
                  className="glass-input pr-11"
                  value={formData.currentPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-soft transition duration-200 hover:text-ink"
                  aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                >
                  {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-muted">New Password</span>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  name="newPassword"
                  className="glass-input pr-11"
                  value={formData.newPassword}
                  onChange={handleChange}
                  onFocus={() => setShowPasswordHelp(true)}
                  onBlur={() => window.setTimeout(() => setShowPasswordHelp(false), 120)}
                />
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setShowNewPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-soft transition duration-200 hover:text-ink"
                  aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-muted">Confirm Password</span>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  className="glass-input pr-11"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-soft transition duration-200 hover:text-ink"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {showPasswordHelp ? (
              <div className="lg:col-span-3 rounded-[14px] border border-white/40 bg-white/45 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-soft">
                  Password Requirements
                </p>
                <div className="mt-3 grid gap-2 text-sm">
                  {passwordRules.map((rule) => (
                    <p
                      key={rule.id}
                      className={passwordChecks[rule.id] ? "text-success" : "text-muted"}
                    >
                      {rule.label}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {errorMessage ? (
            <p className="rounded-[10px] bg-red-50/70 px-3 py-2 text-sm text-danger md:col-span-2">
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <p className="rounded-[10px] bg-green-50/70 px-3 py-2 text-sm text-success md:col-span-2">
              {successMessage}
            </p>
          ) : null}

          <div className="md:col-span-2 flex justify-end">
            <button type="submit" className="primary-button inline-flex items-center gap-2" disabled={isSubmitting}>
              <Save size={18} />
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Card>
    </AppShell>
  );
}

export default Settings;
