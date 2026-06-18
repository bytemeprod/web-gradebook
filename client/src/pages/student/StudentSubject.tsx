import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "../../components/Layout.tsx";
import { api } from "../../api/client.ts";
import { Subject, Lesson, Grade, Lab, LabSubmission } from "../../types/index.ts";
import { Calendar, Award, BookOpen, Clock, FileText, CheckCircle, AlertCircle } from "lucide-react";

const StudentSubject: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [submissions, setSubmissions] = useState<LabSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"grades" | "labs">("grades");

  useEffect(() => {
    const fetchSubjectDetails = async () => {
      try {
        const data = await api.get(`/api/student/subject/${subjectId}`);
        setSubject(data.subject);
        setLessons(data.lessons || []);
        setGrades(data.grades || []);
        setLabs(data.labs || []);
        setSubmissions(data.submissions || []);
      } catch (err: any) {
        console.error("Failed to load subject details:", err);
        setError(err.message || "Ошибка при загрузке деталей предмета.");
      } finally {
        setLoading(false);
      }
    };

    fetchSubjectDetails();
  }, [subjectId]);

  // Helper to get grade for a lesson
  const getLessonGrade = (lessonId: string) => {
    const gradeObj = grades.find(g => g.lesson_id === lessonId);
    return gradeObj ? gradeObj.grade : null;
  };

  // Helper to get submission for a lab
  const getLabSubmission = (labId: string) => {
    return submissions.find(s => s.lab_id === labId);
  };

  // Helper to calculate statistics
  const numericalGrades = grades
    .filter(g => g.grade !== "Н" && g.grade !== "О")
    .map(g => parseFloat(g.grade))
    .filter(val => !isNaN(val));

  const average = numericalGrades.length > 0
    ? (numericalGrades.reduce((sum, val) => sum + val, 0) / numericalGrades.length).toFixed(1)
    : "-";

  return (
    <Layout>
      <div className="student-subject">
        <style>{`
          .subject-details-header {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 28px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 20px;
          }
          .title-area h1 {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 6px;
          }
          .title-area p {
            font-size: 14px;
            color: var(--text-muted);
          }
          .stats-badge-large {
            display: flex;
            align-items: center;
            gap: 12px;
            background: rgba(99, 102, 241, 0.1);
            border: 1px solid rgba(99, 102, 241, 0.2);
            padding: 12px 20px;
            border-radius: var(--radius-md);
          }
          .tab-group {
            display: flex;
            border-bottom: 1px solid var(--border-color);
            margin-bottom: 24px;
            gap: 24px;
          }
          .tab-btn {
            background: transparent;
            border: none;
            padding: 12px 4px;
            font-weight: 600;
            font-size: 15px;
            color: var(--text-muted);
            cursor: pointer;
            position: relative;
            transition: color var(--transition-fast);
          }
          .tab-btn:hover {
            color: var(--text-primary);
          }
          .tab-btn.active {
            color: var(--color-primary);
          }
          .tab-btn.active::after {
            content: '';
            position: absolute;
            bottom: -1px;
            left: 0;
            right: 0;
            height: 2px;
            background-color: var(--color-primary);
            border-radius: 20px;
          }
          .grades-table {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            overflow: hidden;
          }
          .lab-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .lab-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 20px;
            display: grid;
            grid-template-columns: 1fr auto;
            align-items: center;
            gap: 20px;
            transition: border-color var(--transition-fast);
          }
          .lab-card:hover {
            border-color: var(--color-primary);
          }
          .lab-info h4 {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 6px;
          }
          .lab-info p {
            font-size: 13px;
            color: var(--text-secondary);
            margin-bottom: 12px;
            line-height: 1.4;
          }
          .lab-metadata {
            display: flex;
            gap: 16px;
            font-size: 12px;
            color: var(--text-muted);
          }
          .lab-metadata span {
            display: flex;
            align-items: center;
            gap: 4px;
          }
          .status-indicator {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 8px;
          }
          .status-badge-submission {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
          }
          .status-submitted {
            background: rgba(16, 185, 129, 0.1);
            color: var(--color-success);
            border: 1px solid rgba(16, 185, 129, 0.2);
          }
          .status-missing {
            background: rgba(239, 68, 68, 0.1);
            color: var(--color-danger);
            border: 1px solid rgba(239, 68, 68, 0.2);
          }
          .status-graded {
            background: rgba(14, 165, 233, 0.1);
            color: var(--color-secondary);
            border: 1px solid rgba(14, 165, 233, 0.2);
          }
          .submission-grade {
            font-size: 18px;
            font-weight: 700;
            color: var(--color-success);
          }
        `}</style>

        {loading ? (
          <div>Загрузка информации о предмете...</div>
        ) : error || !subject ? (
          <div className="error-banner" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", padding: 16, borderRadius: 8, color: "#fca5a5" }}>{error || "Предмет не найден"}</div>
        ) : (
          <>
            <div className="subject-details-header glass-panel">
              <div className="title-area">
                <h1>{subject.name}</h1>
                <p>Преподаватель: <b>{subject.teacher_name}</b></p>
              </div>
              <div className="stats-badge-large">
                <Award size={24} style={{ color: "var(--color-primary)" }} />
                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Средний балл</div>
                  <div style={{ fontSize: "20px", fontWeight: 700 }}>{average}</div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="tab-group">
              <button
                className={`tab-btn ${activeTab === "grades" ? "active" : ""}`}
                onClick={() => setActiveTab("grades")}
              >
                Посещаемость и оценки
              </button>
              <button
                className={`tab-btn ${activeTab === "labs" ? "active" : ""}`}
                onClick={() => setActiveTab("labs")}
              >
                Лабораторные работы ({labs.length})
              </button>
            </div>

            {/* Tab 1: Grades */}
            {activeTab === "grades" && (
              <div className="grades-table animate-fade-in">
                <table className="gradebook-table">
                  <thead>
                    <tr>
                      <th>Дата</th>
                      <th>Тема занятия</th>
                      <th style={{ width: "100px", textAlign: "center" }}>Оценка</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lessons.length > 0 ? (
                      lessons.map((lesson) => {
                        const grade = getLessonGrade(lesson.id);
                        return (
                          <tr key={lesson.id}>
                            <td style={{ fontWeight: 500 }}>
                              {lesson.date.split("-").reverse().join(".")}
                            </td>
                            <td>{lesson.title || "Без темы"}</td>
                            <td style={{ textAlign: "center" }}>
                              {grade ? (
                                <span className={`grade-badge grade-${grade}`}>{grade}</span>
                              ) : (
                                <span style={{ color: "var(--text-muted)" }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={3} style={{ textAlign: "center", color: "var(--text-muted)", padding: 24 }}>
                          Занятий по этому предмету пока не проводилось.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 2: Labs */}
            {activeTab === "labs" && (
              <div className="lab-list animate-fade-in">
                {labs.length > 0 ? (
                  labs.map((lab) => {
                    const submission = getLabSubmission(lab.id);
                    const isSubmitted = !!submission;
                    const isGraded = submission && submission.grade !== null;

                    let statusClass = "status-missing";
                    let statusText = "Не сдано";
                    let statusIcon = <AlertCircle size={14} />;

                    if (isGraded) {
                      statusClass = "status-graded";
                      statusText = `Оценено: ${submission.grade}/${lab.max_grade}`;
                      statusIcon = <CheckCircle size={14} />;
                    } else if (isSubmitted) {
                      statusClass = "status-submitted";
                      statusText = "На проверке";
                      statusIcon = <Clock size={14} />;
                    }

                    return (
                      <div key={lab.id} className="lab-card glass-panel">
                        <div className="lab-info">
                          <h4>{lab.title}</h4>
                          <p>{lab.description}</p>
                          <div className="lab-metadata">
                            <span>
                              <Calendar size={14} />
                              <span>Дедлайн: {lab.deadline.split("-").reverse().join(".")}</span>
                            </span>
                            <span>
                              <Award size={14} />
                              <span>Макс. балл: {lab.max_grade}</span>
                            </span>
                            {lab.is_team ? (
                              <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>Командная работа</span>
                            ) : null}
                          </div>
                        </div>
                        <div className="status-indicator">
                          <span className={`status-badge-submission ${statusClass}`}>
                            {statusIcon}
                            <span>{statusText}</span>
                          </span>
                          {isGraded && (
                            <div className="submission-grade">Оценка: {submission.grade}</div>
                          )}
                          <Link
                            to={`/student/lab/${lab.id}`}
                            className="submit-btn"
                            style={{
                              padding: "6px 16px",
                              fontSize: "12px",
                              textDecoration: "none",
                              display: "inline-block",
                              width: "auto",
                              textAlign: "center"
                            }}
                          >
                            {isSubmitted ? "Посмотреть решение" : "Сдать работу"}
                          </Link>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="glass-panel" style={{ textAlign: "center", color: "var(--text-muted)", padding: 32 }}>
                    <FileText size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
                    <p>Преподаватель еще не добавил лабораторных работ по этому предмету.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default StudentSubject;
