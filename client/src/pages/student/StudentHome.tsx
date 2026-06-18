import React, { useEffect, useState } from "react";
import Layout from "../../components/Layout.tsx";
import { api } from "../../api/client.ts";
import type { ScheduleEntry } from "../../types/index.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import { Clock, MapPin, User, CalendarDays } from "lucide-react";

const DAYS_OF_WEEK = [
  "Воскресенье",
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота"
];

const StudentHome: React.FC = () => {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get current day of week (0 = Sunday, 1 = Monday...)
  const currentDay = new Date().getDay();

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const data = await api.get("/api/student/schedule");
        setSchedule(data.schedule || []);
      } catch (err: any) {
        console.error("Failed to load schedule:", err);
        setError(err.message || "Ошибка при загрузке расписания.");
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
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
      <div className="student-home">
        <style>{`
          .welcome-banner {
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(14, 165, 233, 0.15) 100%);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 24px;
            margin-bottom: 24px;
          }
          .welcome-title {
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 6px;
          }
          .welcome-text {
            font-size: 14px;
            color: var(--text-secondary);
          }
          .schedule-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 24px;
          }
          .day-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 20px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
          }
          .day-card.today {
            border-color: var(--color-primary);
            box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.1);
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
            gap: 14px;
          }
          .lesson-item {
            padding: 12px;
            border-radius: var(--radius-sm);
            background: var(--bg-primary);
            border-left: 3px solid var(--color-primary);
            transition: transform var(--transition-fast);
          }
          .lesson-item:hover {
            transform: translateX(4px);
          }
          .lesson-time {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: var(--text-muted);
            margin-bottom: 4px;
          }
          .lesson-title {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 8px;
          }
          .lesson-meta {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: var(--text-secondary);
          }
          .meta-info {
            display: flex;
            align-items: center;
            gap: 4px;
          }
          .no-lessons {
            font-size: 13px;
            color: var(--text-muted);
            text-align: center;
            padding: 16px 0;
          }
        `}</style>

        <div className="welcome-banner glass-panel">
          <h1 className="welcome-title">Рады видеть тебя, {user?.name}!</h1>
          <p className="welcome-text">Это твое актуальное расписание занятий. Успешной учебы!</p>
        </div>

        <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <CalendarDays size={20} />
          <span>Расписание занятий</span>
        </h2>

        {loading ? (
          <div>Загрузка расписания...</div>
        ) : error ? (
          <div className="error-banner" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", padding: 16, borderRadius: 8, color: "#fca5a5" }}>{error}</div>
        ) : (
          <div className="schedule-container">
            {/* Show Monday (1) to Friday (5) */}
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
                          <div className="lesson-time">
                            <Clock size={12} />
                            <span>{entry.start_time} - {entry.end_time}</span>
                          </div>
                          <div className="lesson-title">{entry.subject_name}</div>
                          <div className="lesson-meta">
                            <div className="meta-info">
                              <MapPin size={12} />
                              <span>Ауд. {entry.room}</span>
                            </div>
                            <div className="meta-info" title="Преподаватель">
                              <User size={12} />
                              <span>{entry.teacher_name || "Преподаватель"}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-lessons">Нет занятий</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default StudentHome;
