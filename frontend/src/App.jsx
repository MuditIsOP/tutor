import { Navigate, Route, Routes } from "react-router-dom";

import Assessments from "./pages/Assessments";
import Dashboard from "./pages/Dashboard";
import Learn from "./pages/Learn";
import Login from "./pages/Login";
import ModulePage from "./pages/ModulePage";
import Progress from "./pages/Progress";
import QuizReview from "./pages/QuizReview";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import Settings from "./pages/Settings";
import SubjectPage from "./pages/SubjectPage";
import Subjects from "./pages/Subjects";
import Welcome from "./pages/Welcome";

function App() {
  const isAuthenticated = Boolean(localStorage.getItem("virtualTutorStudent"));

  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/dashboard"
        element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/subjects"
        element={isAuthenticated ? <Subjects /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/subject/:subjectCode"
        element={isAuthenticated ? <SubjectPage /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/module/:moduleId"
        element={isAuthenticated ? <ModulePage /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/learn/:topicId"
        element={isAuthenticated ? <Learn /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/assessments"
        element={isAuthenticated ? <Assessments /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/progress"
        element={isAuthenticated ? <Progress /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/settings"
        element={isAuthenticated ? <Settings /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/quiz-review/:sessionId"
        element={isAuthenticated ? <QuizReview /> : <Navigate to="/login" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
