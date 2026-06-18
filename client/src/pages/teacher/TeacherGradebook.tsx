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
                        <th key={lesson.id} style={{ width: "70px", textAlign: "center", cursor: "pointer" }} title={lesson.title || "Урок"}>
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
                                className={`grade-grid-cell ${valClass}`}
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
    </Layout>
  );
};

export default TeacherGradebook;
