import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import PublicRoute from "./components/PublicRoute.tsx";
import Login from "./pages/Login.tsx";
import StudentHome from "./pages/student/StudentHome.tsx";

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
            <Route path="/login" element={<Login />} />
          </Route>

          {/* Root Redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Student Routes */}
          <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
            <Route path="/student" element={<StudentHome />} />
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
