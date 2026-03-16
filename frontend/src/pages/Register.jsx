import { Camera, Eye, EyeOff, House, ShieldCheck, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import PhoneInput from "react-phone-input-2";
import { Link, useNavigate } from "react-router-dom";

import Card from "../components/Card";
import { API_BASE_URL } from "../lib/api";

const initialFormState = {
  name: "",
  dob: null,
  gender: "Female",
  email: "",
  phone: "",
  course_id: "",
  year: "",
  semester: "",
  password: "",
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

function Register() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordHelp, setShowPasswordHelp] = useState(false);

  const selectedCourse = courses.find(
    (course) => String(course.course_id) === String(formData.course_id),
  );

  const availableYears = useMemo(
    () =>
      selectedCourse
        ? Array.from({ length: selectedCourse.total_years }, (_, index) => index + 1)
        : [],
    [selectedCourse],
  );
  const availableSemesters = formData.year
    ? [Number(formData.year) * 2 - 1, Number(formData.year) * 2]
    : [];

  const passwordChecks = {
    length: formData.password.length >= 8,
    upper: /[A-Z]/.test(formData.password),
    lower: /[a-z]/.test(formData.password),
    number: /\d/.test(formData.password),
    special: /[^A-Za-z0-9]/.test(formData.password),
  };

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/courses`);
        const data = await response.json();
        setCourses(data);
      } catch {
        setErrorMessage("Unable to load courses right now.");
      }
    };

    loadCourses();
  }, []);

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

      if (formData.password !== formData.confirmPassword) {
        throw new Error("Password and confirm password must match.");
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
      payload.append("password", formData.password);
      if (profilePhoto) {
        payload.append("profile_photo", profilePhoto);
      }

      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        body: payload,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Registration failed.");
      }

      setSuccessMessage(`Registration successful. Your number is ${data.student_id}.`);
      setFormData(initialFormState);
      setProfilePhoto(null);
      window.setTimeout(() => navigate("/login"), 1400);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-4xl">
        <Card
          title="Student Registration"
          subtitle="Create your account to access the tutor dashboard."
          className="rounded-panel p-8"
        >
          <div className="mb-6 flex justify-end">
            <Link to="/admin/login" className="secondary-button inline-flex items-center gap-2">
              <ShieldCheck size={16} />
              Login as Admin
            </Link>
          </div>

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
                placeholder="Enter your full name"
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
                placeholderText="Select date of birth"
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
                placeholder="name@example.com"
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
                placeholder="Enter phone number"
                containerClass="phone-field"
                inputClass="glass-input"
                buttonClass="phone-button"
                dropdownClass="phone-dropdown"
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
                <option value="">Select Course</option>
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
                required
                disabled={!selectedCourse}
              >
                <option value="">
                  {selectedCourse ? "Select Year" : "Select Course First"}
                </option>
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
                required
                disabled={!formData.year}
              >
                <option value="">
                  {formData.year ? "Select Semester" : "Select Year First"}
                </option>
                {availableSemesters.map((semester) => (
                  <option key={semester} value={semester}>
                    Semester {semester}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-muted">Password</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className="glass-input pr-11"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setShowPasswordHelp(true)}
                  onBlur={() => window.setTimeout(() => setShowPasswordHelp(false), 120)}
                  required
                />
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-soft transition duration-200 hover:text-ink"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {showPasswordHelp ? (
                <div className="mt-3 rounded-[14px] border border-white/40 bg-white/45 p-4">
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
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-muted">
                Confirm Password
              </span>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  className="glass-input pr-11"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-soft transition duration-200 hover:text-ink"
                  aria-label={
                    showConfirmPassword ? "Hide confirm password" : "Show confirm password"
                  }
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword ? (
                <p className="mt-2 text-sm text-danger">Passwords do not match.</p>
              ) : null}
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-muted">Profile Photo</span>
              <label className="glass-input flex cursor-pointer items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-muted">
                  <Camera size={18} />
                  {profilePhoto ? profilePhoto.name : "Upload a photo"}
                </span>
                <span className="rounded-[10px] bg-white/50 px-3 py-2 text-xs font-semibold text-ink">
                  Choose File
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(event) => setProfilePhoto(event.target.files?.[0] || null)}
                />
              </label>
            </label>

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

            <div className="flex flex-wrap items-center justify-between gap-4 md:col-span-2">
              <div className="inline-flex items-center gap-3 text-sm text-muted">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/55 text-accent">
                  <UserPlus size={22} />
                </div>
                <span>Your registration number is generated automatically.</span>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to="/" className="secondary-button inline-flex items-center gap-2">
                  <House size={16} />
                  Home
                </Link>
                <Link to="/login" className="secondary-button">
                  Back to Login
                </Link>
                <button type="submit" className="primary-button" disabled={isSubmitting}>
                  {isSubmitting ? "Creating Account..." : "Register"}
                </button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}

export default Register;
