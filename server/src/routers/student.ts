import { Router, Response } from "express";
import db from "../db/db.ts";
import { authMiddleware, AuthenticatedRequest, requireRole } from "../middleware/auth.ts";

const router = Router();

// Apply auth middlewares to all student routes
router.use(authMiddleware);
router.use(requireRole(["student"]));

// Helper to get student's group ID
function getStudentGroupId(studentId: string): string | null {
  const row = db.prepare("SELECT group_id FROM students_groups WHERE student_id = ?").get(studentId) as any;
  return row ? row.group_id : null;
}

// GET /api/student/schedule
router.get("/schedule", (req: AuthenticatedRequest, res: Response): void => {
  try {
    const studentId = req.user?.id;
    const groupId = getStudentGroupId(studentId!);

    if (!groupId) {
      res.status(404).json({ error: "Student group not found." });
      return;
    }

    const schedule = db.prepare(`
      SELECT s.id, s.day_of_week, s.start_time, s.end_time, s.room,
             sub.name as subject_name, sub.id as subject_id,
             u.name as teacher_name
      FROM schedule s
      JOIN subjects sub ON s.subject_id = sub.id
      JOIN users u ON sub.teacher_id = u.id
      WHERE s.group_id = ?
      ORDER BY s.day_of_week, s.start_time
    `).all(groupId);

    res.json({ schedule });
  } catch (error) {
    console.error("Error fetching student schedule:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/student/gradebook
router.get("/gradebook", (req: AuthenticatedRequest, res: Response): void => {
  try {
    const studentId = req.user?.id;
    const groupId = getStudentGroupId(studentId!);

    if (!groupId) {
      res.status(404).json({ error: "Student group not found." });
      return;
    }

    // Get all subjects taught in this group's schedule
    const subjects = db.prepare(`
      SELECT DISTINCT sub.id, sub.name, u.name as teacher_name
      FROM subjects sub
      JOIN schedule s ON s.subject_id = sub.id
      JOIN users u ON sub.teacher_id = u.id
      WHERE s.group_id = ?
    `).all(groupId);

    // Get all lessons for this group
    const lessons = db.prepare(`
      SELECT l.id, l.date, l.title, l.subject_id, sub.name as subject_name
      FROM lessons l
      JOIN subjects sub ON l.subject_id = sub.id
      WHERE l.group_id = ?
      ORDER BY l.date ASC
    `).all(groupId);

    // Get all grades for this student
    const grades = db.prepare(`
      SELECT g.id, g.lesson_id, g.grade, g.created_at, l.subject_id
      FROM grades g
      JOIN lessons l ON g.lesson_id = l.id
      WHERE g.student_id = ?
    `).all(studentId);

    res.json({
      subjects,
      lessons,
      grades,
    });
  } catch (error) {
    console.error("Error fetching student gradebook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/student/subject/:subjectId
router.get("/subject/:subjectId", (req: AuthenticatedRequest, res: Response): void => {
  try {
    const studentId = req.user?.id;
    const { subjectId } = req.params;
    const groupId = getStudentGroupId(studentId!);

    if (!groupId) {
      res.status(404).json({ error: "Student group not found." });
      return;
    }

    const subject = db.prepare(`
      SELECT s.id, s.name, u.name as teacher_name
      FROM subjects s
      JOIN users u ON s.teacher_id = u.id
      WHERE s.id = ?
    `).get(subjectId) as any;

    if (!subject) {
      res.status(404).json({ error: "Subject not found." });
      return;
    }

    // Get lessons for this subject in the student's group
    const lessons = db.prepare(`
      SELECT id, date, title
      FROM lessons
      WHERE group_id = ? AND subject_id = ?
      ORDER BY date ASC
    `).all(groupId, subjectId);

    // Get grades for these lessons
    const lessonIds = lessons.map((l: any) => l.id);
    let grades: any[] = [];
    if (lessonIds.length > 0) {
      const placeholders = lessonIds.map(() => "?").join(",");
      grades = db.prepare(`
        SELECT id, lesson_id, grade
        FROM grades
        WHERE student_id = ? AND lesson_id IN (${placeholders})
      `).all(studentId, ...lessonIds);
    }

    // Get labs for this subject
    const labs = db.prepare(`
      SELECT id, title, description, deadline, max_grade, is_team, file_path
      FROM labs
      WHERE subject_id = ?
      ORDER BY deadline ASC
    `).all(subjectId);

    // Get lab submissions for this student
    const labIds = labs.map((l: any) => l.id);
    let submissions: any[] = [];
    if (labIds.length > 0) {
      const placeholders = labIds.map(() => "?").join(",");
      submissions = db.prepare(`
        SELECT id, lab_id, file_path, notes, grade, comment, submission_date, team_members
        FROM lab_submissions
        WHERE student_id = ? AND lab_id IN (${placeholders})
      `).all(studentId, ...labIds);
    }

    res.json({
      subject,
      lessons,
      grades,
      labs,
      submissions,
    });
  } catch (error) {
    console.error("Error fetching student subject details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
