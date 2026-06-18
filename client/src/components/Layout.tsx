import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.tsx";
import { 
  Calendar, 
  BookOpen, 
  LogOut, 
  Menu, 
  X, 
  User as UserIcon, 
  Sun, 
  Moon,
  FileCheck
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark";
    if (saved) return saved;
    // Default to dark mode for rich aesthetics
    return "dark";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const isStudent = user?.role === "student";

  // Sidebar Menu Items
  const menuItems = isStudent
    ? [
        { path: "/student", label: "Расписание", icon: Calendar },
        { path: "/student/gradebook", label: "Оценки", icon: BookOpen },
      ]
    : [
        { path: "/teacher", label: "Расписание", icon: Calendar },
        { path: "/teacher/gradebook", label: "Журнал оценок", icon: BookOpen },
        { path: "/teacher/submissions", label: "Сдачи лабораторных", icon: FileCheck },
      ];

  return (
    <div className="layout-container" style={{ display: "flex", minHeight: "100vh" }}>
      {/* CSS Styles for Layout */}
      <style>{`
        .layout-container {
          background-color: var(--bg-primary);
          color: var(--text-primary);
        }
        .sidebar {
          width: 260px;
          background-color: var(--bg-sidebar);
          color: var(--text-on-sidebar);
          display: flex;
          flex-direction: column;
          padding: 24px 16px;
          border-right: 1px solid var(--border-color);
          position: fixed;
          height: 100vh;
          z-index: 100;
          transition: transform var(--transition-normal);
        }
        .sidebar-logo {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 32px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #818cf8;
        }
        .sidebar-menu {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex-grow: 1;
        }
        .menu-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: var(--radius-sm);
          font-weight: 500;
          font-size: 14px;
          color: var(--text-muted);
          transition: background var(--transition-fast), color var(--transition-fast);
        }
        .menu-link:hover {
          background-color: var(--bg-sidebar-hover);
          color: var(--text-on-sidebar);
        }
        .menu-link.active {
          background-color: var(--color-primary);
          color: #ffffff;
        }
        .sidebar-user {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 16px;
          margin-top: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .user-name {
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 150px;
        }
        .user-role {
          font-size: 11px;
          color: var(--text-muted);
        }
        .main-content {
          margin-left: 260px;
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }
        .header {
          height: 70px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .header-title {
          font-size: 18px;
          font-weight: 600;
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .theme-btn, .menu-toggle-btn {
          background: transparent;
          border: 1px solid var(--border-color);
          width: 36px;
          height: 36px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-secondary);
          transition: background var(--transition-fast);
        }
        .theme-btn:hover, .menu-toggle-btn:hover {
          background-color: var(--bg-primary);
        }
        .menu-toggle-btn {
          display: none;
        }
        .page-body {
          padding: 32px;
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(${sidebarOpen ? "0" : "-100%"});
          }
          .main-content {
            margin-left: 0;
          }
          .menu-toggle-btn {
            display: flex;
          }
        }
      `}</style>

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <BookOpen size={24} />
          <span>Журнал v2026</span>
        </div>
        <nav className="sidebar-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`menu-link ${isActive ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <button
          onClick={handleLogout}
          className="menu-link"
          style={{ background: "transparent", border: "none", cursor: "pointer", width: "100%", textAlign: "left" }}
        >
          <LogOut size={18} />
          <span>Выйти</span>
        </button>
        <div className="sidebar-user">
          <div className="user-avatar">
            <UserIcon size={20} />
          </div>
          <div>
            <div className="user-name" title={user?.name}>{user?.name}</div>
            <div className="user-role">{isStudent ? "Студент" : "Преподаватель"}</div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        <header className="header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button className="menu-toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <h2 className="header-title">
              {location.pathname.includes("gradebook")
                ? "Электронный журнал"
                : location.pathname.includes("submissions")
                ? "Сдачи лабораторных"
                : location.pathname.includes("subject") || location.pathname.includes("program")
                ? "Учебная программа"
                : "Панель управления"}
            </h2>
          </div>
          <div className="header-actions">
            <button className="theme-btn" onClick={toggleTheme} title="Смена темы">
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </header>
        <main className="page-body animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
