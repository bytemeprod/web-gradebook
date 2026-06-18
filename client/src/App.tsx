import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import PublicRoute from "./components/PublicRoute.tsx";

// Placeholder Components (will be replaced by actual pages in subsequent commits)
const LoginPlaceholder = () => {
  const { login } = useAuth();
  const handleLogin = (role: "student" | "teacher") => {
    login(role === "student" ? "student1" : "teacher1", "password");
  };
  return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <h1>Вход в систему (Заглушка)</h1>
      <button onClick={() => handleLogin("student")} style={{ margin: 8, padding: "8px 16px" }}>Войти как Студент</button>
      <button onClick={() => handleLogin("teacher")} style={{ margin: 8, padding: "8px 16px" }}>Войти как Преподаватель</button>
    </div>
  );
};

const StudentHomePlaceholder = () => <div><h1>Личный кабинет студента</h1><p>Расписание</p></div>;
const StudentGradebookPlaceholder = () => <div><h1>Электронный журнал студента</h1></div>;
const StudentSubjectPlaceholder = () => <div><h1>Детализация предмета</h1></div>;
const TeacherHomePlaceholder = () => <div><h1>Кабинет преподавателя</h1><p>Расписание преподавателя</p></div>;
const TeacherGradebookPlaceholder = () => <div><h1>Журнал оценок группы</h1></div>;
const TeacherProgramPlaceholder = () => <div><h1>Программа по предмету</h1></div>;
const TeacherSubmissionsPlaceholder = () => <div><h1>Сдача лабораторных</h1></div>;

const RootRedirect: React.FC = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return user.role === "teacher" ? <Navigate to="/teacher" replace /> : <Navigate to="/student" replace />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPlaceholder />} />
          </Route>

          {/* Root Redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Student Routes */}
          <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
            <Route path="/student" element={<StudentHomePlaceholder />} />
            <Route path="/student/gradebook" element={<StudentGradebookPlaceholder />} />
            <Route path="/student/subject/:subjectId" element={<StudentSubjectPlaceholder />} />
          </Route>

          {/* Teacher Routes */}
          <Route element={<ProtectedRoute allowedRoles={["teacher"]} />}>
            <Route path="/teacher" element={<TeacherHomePlaceholder />} />
            <Route path="/teacher/gradebook" element={<TeacherGradebookPlaceholder />} />
            <Route path="/teacher/program/:subjectId" element={<TeacherProgramPlaceholder />} />
            <Route path="/teacher/submissions" element={<TeacherSubmissionsPlaceholder />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
