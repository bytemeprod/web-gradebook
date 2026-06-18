import { Router, Response } from "express";
import db from "../db/db.ts";
import { authMiddleware, AuthenticatedRequest, requireRole } from "../middleware/auth.ts";
import { v4 as uuidv4 } from "uuid";

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

// POST /api/teacher/gradebook/grade
router.post("/gradebook/grade", (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { studentId, lessonId, grade } = req.body;

    if (!studentId || !lessonId) {
      res.status(400).json({ error: "studentId and lessonId are required." });
      return;
    }

    if (grade === "" || grade === null || grade === undefined) {
      // Clear grade
      db.prepare("DELETE FROM grades WHERE student_id = ? AND lesson_id = ?").run(studentId, lessonId);
      res.json({ message: "Grade cleared successfully." });
    } else {
      // Upsert grade
      db.prepare(`
        INSERT INTO grades (id, student_id, lesson_id, grade)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(student_id, lesson_id)
        DO UPDATE SET grade = excluded.grade
      `).run(uuidv4(), studentId, lessonId, String(grade));
      res.json({ message: "Grade updated successfully." });
    }
  } catch (error) {
    console.error("Error updating grade:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/teacher/gradebook/check-lateness/:lessonId
router.get("/gradebook/check-lateness/:lessonId", (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { lessonId } = req.params;

    const lesson = db.prepare("SELECT * FROM lessons WHERE id = ?").get(lessonId) as any;
    if (!lesson) {
      res.status(404).json({ error: "Lesson not found." });
      return;
    }

    // Determine day of week for the lesson date (1 = Monday, 7 = Sunday)
    const dateObj = new Date(lesson.date);
    let dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday...
    if (dayOfWeek === 0) dayOfWeek = 7;

    const schedule = db.prepare(`
      SELECT start_time, end_time FROM schedule
      WHERE group_id = ? AND subject_id = ? AND day_of_week = ?
    `).get(lesson.group_id, lesson.subject_id, dayOfWeek) as any;

    if (!schedule) {
      res.json({ isToday: false, isLate: false, reason: "No schedule entry for this weekday." });
      return;
    }

    // Compare with current local time
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
    const currentDateStr = String(now.getDate()).padStart(2, "0");
    const todayStr = `${currentYear}-${currentMonth}-${currentDateStr}`;

    const isToday = lesson.date === todayStr;

    if (!isToday) {
      res.json({ isToday: false, isLate: false, reason: "Lesson date is not today." });
      return;
    }

    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;

    const [startH, startM] = schedule.start_time.split(":").map(Number);
    const startTotalMinutes = startH * 60 + startM;

    const [endH, endM] = schedule.end_time.split(":").map(Number);
    const endTotalMinutes = endH * 60 + endM;

    // A student is late if current time is 15 minutes or more after start_time,
    // and before end_time (meaning the lesson is active right now)
    const isLate = currentTotalMinutes >= startTotalMinutes + 15 && currentTotalMinutes <= endTotalMinutes;

    res.json({
      isToday: true,
      startTime: schedule.start_time,
      currentTime: `${String(currentHours).padStart(2, "0")}:${String(currentMinutes).padStart(2, "0")}`,
      isLate,
      reason: isLate ? "Student checked in 15+ minutes after class started." : "Student checked in on time."
    });
  } catch (error) {
    console.error("Error checking lateness:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
