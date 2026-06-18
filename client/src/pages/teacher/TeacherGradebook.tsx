import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Layout from "../../components/Layout.tsx";
import { api } from "../../api/client.ts";
import { Group, Subject, User as Student, Lesson, Grade } from "../../types/index.ts";
import { BookOpen, HelpCircle } from "lucide-react";

const TeacherGradebook: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  // Selected IDs from searchParams
  const selectedGroupId = searchParams.get("groupId") || "";
  const selectedSubjectId = searchParams.get("subjectId") || "";

  // Gradebook data
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [hoveredLessonId, setHoveredLessonId] = useState<string | null>(null);

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load teacher groups and subjects first
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const [groupsData, subsData] = await Promise.all([
          api.get("/api/teacher/groups"),
          api.get("/api/teacher/subjects")
        ]);
        setGroups(groupsData.groups || []);
        setSubjects(subsData.subjects || []);

        // Auto select first group/subject if none set
        let nextGroupId = selectedGroupId;
        let nextSubjectId = selectedSubjectId;

        if (groupsData.groups?.length > 0 && !selectedGroupId) {
          nextGroupId = groupsData.groups[0].id;
        }
        if (subsData.subjects?.length > 0 && !selectedSubjectId) {
          nextSubjectId = subsData.subjects[0].id;
        }

        if (nextGroupId !== selectedGroupId || nextSubjectId !== selectedSubjectId) {
          setSearchParams({ groupId: nextGroupId, subjectId: nextSubjectId });
        }
      } catch (err: any) {
        console.error("Failed to load configs:", err);
        setError(err.message || "Ошибка при инициализации журнала.");
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchConfig();
  }, []);

  // Fetch gradebook data when selections change
  useEffect(() => {
    if (!selectedGroupId || !selectedSubjectId) return;

    const fetchGradebookData = async () => {
      setLoadingData(true);
      try {
        const data = await api.get(`/api/teacher/gradebook?groupId=${selectedGroupId}&subjectId=${selectedSubjectId}`);
        setStudents(data.students || []);
        setLessons(data.lessons || []);
        setGrades(data.grades || []);
      } catch (err: any) {
        console.error("Failed to fetch gradebook data:", err);
        setError(err.message || "Ошибка при загрузке данных журнала.");
      } finally {
        setLoadingData(false);
      }
    };

    fetchGradebookData();
  }, [selectedGroupId, selectedSubjectId]);

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSearchParams({ groupId: e.target.value, subjectId: selectedSubjectId });
  };

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSearchParams({ groupId: selectedGroupId, subjectId: e.target.value });
  };

  // Helper to find a grade
  const getStudentGrade = (studentId: string, lessonId: string) => {
    const gradeObj = grades.find(g => g.student_id === studentId && g.lesson_id === lessonId);
    return gradeObj ? gradeObj.grade : "";
  };

  const [selectedCell, setSelectedCell] = useState<{
    studentId: string;
    lessonId: string;
    studentName: string;
    lessonDate: string;
    currentGrade: string;
  } | null>(null);
  const [inputValue, setInputValue] = useState("");

  const updateGrade = async (studentId: string, lessonId: string, value: string) => {
    try {
      await api.post("/api/teacher/gradebook/grade", {
        studentId,
        lessonId,
        grade: value
      });

      // Update local state
      setGrades((prev) => {
        const filtered = prev.filter(g => !(g.student_id === studentId && g.lesson_id === lessonId));
        if (value === "") return filtered;
        return [...filtered, { id: "temp", student_id: studentId, lesson_id: lessonId, grade: value }];
      });
      setSelectedCell(null);
    } catch (err: any) {
      console.error("Failed to update grade:", err);
      alert(err.message || "Ошибка при выставлении оценки.");
    }
  };

  const toggleAbsence = async (studentId: string, lessonId: string, currentValue: string) => {
    const nextValue = currentValue === "Н" ? "" : "Н";
    await updateGrade(studentId, lessonId, nextValue);
  };

  const toggleLateness = async (studentId: string, lessonId: string, currentValue: string) => {
    const nextValue = currentValue === "О" ? "" : "О";
    await updateGrade(studentId, lessonId, nextValue);
  };

  return (
    <Layout>
      <div className="teacher-gradebook">
        <style>{`
          .gradebook-toolbar {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            flex-wrap: wrap;
            margin-bottom: 24px;
          }
          .selector-group {
            display: flex;
            align-items: center;
            gap: 16px;
            flex-wrap: wrap;
          }
          .toolbar-select-label {
            font-size: 13px;
            font-weight: 600;
            color: var(--text-secondary);
          }
          .toolbar-select {
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-sm);
            padding: 8px 12px;
            font-size: 14px;
            color: var(--text-primary);
            cursor: pointer;
            transition: border-color var(--transition-fast);
          }
          .toolbar-select:focus {
            outline: none;
            border-color: var(--color-primary);
          }
          .gradebook-grid-container {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 24px;
            min-height: 250px;
            position: relative;
          }
          .grade-grid-cell {
            text-align: center;
            font-weight: 600;
            font-size: 14px;
            width: 70px;
            cursor: cell;
            transition: background var(--transition-fast);
          }
          .grade-grid-cell.excellent { color: var(--grade-excellent); }
          .grade-grid-cell.good { color: var(--grade-good); }
          .grade-grid-cell.satisfactory { color: var(--grade-satisfactory); }
          .grade-grid-cell.poor { color: var(--grade-poor); }
          .grade-grid-cell.absent { color: var(--grade-absent); font-weight: 700; }
          .grade-grid-cell.late { color: var(--grade-late); font-weight: 700; }
        `}</style>

        {/* Toolbar selectors */}
        <div className="gradebook-toolbar glass-panel">
          <div className="selector-group">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="toolbar-select-label">Группа:</span>
              <select className="toolbar-select" value={selectedGroupId} onChange={handleGroupChange} disabled={loadingConfig}>
                {groups.map(g => <option key={g.id} value={g.id}>Группа {g.name}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="toolbar-select-label">Предмет:</span>
              <select className="toolbar-select" value={selectedSubjectId} onChange={handleSubjectChange} disabled={loadingConfig}>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Gradebook Grid */}
        {error ? (
          <div className="error-banner" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", padding: 16, borderRadius: 8, color: "#fca5a5" }}>{error}</div>
        ) : loadingConfig || (loadingData && students.length === 0) ? (
          <div>Инициализация журнала...</div>
        ) : (
          <div className="gradebook-grid-container glass-panel">
            {students.length > 0 ? (
              <div className="gradebook-table-wrapper">
                <table className="gradebook-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: "220px" }}>ФИО Студента</th>
                      {lessons.map(lesson => (
                        <th 
                          key={lesson.id} 
                          style={{ width: "70px", textAlign: "center", cursor: "pointer", backgroundColor: hoveredLessonId === lesson.id ? "rgba(99, 102, 241, 0.04)" : "" }} 
                          title={lesson.title || "Урок"}
                          onMouseEnter={() => setHoveredLessonId(lesson.id)}
                          onMouseLeave={() => setHoveredLessonId(null)}
                        >
                          <div style={{ fontSize: "11px", fontWeight: "700" }}>
                            {lesson.date.split("-").slice(1).reverse().join(".")}
                          </div>
                          <div style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: "2px", fontWeight: "normal" }}>
                            {lesson.title ? (lesson.title.length > 10 ? lesson.title.substring(0, 8) + "..." : lesson.title) : "Урок"}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(student => {
                      const isExpelled = student.is_expelled === 1;
                      const isNew = student.is_new === 1;
                      let rowClass = "";
                      if (isExpelled) rowClass = "row-expelled";
                      else if (isNew) rowClass = "row-new";

                      return (
                        <tr key={student.id} className={rowClass}>
                          <td style={{ fontWeight: 500 }}>
                            {student.name}
                          </td>
                          {lessons.map(lesson => {
                            const val = getStudentGrade(student.id, lesson.id);
                            
                            // Style class based on score value
                            let valClass = "";
                            if (val === "Н") valClass = "absent";
                            else if (val === "О") valClass = "late";
                            else if (val) {
                              const numVal = parseFloat(val);
                              if (numVal >= 9) valClass = "excellent";
                              else if (numVal >= 7) valClass = "good";
                              else if (numVal >= 5) valClass = "satisfactory";
                              else valClass = "poor";
                            }

                            return (
                              <td 
                                key={lesson.id} 
                                className={`grade-grid-cell ${valClass} ${hoveredLessonId === lesson.id ? "highlight-col" : ""}`}
                                onMouseEnter={() => setHoveredLessonId(lesson.id)}
                                onMouseLeave={() => setHoveredLessonId(null)}
                                onClick={() => {
                                  if (isExpelled) return;
                                  setSelectedCell({
                                    studentId: student.id,
                                    lessonId: lesson.id,
                                    studentName: student.name,
                                    lessonDate: lesson.date,
                                    currentGrade: val
                                  });
                                  setInputValue(val === "Н" || val === "О" ? "" : val);
                                }}
                                onContextMenu={(e) => {
                                  if (isExpelled) return;
                                  e.preventDefault();
                                  toggleAbsence(student.id, lesson.id, val);
                                }}
                                onAuxClick={(e) => {
                                  if (isExpelled) return;
                                  if (e.button === 1) {
                                    e.preventDefault();
                                    toggleLateness(student.id, lesson.id, val);
                                  }
                                }}
                              >
                                {val || "—"}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 40 }}>
                <BookOpen size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
                <p>В выбранной группе нет зарегистрированных студентов.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grade Entry Modal */}
      {selectedCell && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.6)", z-index: 1000, display: "flex", alignItems: "center", justify-content: "center", backdropFilter: "blur(4px)" }}>
          <div className="glass-panel" style={{ width: "340px", padding: "24px", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "4px" }}>Выставить оценку</h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px" }}>
              Студент: <b>{selectedCell.studentName}</b><br/>
              Дата: {selectedCell.lessonDate.split("-").reverse().join(".")}
            </p>

            <form onSubmit={(e) => { e.preventDefault(); updateGrade(selectedCell.studentId, selectedCell.lessonId, inputValue); }}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px", color: "var(--text-secondary)" }}>
                  Оценка с клавиатуры (только числа 1-10)
                </label>
                <input
                  type="text"
                  placeholder="Оценка от 1 до 10"
                  value={inputValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || (/^\d+$/.test(val) && parseInt(val) >= 1 && parseInt(val) <= 10)) {
                      setInputValue(val);
                    }
                  }}
                  style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)", fontWeight: "bold", textAlign: "center", fontSize: "16px" }}
                  autoFocus
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", marginBottom: "16px" }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => { setInputValue(String(num)); updateGrade(selectedCell.studentId, selectedCell.lessonId, String(num)); }}
                    style={{ padding: "8px", fontSize: "13px", fontWeight: "bold", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-primary)", cursor: "pointer" }}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => updateGrade(selectedCell.studentId, selectedCell.lessonId, "")}
                  style={{ flex: 1, padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "rgba(239, 68, 68, 0.1)", color: "var(--color-danger)", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}
                >
                  Очистить
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCell(null)}
                  style={{ flex: 1, padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-primary)", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default TeacherGradebook;
