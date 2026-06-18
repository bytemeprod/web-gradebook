import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "../../components/Layout.tsx";
import { api } from "../../api/client.ts";
import type { Lab, Subject } from "../../types/index.ts";
import { Calendar, Award, FileText, ArrowLeft, Users, Trash2 } from "lucide-react";

const TeacherProgram: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states for new lab
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState(new Date().toISOString().split("T")[0]);
  const [maxGrade, setMaxGrade] = useState("10");
  const [isTeam, setIsTeam] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchProgramData = async () => {
      try {
        const [subsData, labsData] = await Promise.all([
          api.get("/api/teacher/subjects"),
          api.get(`/api/teacher/subject/${subjectId}/labs`)
        ]);

        const currentSubject = (subsData.subjects || []).find((s: Subject) => s.id === subjectId);
        setSubject(currentSubject || null);
        setLabs(labsData.labs || []);
      } catch (err: any) {
        console.error("Failed to load program data:", err);
        setError(err.message || "Ошибка при загрузке учебной программы.");
      } finally {
        setLoading(false);
      }
    };

    fetchProgramData();
  }, [subjectId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleAddLab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !deadline) return;
    setSubmitting(true);
    
    try {
      let fileData: string | null = null;
      let fileName: string | null = null;

      if (file) {
        // Read file as base64
        const reader = new FileReader();
        reader.readAsDataURL(file);
        await new Promise<void>((resolve, reject) => {
          reader.onload = () => {
            fileData = reader.result as string;
            fileName = file.name;
            resolve();
          };
          reader.onerror = reject;
        });
      }

      const response = await api.post(`/api/teacher/subject/${subjectId}/labs`, {
        title,
        description,
        deadline,
        maxGrade: parseInt(maxGrade),
        isTeam,
        fileData,
        fileName
      });

      setLabs((prev) => [...prev, response.lab].sort((a, b) => a.deadline.localeCompare(b.deadline)));
      
      // Reset form
      setTitle("");
      setDescription("");
      setMaxGrade("10");
      setIsTeam(false);
      setFile(null);
      // Reset file input
      const fileInput = document.getElementById("lab-file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (err: any) {
      console.error("Failed to add lab:", err);
      alert(err.message || "Ошибка при добавлении лабораторной.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLab = async (labId: string) => {
    if (!window.confirm("Вы уверены, что хотите удалить эту лабораторную работу?")) return;
    try {
      await api.delete(`/api/teacher/labs/${labId}`);
      setLabs((prev) => prev.filter(l => l.id !== labId));
    } catch (err: any) {
      console.error("Failed to delete lab:", err);
      alert(err.message || "Ошибка при удалении лабораторной.");
    }
  };

  return (
    <Layout>
      <div className="teacher-program">
        <style>{`
          .back-link {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            font-weight: 500;
            color: var(--text-muted);
            margin-bottom: 20px;
            text-decoration: none;
            transition: color var(--transition-fast);
          }
          .back-link:hover {
            color: var(--text-primary);
          }
          .program-header {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 28px;
            margin-bottom: 24px;
          }
          .program-header h1 {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 6px;
          }
          .program-header p {
            font-size: 14px;
            color: var(--text-muted);
          }
          .program-grid {
            display: grid;
            grid-template-columns: 1fr 360px;
            gap: 28px;
            align-items: start;
          }
          @media (max-width: 900px) {
            .program-grid {
              grid-template-columns: 1fr;
            }
          }
          .labs-list-section {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 24px;
          }
          .lab-card {
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-sm);
            padding: 20px;
            margin-bottom: 16px;
            display: grid;
            grid-template-columns: 1fr auto;
            align-items: center;
            gap: 20px;
            transition: border-color var(--transition-fast);
          }
          .lab-card:hover {
            border-color: var(--color-primary);
          }
          .lab-card:last-child {
            margin-bottom: 0;
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
          .lab-actions {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .config-form-section {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 24px;
          }
          .form-title {
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 20px;
          }
          .form-group {
            margin-bottom: 16px;
          }
          .form-label {
            display: block;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 6px;
            color: var(--text-secondary);
          }
          .form-input {
            width: 100%;
            padding: 10px;
            border-radius: var(--radius-sm);
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            font-size: 14px;
          }
          .form-input:focus {
            outline: none;
            border-color: var(--color-primary);
          }
          .form-textarea {
            width: 100%;
            height: 100px;
            padding: 10px;
            border-radius: var(--radius-sm);
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            font-size: 14px;
            resize: vertical;
          }
          .form-textarea:focus {
            outline: none;
            border-color: var(--color-primary);
          }
          .delete-btn {
            background: transparent;
            border: none;
            color: var(--color-danger);
            cursor: pointer;
            padding: 8px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background var(--transition-fast);
          }
          .delete-btn:hover {
            background: rgba(239, 68, 68, 0.1);
          }
        `}</style>

        <Link to="/teacher" className="back-link">
          <ArrowLeft size={16} />
          <span>Назад к расписанию</span>
        </Link>

        {loading ? (
          <div>Загрузка учебной программы...</div>
        ) : error || !subject ? (
          <div className="error-banner" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", padding: 16, borderRadius: 8, color: "#fca5a5" }}>{error || "Предмет не найден"}</div>
        ) : (
          <>
            <div className="program-header glass-panel">
              <h1>Программа: {subject.name}</h1>
              <p>Управление практическими и лабораторными заданиями для групп.</p>
            </div>

            <div className="program-grid">
              {/* Labs List */}
              <div className="labs-list-section glass-panel">
                <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "20px" }}>Задания в программе ({labs.length})</h3>
                {labs.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {labs.map((lab) => (
                      <div key={lab.id} className="lab-card">
                        <div className="lab-info">
                          <h4>{lab.title}</h4>
                          <p>{lab.description}</p>
                          <div className="lab-metadata">
                            <span>
                              <Calendar size={14} />
                              <span>Срок: {lab.deadline.split("-").reverse().join(".")}</span>
                            </span>
                            <span>
                              <Award size={14} />
                              <span>Макс: {lab.max_grade} баллов</span>
                            </span>
                            {lab.is_team ? (
                              <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                                <Users size={14} style={{ marginRight: "4px", display: "inline" }} />
                                Командная
                              </span>
                            ) : null}
                            {lab.file_path && (
                              <span>
                                <FileText size={14} />
                                <a href={lab.file_path} target="_blank" rel="noreferrer" style={{ color: "var(--color-primary)", textDecoration: "underline" }}>Скачать ТЗ</a>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="lab-actions">
                          <button 
                            onClick={() => handleDeleteLab(lab.id)}
                            className="delete-btn" 
                            title="Удалить задание"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 0" }}>
                    <FileText size={40} style={{ marginBottom: "12px", opacity: 0.5 }} />
                    <p>В учебную программу этого предмета еще не добавлены задания.</p>
                  </div>
                )}
              </div>

              {/* Add Lab Form */}
              <div className="config-form-section glass-panel">
                <h3 className="form-title">Добавить задание</h3>
                
                <form onSubmit={handleAddLab}>
                  <div className="form-group">
                    <label className="form-label">Название задания</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Например, Лабораторная работа №1" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Описание и требования</label>
                    <textarea 
                      className="form-textarea" 
                      placeholder="Введите условия выполнения, полезные ссылки и требования..." 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Срок сдачи (Дедлайн)</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Максимальный балл</label>
                    <select 
                      className="form-input" 
                      value={maxGrade}
                      onChange={(e) => setMaxGrade(e.target.value)}
                    >
                      <option value="5">5 баллов</option>
                      <option value="10">10 баллов</option>
                      <option value="20">20 баллов</option>
                      <option value="100">100 баллов</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0" }}>
                    <input 
                      type="checkbox" 
                      id="is-team-checkbox"
                      checked={isTeam}
                      onChange={(e) => setIsTeam(e.target.checked)}
                      style={{ cursor: "pointer", width: "16px", height: "16px" }}
                    />
                    <label htmlFor="is-team-checkbox" className="form-label" style={{ margin: 0, cursor: "pointer" }}>
                      Командный проект (работа в парах)
                    </label>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Материалы к работе / Тех. задание (ТЗ)</label>
                    <input 
                      type="file" 
                      id="lab-file-input"
                      style={{ fontSize: "13px" }}
                      onChange={handleFileChange}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="submit-btn" 
                    style={{ width: "100%", padding: "10px", marginTop: "10px" }}
                    disabled={submitting}
                  >
                    {submitting ? "Создание..." : "Создать задание"}
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default TeacherProgram;
