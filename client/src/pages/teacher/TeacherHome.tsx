import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout.tsx";
import { api } from "../../api/client.ts";
import { ScheduleEntry, Group, Subject } from "../../types/index.ts";
import { Clock, MapPin, Users, CalendarDays, BookOpen, GraduationCap } from "lucide-react";

const DAYS_OF_WEEK = [
  "Воскресенье",
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота"
];

const TeacherHome: React.FC = () => {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentDay = new Date().getDay();

  useEffect(() => {
    const fetchTeacherDashboard = async () => {
      try {
        const [schedData, groupsData, subsData] = await Promise.all([
          api.get("/api/teacher/schedule"),
          api.get("/api/teacher/groups"),
          api.get("/api/teacher/subjects")
        ]);
        setSchedule(schedData.schedule || []);
        setGroups(groupsData.groups || []);
        setSubjects(subsData.subjects || []);
      } catch (err: any) {
        console.error("Failed to load teacher dashboard:", err);
        setError(err.message || "Ошибка при загрузке данных преподавателя.");
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherDashboard();
  }, []);

  // Group schedule by day
  const groupedSchedule = schedule.reduce((acc, entry) => {
    const day = entry.day_of_week;
    if (!acc[day]) acc[day] = [];
    acc[day].push(entry);
    return acc;
  }, {} as Record<number, ScheduleEntry[]>);

  return (
    <Layout>
      <div className="teacher-home">
        <style>{`
          .dashboard-grid {
            display: grid;
            grid-template-columns: 1fr 340px;
            gap: 28px;
            align-items: start;
          }
          @media (max-width: 900px) {
            .dashboard-grid {
              grid-template-columns: 1fr;
            }
          }
          .schedule-section {
            display: grid;
            grid-template-columns: 1fr;
            gap: 24px;
          }
          .day-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 20px;
          }
          .day-card.today {
            border-color: var(--color-primary);
            box-shadow: 0 4px 20px rgba(99, 102, 241, 0.08);
          }
          .day-header {
            font-size: 16px;
            font-weight: 600;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--border-color);
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .today-badge {
            background: var(--color-primary);
            color: white;
            font-size: 11px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 20px;
          }
          .lesson-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .lesson-item {
            padding: 12px 16px;
            border-radius: var(--radius-sm);
            background: var(--bg-primary);
            border-left: 3px solid var(--color-primary);
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: transform var(--transition-fast);
          }
          .lesson-item:hover {
            transform: translateX(4px);
          }
          .side-panel-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 24px;
            margin-bottom: 24px;
          }
          .side-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-top: 16px;
          }
          .side-item-link {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-sm);
            font-size: 14px;
            font-weight: 500;
            transition: border-color var(--transition-fast), background var(--transition-fast);
          }
          .side-item-link:hover {
            border-color: var(--color-primary);
            background: rgba(99, 102, 241, 0.02);
          }
        `}</style>

        {loading ? (
          <div>Загрузка кабинета...</div>
        ) : error ? (
          <div className="error-banner" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", padding: 16, borderRadius: 8, color: "#fca5a5" }}>{error}</div>
        ) : (
          <div className="dashboard-grid">
            {/* Main schedule view */}
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <CalendarDays size={20} />
                <span>Расписание Ваших занятий</span>
              </h2>

              <div className="schedule-section">
                {[1, 2, 3, 4, 5].map((dayIdx) => {
                  const lessons = groupedSchedule[dayIdx] || [];
                  const isToday = currentDay === dayIdx;
                  return (
                    <div key={dayIdx} className={`day-card ${isToday ? "today" : ""}`}>
                      <div className="day-header">
                        <span>{DAYS_OF_WEEK[dayIdx]}</span>
                        {isToday && <span className="today-badge">Сегодня</span>}
                      </div>
                      <div className="lesson-list">
                        {lessons.length > 0 ? (
                          lessons.map((entry) => (
                            <div key={entry.id} className="lesson-item">
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                                  <Clock size={12} />
                                  <span>{entry.start_time} - {entry.end_time}</span>
                                </div>
                                <div style={{ fontSize: "14px", fontWeight: 600 }}>{entry.subject_name}</div>
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                                <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--color-primary)" }}>Группа {entry.group_name}</span>
                                <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                                  <MapPin size={12} />
                                  Ауд. {entry.room}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>В этот день занятий нет</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Side list panels */}
            <div>
              {/* Groups Taught */}
              <div className="side-panel-card glass-panel">
                <h3 style={{ fontSize: "16px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                  <Users size={18} />
                  <span>Ваши группы</span>
                </h3>
                <div className="side-list">
                  {groups.length > 0 ? (
                    groups.map((g) => (
                      <Link key={g.id} to={`/teacher/gradebook?groupId=${g.id}`} className="side-item-link">
                        <span>Группа {g.name}</span>
                        <BookOpen size={16} style={{ color: "var(--color-primary)" }} />
                      </Link>
                    ))
                  ) : (
                    <div style={{ fontSize: "13px", color: "var(--text-muted)", padding: "12px 0" }}>Группы отсутствуют</div>
                  )}
                </div>
              </div>

              {/* Subjects Config */}
              <div className="side-panel-card glass-panel">
                <h3 style={{ fontSize: "16px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                  <GraduationCap size={18} />
                  <span>Учебные программы</span>
                </h3>
                <div className="side-list">
                  {subjects.map((sub) => (
                    <Link key={sub.id} to={`/teacher/program/${sub.id}`} className="side-item-link">
                      <span>{sub.name}</span>
                      <BookOpen size={16} style={{ color: "var(--color-primary)" }} />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default TeacherHome;
