import { Router, Response } from "express";
import db from "../db/db.ts";
import { authMiddleware, AuthenticatedRequest, requireRole } from "../middleware/auth.ts";
import { v4 as uuidv4 } from "uuid";
import { saveBase64File } from "../utils/uploader.ts";

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

// POST /api/teacher/gradebook/lesson
router.post("/gradebook/lesson", (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { groupId, subjectId, date, title } = req.body;

    if (!groupId || !subjectId || !date) {
      res.status(400).json({ error: "groupId, subjectId, and date are required." });
      return;
    }

    const lessonId = uuidv4();

    db.prepare(`
      INSERT INTO lessons (id, group_id, subject_id, date, title)
      VALUES (?, ?, ?, ?, ?)
    `).run(lessonId, groupId, subjectId, date, title || null);

    res.status(201).json({
      message: "Lesson created successfully.",
      lesson: {
        id: lessonId,
        group_id: groupId,
        subject_id: subjectId,
        date,
        title: title || null
      }
    });
  } catch (error) {
    console.error("Error creating lesson:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/teacher/subject/:subjectId/labs
router.get("/subject/:subjectId/labs", (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { subjectId } = req.params;

    const labs = db.prepare(`
      SELECT * FROM labs
      WHERE subject_id = ?
      ORDER BY deadline ASC
    `).all(subjectId);

    res.json({ labs });
  } catch (error) {
    console.error("Error fetching subject labs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/teacher/subject/:subjectId/labs
router.post("/subject/:subjectId/labs", (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { subjectId } = req.params;
    const { title, description, deadline, maxGrade, isTeam, fileData, fileName } = req.body;

    if (!title || !description || !deadline) {
      res.status(400).json({ error: "Title, description, and deadline are required." });
      return;
    }

    let publicFilePath: string | null = null;

    if (fileData && fileName) {
      try {
        const uploadResult = saveBase64File(fileData, `lab-tk-${subjectId}`, fileName);
        publicFilePath = uploadResult.publicUrl;
      } catch (err: any) {
        res.status(400).json({ error: err.message || "Invalid base64 file data." });
        return;
      }
    }

    const labId = uuidv4();
    const isTeamInt = isTeam ? 1 : 0;

    db.prepare(`
      INSERT INTO labs (id, subject_id, title, description, deadline, max_grade, is_team, file_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(labId, subjectId, title, description, deadline, maxGrade || 10, isTeamInt, publicFilePath);

    res.status(201).json({
      message: "Lab created successfully.",
      lab: {
        id: labId,
        subject_id: subjectId,
        title,
        description,
        deadline,
        max_grade: maxGrade || 10,
        is_team: isTeamInt,
        file_path: publicFilePath
      }
    });
  } catch (error) {
    console.error("Error creating subject lab:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/teacher/labs/:labId
router.delete("/labs/:labId", (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { labId } = req.params;
    db.prepare("DELETE FROM labs WHERE id = ?").run(labId);
    res.json({ message: "Lab deleted successfully." });
  } catch (error) {
    console.error("Error deleting lab:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/teacher/submissions
router.get("/submissions", (req: AuthenticatedRequest, res: Response): void => {
  try {
    const teacherId = req.user?.id;

    const submissions = db.prepare(`
      SELECT ls.id, ls.lab_id, ls.student_id, ls.file_path, ls.notes, ls.grade, ls.comment, ls.submission_date, ls.team_members,
             l.title as lab_title, l.max_grade as lab_max_grade, l.is_team as lab_is_team,
             u.name as student_name, sub.name as subject_name
      FROM lab_submissions ls
      JOIN labs l ON ls.lab_id = l.id
      JOIN subjects sub ON l.subject_id = sub.id
      JOIN users u ON ls.student_id = u.id
      WHERE sub.teacher_id = ?
      ORDER BY ls.grade IS NULL DESC, ls.submission_date DESC
    `).all(teacherId);

    const students = db.prepare(`
      SELECT id, name FROM users WHERE role = 'student'
    `).all();

    res.json({ submissions, students });
  } catch (error) {
    console.error("Error fetching teacher submissions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/teacher/submissions/:submissionId/grade
router.post("/submissions/:submissionId/grade", (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { submissionId } = req.params;
    const { grade, comment, partnerId } = req.body;

    if (grade === undefined || grade === null) {
      res.status(400).json({ error: "Grade is required." });
      return;
    }

    const teamMembers = partnerId ? JSON.stringify([partnerId]) : null;

    db.prepare(`
      UPDATE lab_submissions
      SET grade = ?, comment = ?, team_members = ?
      WHERE id = ?
    `).run(Number(grade), comment || null, teamMembers, submissionId);

    res.json({ message: "Submission graded successfully." });
  } catch (error) {
    console.error("Error grading submission:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/teacher/submissions/:submissionId/comments
router.get("/submissions/:submissionId/comments", (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { submissionId } = req.params;

    const comments = db.prepare(`
      SELECT c.id, c.content, c.created_at, c.author_id, u.name as author_name, u.role as author_role
      FROM comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.submission_id = ?
      ORDER BY c.created_at ASC
    `).all(submissionId);

    res.json({ comments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/teacher/submissions/:submissionId/comments
router.post("/submissions/:submissionId/comments", (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { submissionId } = req.params;
    const { content } = req.body;
    const authorId = req.user?.id;

    if (!content) {
      res.status(400).json({ error: "Content is required." });
      return;
    }

    const commentId = uuidv4();

    db.prepare(`
      INSERT INTO comments (id, submission_id, author_id, content)
      VALUES (?, ?, ?, ?)
    `).run(commentId, submissionId, authorId, content);

    const userRow = db.prepare("SELECT name FROM users WHERE id = ?").get(authorId) as { name: string } | undefined;
    const authorName = userRow?.name || "Преподаватель";

    const newComment = {
      id: commentId,
      content,
      created_at: new Date().toISOString(),
      author_id: authorId,
      author_name: authorName,
      author_role: "teacher"
    };

    res.status(201).json({ message: "Comment added successfully.", comment: newComment });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
