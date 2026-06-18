import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "../../components/Layout.tsx";
import { api } from "../../api/client.ts";
import type { Lab, LabSubmission } from "../../types/index.ts";
import { Calendar, Award, Clock, FileText, CheckCircle, ArrowLeft, Users, Download, MessageSquare } from "lucide-react";
import { useAuth } from "../../context/AuthContext.tsx";

interface Classmate {
  id: string;
  name: string;
}

const StudentLab: React.FC = () => {
  const { user } = useAuth();
  const { labId } = useParams<{ labId: string }>();
  const [lab, setLab] = useState<Lab | null>(null);
  const [submission, setSubmission] = useState<LabSubmission | null>(null);
  const [classmates, setClassmates] = useState<Classmate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [notes, setNotes] = useState("");
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    setUploadSuccess(false);

    if (!file) {
      setUploadError("Пожалуйста, выберите файл для отправки.");
      return;
    }

    setSubmitting(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          await api.post(`/api/student/lab/${labId}/submit`, {
            fileData: base64Data,
            fileName: file.name,
            notes,
            partnerId: selectedPartnerId || null
          });
          setUploadSuccess(true);
          // Refresh details
          const data = await api.get(`/api/student/lab/${labId}`);
          setSubmission(data.submission);
        } catch (err: any) {
          console.error("Upload failed inside reader:", err);
          setUploadError(err.message || "Ошибка при отправке файла.");
        } finally {
          setSubmitting(false);
        }
      };
      reader.onerror = () => {
        setUploadError("Ошибка при чтении файла.");
        setSubmitting(false);
      };
    } catch (err: any) {
      console.error("Submit execution failed:", err);
      setUploadError(err.message || "Ошибка при отправке.");
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchLabDetails = async () => {
      try {
        const data = await api.get(`/api/student/lab/${labId}`);
        setLab(data.lab);
        setSubmission(data.submission);
        setClassmates(data.classmates || []);
        if (data.submission) {
          setNotes(data.submission.notes || "");
          if (data.submission.team_members) {
            try {
              const partners = JSON.parse(data.submission.team_members);
              if (partners.length > 0) {
                setSelectedPartnerId(partners[0]);
              }
            } catch (e) {
              console.error("Failed to parse partner ID", e);
            }
          }
        }
      } catch (err: any) {
        console.error("Failed to load lab details:", err);
        setError(err.message || "Ошибка при загрузке деталей работы.");
      } finally {
        setLoading(false);
      }
    };

    fetchLabDetails();
  }, [labId]);

  const getTeammateName = () => {
    if (!submission || !submission.team_members) return null;
    try {
      const partners = JSON.parse(submission.team_members);
      if (partners.length > 0) {
        const partner = classmates.find(c => c.id === partners[0]);
        return partner ? partner.name : "Напарник";
      }
    } catch (e) {
      const partner = classmates.find(c => c.id === submission.team_members);
      return partner ? partner.name : "Напарник";
    }
    return null;
  };

  return (
    <Layout>
      <div className="student-lab">
        <style>{`
          .back-link {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            font-weight: 500;
            color: var(--text-muted);
            margin-bottom: 20px;
            transition: color var(--transition-fast);
          }
          .back-link:hover {
            color: var(--text-primary);
          }
          .lab-grid {
            display: grid;
            grid-template-columns: 1fr 340px;
            gap: 28px;
            align-items: start;
          }
          @media (max-width: 900px) {
            .lab-grid {
              grid-template-columns: 1fr;
            }
          }
          .lab-main-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 28px;
          }
          .lab-title-row {
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .lab-title-row h1 {
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 8px;
          }
          .lab-subject-tag {
            display: inline-block;
            background: rgba(99, 102, 241, 0.1);
            color: var(--color-primary);
            font-size: 12px;
            font-weight: 600;
            padding: 4px 10px;
            border-radius: 20px;
          }
          .lab-desc {
            font-size: 14px;
            line-height: 1.6;
            color: var(--text-secondary);
            margin-bottom: 24px;
          }
          .attachment-section {
            background: var(--bg-primary);
            border: 1px dashed var(--border-color);
            border-radius: var(--radius-sm);
            padding: 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
          }
          .attachment-info {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .download-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            padding: 6px 12px;
            border-radius: var(--radius-sm);
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: background var(--transition-fast);
          }
          .download-btn:hover {
            background: rgba(99, 102, 241, 0.05);
          }
          .submission-form-container {
            border-top: 1px solid var(--border-color);
            padding-top: 24px;
            margin-top: 24px;
          }
          .submission-form-container h3 {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 16px;
          }
          .form-textarea {
            width: 100%;
            height: 100px;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-sm);
            padding: 12px;
            color: var(--text-primary);
            font-size: 14px;
            resize: vertical;
            margin-bottom: 16px;
          }
          .form-textarea:focus {
            outline: none;
            border-color: var(--color-primary);
          }
          .lab-side-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 24px;
          }
          .side-stat-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid var(--border-color);
            font-size: 14px;
          }
          .side-stat-row:last-child {
            border-bottom: none;
          }
          .teacher-feedback {
            margin-top: 20px;
            background: rgba(16, 185, 129, 0.05);
            border: 1px solid rgba(16, 185, 129, 0.15);
            border-radius: var(--radius-sm);
            padding: 16px;
          }
          .feedback-header {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--color-success);
            font-weight: 600;
            font-size: 13px;
            margin-bottom: 8px;
          }
        `}</style>

        {loading ? (
          <div>Загрузка деталей лабораторной...</div>
        ) : error || !lab ? (
          <div className="error-banner" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", padding: 16, borderRadius: 8, color: "#fca5a5" }}>{error || "Работа не найдена"}</div>
        ) : (
          <>
            <Link to={`/student/subject/${lab.subject_id}`} className="back-link">
              <ArrowLeft size={16} />
              <span>Назад к предмету</span>
            </Link>

            <div className="lab-grid">
              <div className="lab-main-card glass-panel">
                <div className="lab-title-row">
                  <span className="lab-subject-tag">{lab.subject_name}</span>
                  <h1 style={{ marginTop: "12px" }}>{lab.title}</h1>
                </div>

                <div className="lab-desc">
                  <h3>Описание работы:</h3>
                  <p style={{ marginTop: "8px" }}>{lab.description}</p>
                </div>

                {lab.file_path && (
                  <div className="attachment-section">
                    <div className="attachment-info">
                      <FileText size={20} style={{ color: "var(--color-primary)" }} />
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 600 }}>Техническое задание (ТЗ)</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Материалы к работе</div>
                      </div>
                    </div>
                    <button className="download-btn" onClick={() => window.open(lab.file_path!)}>
                      <Download size={14} />
                      <span>Скачать</span>
                    </button>
                  </div>
                )}

                {/* Submissions Section (Core submission UI, placeholder upload form) */}
                <div className="submission-form-container">
                  <h3>Ваше решение</h3>

                  {submission && submission.grade !== null ? (
                    <div style={{ background: "var(--bg-primary)", padding: 16, borderRadius: 8, border: "1px solid var(--border-color)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--color-success)", fontWeight: 600, marginBottom: "8px" }}>
                        <CheckCircle size={16} />
                        <span>Работа проверена и оценена</span>
                      </div>
                      <div style={{ fontSize: "14px", marginBottom: "8px" }}>
                        <b>Файл решения:</b> <a href={submission.file_path} target="_blank" rel="noreferrer" style={{ color: "var(--color-primary)", textDecoration: "underline" }}>Открыть файл</a>
                      </div>
                      {submission.student_id !== user?.id ? (
                        <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                          <b>Отправлено напарником:</b> {submission.submitter_name || getTeammateName()}
                        </div>
                      ) : getTeammateName() ? (
                        <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                          <b>Напарник:</b> {getTeammateName()}
                        </div>
                      ) : null}
                      {submission.notes && (
                        <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                          <b>Заметка:</b> {submission.notes}
                        </div>
                      )}
                    </div>
                  ) : submission ? (
                    <div style={{ background: "var(--bg-primary)", padding: 16, borderRadius: 8, border: "1px solid var(--border-color)", marginBottom: "20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--color-warning)", fontWeight: 600, marginBottom: "8px" }}>
                        <Clock size={16} />
                        <span>Решение на проверке у преподавателя</span>
                      </div>
                      <div style={{ fontSize: "14px", marginBottom: "8px" }}>
                        <b>Файл решения:</b> <a href={submission.file_path} target="_blank" rel="noreferrer" style={{ color: "var(--color-primary)", textDecoration: "underline" }}>Открыть файл</a>
                      </div>
                      {submission.student_id !== user?.id ? (
                        <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                          <b>Отправлено напарником:</b> {submission.submitter_name || getTeammateName()}
                        </div>
                      ) : getTeammateName() ? (
                        <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                          <b>Напарник:</b> {getTeammateName()}
                        </div>
                      ) : null}
                      {submission.notes && (
                        <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                          <b>Заметка:</b> {submission.notes}
                        </div>
                      )}
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "12px" }}>
                        Вы можете отправить новое решение (старое будет перезаписано).
                      </div>
                    </div>
                  ) : null}

                  {/* Upload form */}
                  {(!submission || submission.grade === null) && (
                    <form onSubmit={handleFormSubmit} style={{ marginTop: "16px" }}>
                      {uploadError && (
                        <div className="error-banner" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", padding: 12, borderRadius: 6, color: "#fca5a5", marginBottom: 16, fontSize: "13px" }}>
                          {uploadError}
                        </div>
                      )}
                      {uploadSuccess && (
                        <div className="success-banner" style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", padding: 12, borderRadius: 6, color: "#a7f3d0", marginBottom: 16, fontSize: "13px" }}>
                          Решение успешно отправлено!
                        </div>
                      )}

                      {!!lab.is_team && (
                        <div style={{ marginBottom: "16px" }}>
                          <label className="form-label" style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}>
                            Выбор напарника (Командная работа)
                          </label>
                          <select 
                            className="form-input" 
                            style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
                            value={selectedPartnerId}
                            onChange={(e) => setSelectedPartnerId(e.target.value)}
                            disabled={submitting}
                          >
                            <option value="">Выберите напарника...</option>
                            {classmates.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                      )}

                      <div style={{ marginBottom: "16px" }}>
                        <label className="form-label" style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}>
                          Заметка к решению
                        </label>
                        <textarea
                          className="form-textarea"
                          placeholder="Напишите комментарий для преподавателя..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          disabled={submitting}
                        />
                      </div>

                      <div style={{ marginBottom: "20px" }}>
                        <label className="form-label" style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}>
                          Файл решения (ZIP, PDF, DOCX, JS...)
                        </label>
                        <input
                          type="file"
                          style={{ fontSize: "14px" }}
                          onChange={handleFileChange}
                          disabled={submitting}
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="submit-btn"
                        style={{ width: "auto", padding: "10px 24px" }}
                        disabled={submitting}
                      >
                        {submitting ? "Отправка..." : "Отправить решение"}
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* Side Cards: Metadata & Teacher Comments */}
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div className="lab-side-card glass-panel">
                  <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "16px" }}>Информация о сдаче</h3>
                  
                  <div className="side-stat-row">
                    <span style={{ color: "var(--text-muted)" }}>Срок сдачи:</span>
                    <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                      <Calendar size={14} />
                      {lab.deadline.split("-").reverse().join(".")}
                    </span>
                  </div>

                  <div className="side-stat-row">
                    <span style={{ color: "var(--text-muted)" }}>Максимальная оценка:</span>
                    <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                      <Award size={14} />
                      {lab.max_grade} баллов
                    </span>
                  </div>

                  <div className="side-stat-row">
                    <span style={{ color: "var(--text-muted)" }}>Тип работы:</span>
                    <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                      <Users size={14} />
                      {lab.is_team ? "Командная" : "Индивидуальная"}
                    </span>
                  </div>
                </div>

                {submission && submission.comment && (
                  <div className="teacher-feedback glass-panel">
                    <div className="feedback-header">
                      <MessageSquare size={16} />
                      <span>Отзыв преподавателя</span>
                    </div>
                    <p style={{ fontSize: "13px", lineHeight: "1.5", color: "var(--text-secondary)" }}>
                      {submission.comment}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default StudentLab;
