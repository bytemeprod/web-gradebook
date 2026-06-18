import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import PublicRoute from "./components/PublicRoute.tsx";
import Login from "./pages/Login.tsx";
import StudentHome from "./pages/student/StudentHome.tsx";
import StudentGradebook from "./pages/student/StudentGradebook.tsx";
import StudentSubject from "./pages/student/StudentSubject.tsx";
import StudentLab from "./pages/student/StudentLab.tsx";
import TeacherHome from "./pages/teacher/TeacherHome.tsx";
import TeacherGradebook from "./pages/teacher/TeacherGradebook.tsx";
import TeacherProgram from "./pages/teacher/TeacherProgram.tsx";
import TeacherSubmissions from "./pages/teacher/TeacherSubmissions.tsx";

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
            <Route path="/student/gradebook" element={<StudentGradebook />} />
            <Route path="/student/subject/:subjectId" element={<StudentSubject />} />
            <Route path="/student/lab/:labId" element={<StudentLab />} />
          </Route>

          {/* Teacher Routes */}
          <Route element={<ProtectedRoute allowedRoles={["teacher"]} />}>
            <Route path="/teacher" element={<TeacherHome />} />
            <Route path="/teacher/gradebook" element={<TeacherGradebook />} />
            <Route path="/teacher/program/:subjectId" element={<TeacherProgram />} />
            <Route path="/teacher/submissions" element={<TeacherSubmissions />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
