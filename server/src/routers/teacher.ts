import { Router, Response } from "express";
import db from "../db/db.ts";
import { authMiddleware, AuthenticatedRequest, requireRole } from "../middleware/auth.ts";

const router = Router();

// Apply auth middlewares to all teacher routes
router.use(authMiddleware);
router.use(requireRole(["teacher"]));

// GET /api/teacher/schedule
router.get("/schedule", (req: AuthenticatedRequest, res: Response): void => {
  try {
    const teacherId = req.user?.id;

    // Join schedule with subjects and groups where teacher is the owner
    const schedule = db.prepare(`
      SELECT s.id, s.day_of_week, s.start_time, s.end_time, s.room,
             sub.name as subject_name, sub.id as subject_id,
             g.name as group_name, g.id as group_id
      FROM schedule s
      JOIN subjects sub ON s.subject_id = sub.id
      JOIN groups g ON s.group_id = g.id
      WHERE sub.teacher_id = ?
      ORDER BY s.day_of_week, s.start_time
    `).all(teacherId);

    res.json({ schedule });
  } catch (error) {
    console.error("Error fetching teacher schedule:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/teacher/groups
router.get("/groups", (req: AuthenticatedRequest, res: Response): void => {
  try {
    const teacherId = req.user?.id;

    // Get groups taught by the teacher
    const groups = db.prepare(`
      SELECT DISTINCT g.id, g.name
      FROM groups g
      JOIN schedule s ON s.group_id = g.id
      JOIN subjects sub ON s.subject_id = sub.id
      WHERE sub.teacher_id = ?
    `).all(teacherId);

    res.json({ groups });
  } catch (error) {
    console.error("Error fetching teacher groups:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/teacher/subjects
router.get("/subjects", (req: AuthenticatedRequest, res: Response): void => {
  try {
    const teacherId = req.user?.id;

    const subjects = db.prepare(`
      SELECT id, name
      FROM subjects
      WHERE teacher_id = ?
    `).all(teacherId);

    res.json({ subjects });
  } catch (error) {
    console.error("Error fetching teacher subjects:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/teacher/gradebook
router.get("/gradebook", (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { groupId, subjectId } = req.query;

    if (!groupId || !subjectId) {
      res.status(400).json({ error: "groupId and subjectId are required parameters." });
      return;
    }

    // 1. Fetch all students in group
    const students = db.prepare(`
      SELECT u.id, u.name, u.username, u.is_new, u.is_expelled
      FROM users u
      JOIN students_groups sg ON u.id = sg.student_id
      WHERE sg.group_id = ?
      ORDER BY u.is_expelled ASC, u.name ASC
    `).all(groupId);

    // 2. Fetch all lessons for group + subject
    const lessons = db.prepare(`
      SELECT id, date, title
      FROM lessons
      WHERE group_id = ? AND subject_id = ?
      ORDER BY date ASC
    `).all(groupId, subjectId);

    // 3. Fetch all grades for these lessons
    const lessonIds = lessons.map((l: any) => l.id);
    let grades: any[] = [];
    if (lessonIds.length > 0) {
      const placeholders = lessonIds.map(() => "?").join(",");
      grades = db.prepare(`
        SELECT id, student_id, lesson_id, grade, created_at
        FROM grades
        WHERE lesson_id IN (${placeholders})
      `).all(...lessonIds);
    }

    res.json({
      students,
      lessons,
      grades,
    });
  } catch (error) {
    console.error("Error fetching teacher gradebook data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
