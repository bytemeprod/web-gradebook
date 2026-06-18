import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout.tsx";
import { api } from "../../api/client.ts";
import type { Subject, Lesson, Grade } from "../../types/index.ts";
import { User, ChevronRight, Award, AlertTriangle, Clock } from "lucide-react";

const StudentGradebook: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGradebook = async () => {
      try {
        const data = await api.get("/api/student/gradebook");
        setSubjects(data.subjects || []);
        setLessons(data.lessons || []);
        setGrades(data.grades || []);
      } catch (err: any) {
        console.error("Failed to load gradebook:", err);
        setError(err.message || "Ошибка при загрузке успеваемости.");
      } finally {
        setLoading(false);
      }
    };

    fetchGradebook();
  }, []);

  // Helper to calculate stats for a subject
  const getSubjectStats = (subjectId: string) => {
    // Filter grades belonging to this subject's lessons
    const subjectLessons = lessons.filter(l => l.subject_id === subjectId);
    const lessonIds = subjectLessons.map(l => l.id);
    const subjectGrades = grades.filter(g => lessonIds.includes(g.lesson_id));

    let sum = 0;
    let count = 0;
    let absences = 0;
    let latenesses = 0;

    subjectGrades.forEach(g => {
      if (g.grade === "Н") {
        absences++;
      } else if (g.grade === "О") {
        latenesses++;
      } else {
        const val = parseFloat(g.grade);
        if (!isNaN(val)) {
          sum += val;
          count++;
        }
      }
    });

    const average = count > 0 ? (sum / count).toFixed(1) : "-";

    return {
      average,
      absences,
      latenesses,
      totalGrades: count,
      lessonsWithGrades: subjectGrades
    };
  };

  return (
    <Layout>
      <div className="student-gradebook">
        <style>{`
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 20px;
            margin-bottom: 28px;
          }
          .stat-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .stat-icon {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
          }
          .subject-list {
            display: flex;
            flex-direction: column;
            gap: 24px;
          }
          .subject-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 24px;
            transition: transform var(--transition-fast), border-color var(--transition-fast);
          }
          .subject-card:hover {
            border-color: var(--color-primary);
          }
          .subject-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 12px;
          }
          .subject-info h3 {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 4px;
          }
          .teacher-info {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            color: var(--text-muted);
          }
          .grade-stats-inline {
            display: flex;
            gap: 16px;
            font-size: 13px;
          }
          .stat-badge {
            background: var(--bg-primary);
            border-radius: 20px;
            padding: 4px 12px;
            font-weight: 500;
          }
          .stat-badge span {
            font-weight: 700;
            color: var(--color-primary);
          }
          .grades-timeline {
            display: flex;
            gap: 12px;
            overflow-x: auto;
            padding-bottom: 12px;
            margin-top: 12px;
            scroll-behavior: smooth;
          }
          .timeline-node {
            flex: 0 0 100px;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-sm);
            padding: 10px;
            text-align: center;
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
          }
          .node-date {
            font-size: 10px;
            color: var(--text-muted);
            text-transform: uppercase;
            font-weight: 600;
          }
          .view-subject-btn {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 13px;
            font-weight: 600;
            color: var(--color-primary);
            transition: gap var(--transition-fast);
          }
          .view-subject-btn:hover {
            color: var(--color-primary-hover);
            gap: 6px;
          }
        `}</style>

        {loading ? (
          <div>Загрузка оценок...</div>
        ) : error ? (
          <div className="error-banner" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", padding: 16, borderRadius: 8, color: "#fca5a5" }}>{error}</div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: "var(--color-primary)" }}>
                  <Award size={22} />
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Общий средний балл</div>
                  <div style={{ fontSize: "20px", fontWeight: 700 }}>
                    {(
                      grades
                        .filter(g => g.grade !== "Н" && g.grade !== "О")
                        .reduce((acc, curr, _, arr) => acc + parseFloat(curr.grade) / arr.length, 0) || 0
                    ).toFixed(1)}
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: "var(--grade-absent)" }}>
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Пропуски (Н)</div>
                  <div style={{ fontSize: "20px", fontWeight: 700 }}>
                    {grades.filter(g => g.grade === "Н").length}
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: "var(--grade-late)" }}>
                  <Clock size={22} />
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Опоздания (О)</div>
                  <div style={{ fontSize: "20px", fontWeight: 700 }}>
                    {grades.filter(g => g.grade === "О").length}
                  </div>
                </div>
              </div>
            </div>

            {/* Subject average bar chart */}
            <div className="glass-panel animate-fade-in" style={{ marginBottom: "28px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Средний балл по предметам</h3>
              <div style={{ 
                height: "220px", 
                display: "flex", 
                alignItems: "flex-end", 
                gap: "24px", 
                padding: "20px 20px 40px 20px", 
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-primary)",
                overflowX: "auto" 
              }}>
                {subjects.map(sub => {
                  const stats = getSubjectStats(sub.id);
                  const avg = parseFloat(stats.average);
                  const heightPercent = !isNaN(avg) ? (avg / 10) * 100 : 0;
                  return (
                    <div key={sub.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "1 0 100px", height: "100%", justifyContent: "flex-end", position: "relative" }}>
                      <span style={{ fontSize: "13px", fontWeight: "700", marginBottom: "8px", color: "var(--color-primary)" }}>
                        {stats.average}
                      </span>
                      <div style={{
                        width: "40px",
                        height: `${heightPercent}%`,
                        background: "linear-gradient(180deg, var(--color-primary) 0%, rgba(99, 102, 241, 0.3) 100%)",
                        borderRadius: "6px 6px 0 0",
                        transition: "height 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
                        boxShadow: "0 4px 12px rgba(99, 102, 241, 0.15)"
                      }} />
                      <span 
                        style={{ 
                          fontSize: "11px", 
                          color: "var(--text-secondary)", 
                          marginTop: "8px", 
                          textAlign: "center", 
                          whiteSpace: "nowrap", 
                          overflow: "hidden", 
                          textOverflow: "ellipsis", 
                          width: "100%",
                          position: "absolute",
                          bottom: "-25px"
                        }} 
                        title={sub.name}
                      >
                        {sub.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="subject-list">
              {subjects.map((sub) => {
                const stats = getSubjectStats(sub.id);
                // Get lessons and sort by date
                const subLessons = lessons.filter(l => l.subject_id === sub.id);
                const subGradesMap = new Map(
                  grades.filter(g => g.subject_id === sub.id || subLessons.map(l => l.id).includes(g.lesson_id)).map(g => [g.lesson_id, g])
                );

                return (
                  <div key={sub.id} className="subject-card glass-panel">
                    <div className="subject-header">
                      <div className="subject-info">
                        <h3>{sub.name}</h3>
                        <div className="teacher-info">
                          <User size={14} />
                          <span>{sub.teacher_name}</span>
                        </div>
                      </div>
                      <div className="grade-stats-inline">
                        <div className="stat-badge">Ср. балл: <span>{stats.average}</span></div>
                        <div className="stat-badge">Пропуски: <span>{stats.absences}</span></div>
                        <div className="stat-badge">Опоздания: <span>{stats.latenesses}</span></div>
                      </div>
                    </div>

                    <h4 style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>История уроков</h4>
                    
                    <div className="grades-timeline">
                      {subLessons.length > 0 ? (
                        subLessons.map((lesson) => {
                          const gradeObj = subGradesMap.get(lesson.id);
                          const val = gradeObj?.grade;
                          return (
                            <div key={lesson.id} className="timeline-node" title={lesson.title || "Урок"}>
                              <div className="node-date">{lesson.date.split("-").slice(1).reverse().join(".")}</div>
                              {val ? (
                                <span className={`grade-badge grade-${val}`}>
                                  {val}
                                </span>
                              ) : (
                                <span style={{ color: "var(--text-muted)", fontSize: "14px" }}>—</span>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="no-lessons" style={{ width: "100%", textAlign: "left", color: "var(--text-muted)", padding: "8px 0" }}>Занятий по предмету не проводилось</div>
                      )}
                    </div>

                    <div style={{ marginTop: "16px", textAlign: "right" }}>
                      <Link to={`/student/subject/${sub.id}`} className="view-subject-btn">
                        <span>Подробнее о предмете</span>
                        <ChevronRight size={16} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default StudentGradebook;
