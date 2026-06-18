import React, { useEffect, useState } from "react";
import Layout from "../../components/Layout.tsx";
import { api } from "../../api/client.ts";
import { Calendar, FileText, Download, CheckCircle, AlertCircle, MessageSquare } from "lucide-react";
import { useAuth } from "../../context/AuthContext.tsx";

interface Submitter {
  id: string;
  name: string;
}

const TeacherSubmissions: React.FC = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [students, setStudents] = useState<Submitter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Grading modal state
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [gradeValue, setGradeValue] = useState("");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [submittingGrade, setSubmittingGrade] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState("");

  const fetchComments = async (subId: string) => {
    try {
      const data = await api.get(`/api/teacher/submissions/${subId}/comments`);
      setComments(data.comments || []);
    } catch (e) {
      console.error("Failed to load comments", e);
    }
  };

  useEffect(() => {
    if (!selectedSubmission) {
      setComments([]);
      return;
    }
    fetchComments(selectedSubmission.id);
    const interval = setInterval(() => {
      fetchComments(selectedSubmission.id);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedSubmission?.id]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedSubmission) return;
    try {
      const data = await api.post(`/api/teacher/submissions/${selectedSubmission.id}/comments`, {
        content: newCommentText
      });
      setComments((prev) => [...prev, data.comment]);
      setNewCommentText("");
    } catch (err) {
      console.error("Failed to post comment", err);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const data = await api.get("/api/teacher/submissions");
      setSubmissions(data.submissions || []);
      setStudents(data.students || []);
    } catch (err: any) {
      console.error("Failed to load submissions:", err);
      setError(err.message || "Ошибка при загрузке сданных работ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleOpenGradingModal = (sub: any) => {
    setSelectedSubmission(sub);
    setGradeValue(sub.grade !== null && sub.grade !== undefined ? String(sub.grade) : "");
    setFeedbackComment(sub.comment || "");
    
    if (sub.team_members) {
      try {
        const ids = JSON.parse(sub.team_members);
        if (Array.isArray(ids) && ids.length > 0) {
          setSelectedPartnerId(ids[0]);
        } else {
          setSelectedPartnerId("");
        }
      } catch (e) {
        setSelectedPartnerId("");
      }
    } else {
      setSelectedPartnerId("");
    }
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    const parsedGrade = parseFloat(gradeValue);
    if (isNaN(parsedGrade) || parsedGrade < 0 || parsedGrade > selectedSubmission.lab_max_grade) {
      alert(`Пожалуйста, введите корректную оценку от 0 до ${selectedSubmission.lab_max_grade}`);
      return;
    }

    setSubmittingGrade(true);
    try {
      const nextTeamMembers = selectedPartnerId ? JSON.stringify([selectedPartnerId]) : null;

      await api.post(`/api/teacher/submissions/${selectedSubmission.id}/grade`, {
        grade: parsedGrade,
        comment: feedbackComment,
        partnerId: selectedPartnerId || null
      });

      // Update locally
      setSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === selectedSubmission.id
            ? { ...sub, grade: parsedGrade, comment: feedbackComment, team_members: nextTeamMembers }
            : sub
        )
      );

      setSelectedSubmission(null);
    } catch (err: any) {
      console.error("Failed to submit grade:", err);
      alert(err.message || "Ошибка при сохранении оценки.");
    } finally {
      setSubmittingGrade(false);
    }
  };

  const getTeammateName = (teamMembersJson: string | null) => {
    if (!teamMembersJson) return null;
    try {
      const ids = JSON.parse(teamMembersJson);
      if (Array.isArray(ids) && ids.length > 0) {
        const partner = students.find((s) => s.id === ids[0]);
        return partner ? partner.name : null;
      }
    } catch (e) {
      console.error("Failed to parse team members JSON:", e);
    }
    return null;
  };

  return (
    <Layout>
      <div className="teacher-submissions">
        <style>{`
          .submissions-header {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 28px;
            margin-bottom: 24px;
          }
          .submissions-header h1 {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 6px;
          }
          .submissions-header p {
            font-size: 14px;
            color: var(--text-muted);
          }
          .submissions-list-container {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 24px;
            overflow: hidden;
          }
          .submissions-table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
          }
          .submissions-table th {
            padding: 16px;
            font-weight: 600;
            font-size: 13px;
            color: var(--text-secondary);
            border-bottom: 2px solid var(--border-color);
            white-space: nowrap;
          }
          .submissions-table td {
            padding: 14px 16px;
            border-bottom: 1px solid var(--border-color);
            font-size: 14px;
          }
          .status-tag {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
          }
          .status-graded {
            background: rgba(16, 185, 129, 0.1);
            color: var(--color-success);
            border: 1px solid rgba(16, 185, 129, 0.2);
          }
          .status-pending {
            background: rgba(245, 158, 11, 0.1);
            color: var(--color-warning);
            border: 1px solid rgba(245, 158, 11, 0.2);
          }
          .grade-badge-large {
            font-weight: 700;
            color: var(--color-success);
          }
          .action-link-btn {
            background: transparent;
            border: none;
            color: var(--color-primary);
            font-weight: 600;
            cursor: pointer;
            font-size: 13px;
            text-decoration: underline;
            padding: 0;
          }
          .action-link-btn:hover {
            color: var(--color-primary-hover);
          }
        `}</style>

        <div className="submissions-header glass-panel">
          <h1>Сданные работы студентов</h1>
          <p>Проверка решений, выставление оценок и отзывов по лабораторным работам.</p>
        </div>

        {loading ? (
          <div>Загрузка списка решений...</div>
        ) : error ? (
          <div className="error-banner" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", padding: 16, borderRadius: 8, color: "#fca5a5" }}>{error}</div>
        ) : (
          <div className="submissions-list-container glass-panel">
            {submissions.length > 0 ? (
              <div className="table-responsive" style={{ overflowX: "auto" }}>
                <table className="submissions-table">
                  <thead>
                    <tr>
                      <th>Задание / Предмет</th>
                      <th>Студент / Команда</th>
                      <th>Дата сдачи</th>
                      <th>Заметка студента</th>
                      <th>Статус</th>
                      <th>Оценка</th>
                      <th>Действие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => {
                      const partnerName = getTeammateName(sub.team_members);
                      const isGraded = sub.grade !== null && sub.grade !== undefined;

                      return (
                        <tr key={sub.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{sub.lab_title}</div>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{sub.subject_name}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 500 }}>{sub.student_name}</div>
                            {partnerName && (
                              <div style={{ fontSize: "11px", color: "var(--color-primary)", marginTop: "2px", fontWeight: "600" }}>
                                В паре с: {partnerName}
                              </div>
                            )}
                          </td>
                          <td style={{ color: "var(--text-secondary)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <Calendar size={14} />
                              <span>{sub.submission_date.split("-").reverse().join(".")}</span>
                            </div>
                          </td>
                          <td style={{ color: "var(--text-muted)", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={sub.notes || ""}>
                            {sub.notes || "—"}
                          </td>
                          <td>
                            {isGraded ? (
                              <span className="status-tag status-graded">
                                <CheckCircle size={12} />
                                <span>Проверено</span>
                              </span>
                            ) : (
                              <span className="status-tag status-pending">
                                <AlertCircle size={12} />
                                <span>Ожидает проверки</span>
                              </span>
                            )}
                          </td>
                          <td>
                            {isGraded ? (
                              <span className="grade-badge-large">
                                {sub.grade} / {sub.lab_max_grade}
                              </span>
                            ) : (
                              <span style={{ color: "var(--text-muted)" }}>—</span>
                            )}
                          </td>
                          <td>
                            <button
                              onClick={() => handleOpenGradingModal(sub)}
                              className="action-link-btn"
                            >
                              {isGraded ? "Изменить оценку" : "Оценить решение"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 0" }}>
                <FileText size={40} style={{ marginBottom: "12px", opacity: 0.5 }} />
                <p>Решений от студентов пока не поступало.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grading Modal */}
      {selectedSubmission && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
          <div className="glass-panel" style={{ width: "550px", maxHeight: "90vh", overflowY: "auto", padding: "24px", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "6px" }}>Проверка решения</h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px" }}>
              Работа: <b>{selectedSubmission.lab_title}</b> ({selectedSubmission.subject_name})<br />
              Студент: <b>{selectedSubmission.student_name}</b>
              {getTeammateName(selectedSubmission.team_members) && (
                <> в паре с <b>{getTeammateName(selectedSubmission.team_members)}</b></>
              )}
            </p>

            <div style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", padding: "14px", borderRadius: "var(--radius-sm)", marginBottom: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>Файл решения:</span>
                <button
                  type="button"
                  onClick={() => window.open(selectedSubmission.file_path, "_blank")}
                  style={{ display: "flex", alignItems: "center", gap: "4px", background: "transparent", border: "none", color: "var(--color-primary)", cursor: "pointer", fontWeight: "700", fontSize: "13px" }}
                >
                  <Download size={14} />
                  <span>Скачать файл</span>
                </button>
              </div>
              <div style={{ fontSize: "13px", color: "var(--text-muted)", fontStyle: "italic", borderTop: "1px solid var(--border-color)", paddingTop: "8px", marginTop: "8px" }}>
                <b>Заметка студента:</b> {selectedSubmission.notes || "нет комментария"}
              </div>
            </div>

            <form onSubmit={handleGradeSubmit}>
              {selectedSubmission.lab_is_team === 1 && (
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "var(--text-secondary)" }}>
                    Напарник (командная работа)
                  </label>
                  <select
                    className="form-input"
                    value={selectedPartnerId}
                    onChange={(e) => setSelectedPartnerId(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
                  >
                    <option value="">Выберите напарника...</option>
                    {students
                      .filter((s) => s.id !== selectedSubmission.student_id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "var(--text-secondary)" }}>
                  Оценка за работу (макс. {selectedSubmission.lab_max_grade} б.)
                </label>
                <input
                  type="number"
                  min="0"
                  max={selectedSubmission.lab_max_grade}
                  step="0.5"
                  className="form-input"
                  placeholder={`Оценка (0 - ${selectedSubmission.lab_max_grade})`}
                  value={gradeValue}
                  onChange={(e) => setGradeValue(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)", fontWeight: "bold" }}
                  required
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "var(--text-secondary)" }}>
                  Отзыв преподавателя / Замечания
                </label>
                <textarea
                  className="form-textarea"
                  placeholder="Оставьте комментарий или рекомендации по доработке..."
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  style={{ width: "100%", height: "100px", padding: "10px", borderRadius: "var(--radius-sm)", background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)", fontSize: "13px", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="submit"
                  disabled={submittingGrade}
                  style={{ flex: 1, padding: "10px", borderRadius: "var(--radius-sm)", border: "none", background: "var(--color-primary)", color: "white", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}
                >
                  {submittingGrade ? "Сохранение..." : "Сохранить оценку"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSubmission(null)}
                  disabled={submittingGrade}
                  style={{ flex: 1, padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-primary)", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}
                >
                  Отмена
                </button>
              </div>
            </form>

            {/* Chat Section */}
            <div style={{ marginTop: "24px", borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: "600", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <MessageSquare size={16} />
                <span>Обсуждение работы ({comments.length})</span>
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "180px", overflowY: "auto", marginBottom: "12px", padding: "10px", background: "var(--bg-primary)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                {comments.length > 0 ? (
                  comments.map((c) => {
                    const isMe = c.author_id === user?.id;
                    return (
                      <div key={c.id} style={{ 
                        alignSelf: isMe ? "flex-end" : "flex-start",
                        background: isMe ? "rgba(99, 102, 241, 0.15)" : "var(--bg-secondary)",
                        border: isMe ? "1px solid rgba(99, 102, 241, 0.25)" : "1px solid var(--border-color)",
                        padding: "6px 10px",
                        borderRadius: "12px",
                        maxWidth: "85%",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px"
                      }}>
                        <div style={{ fontSize: "10px", fontWeight: "700", color: isMe ? "var(--color-primary)" : "var(--text-secondary)" }}>
                          {c.author_name} {c.author_role === "student" ? "(Студент)" : ""}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-primary)", wordBreak: "break-word" }}>
                          {c.content}
                        </div>
                        <div style={{ fontSize: "9px", color: "var(--text-muted)", alignSelf: "flex-end" }}>
                          {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "15px 0", fontSize: "12px" }}>
                    Напишите первый комментарий студенту для обсуждения решения.
                  </div>
                )}
              </div>

              <form onSubmit={handleAddComment} style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  placeholder="Напишите сообщение..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  style={{ flex: 1, padding: "8px 12px", borderRadius: "var(--radius-sm)", background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)", fontSize: "12px" }}
                />
                <button
                  type="submit"
                  className="submit-btn"
                  style={{ width: "auto", margin: 0, padding: "0 16px", fontSize: "12px" }}
                >
                  Отправить
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default TeacherSubmissions;
