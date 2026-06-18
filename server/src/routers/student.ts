import { Router, Response } from "express";
import db from "../db/db.ts";
import { authMiddleware, AuthenticatedRequest, requireRole } from "../middleware/auth.ts";
import { v4 as uuidv4 } from "uuid";
import { saveBase64File } from "../utils/uploader.ts";

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
        WHERE lab_id IN (${placeholders}) AND (student_id = ? OR team_members LIKE ?)
      `).all(...labIds, studentId, `%"${studentId}"%`);
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

// GET /api/student/lab/:labId
router.get("/lab/:labId", (req: AuthenticatedRequest, res: Response): void => {
  try {
    const studentId = req.user?.id;
    const { labId } = req.params;
    const groupId = getStudentGroupId(studentId!);

    if (!groupId) {
      res.status(404).json({ error: "Student group not found." });
      return;
    }

    const lab = db.prepare(`
      SELECT l.id, l.subject_id, l.title, l.description, l.deadline, l.max_grade, l.is_team, l.file_path,
             s.name as subject_name
      FROM labs l
      JOIN subjects s ON l.subject_id = s.id
      WHERE l.id = ?
    `).get(labId) as any;

    if (!lab) {
      res.status(404).json({ error: "Lab not found." });
      return;
    }

    // Fetch this student's submission for this lab
    const submission = db.prepare(`
      SELECT ls.id, ls.file_path, ls.notes, ls.grade, ls.comment, ls.submission_date, ls.team_members, ls.student_id,
             u.name as submitter_name
      FROM lab_submissions ls
      JOIN users u ON ls.student_id = u.id
      WHERE ls.lab_id = ? AND (ls.student_id = ? OR ls.team_members LIKE ?)
    `).get(labId, studentId, `%"${studentId}"%`) as any;

    // Fetch classmates in case of team lab
    let classmates: any[] = [];
    if (lab.is_team === 1) {
      classmates = db.prepare(`
        SELECT u.id, u.name
        FROM users u
        JOIN students_groups sg ON u.id = sg.student_id
        WHERE sg.group_id = ? AND u.id != ? AND u.is_expelled = 0
        ORDER BY u.name ASC
      `).all(groupId, studentId);
    }

    res.json({
      lab,
      submission: submission || null,
      classmates,
    });
  } catch (error) {
    console.error("Error fetching lab details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/student/lab/:labId/submit
router.post("/lab/:labId/submit", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.id;
    const { labId } = req.params;
    const { fileData, fileName, notes, partnerId } = req.body;

    if (!fileData || !fileName) {
      res.status(400).json({ error: "File data and file name are required." });
      return;
    }

    const lab = db.prepare("SELECT * FROM labs WHERE id = ?").get(labId) as any;
    if (!lab) {
      res.status(404).json({ error: "Lab not found." });
      return;
    }

    let publicFilePath: string;
    try {
      const uploadResult = saveBase64File(fileData, `${labId}-${studentId}`, fileName);
      publicFilePath = uploadResult.publicUrl;
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Invalid base64 file data." });
      return;
    }

    // Team members JSON representation
    const teamMembers = lab.is_team === 1 && partnerId ? JSON.stringify([partnerId]) : null;

    // Check if submission already exists (either as submitter or teammate)
    const existingSubmission = db.prepare(`
      SELECT id FROM lab_submissions 
      WHERE lab_id = ? AND (student_id = ? OR team_members LIKE ?)
    `).get(labId, studentId, `%"${studentId}"%`) as any;

    const submissionDate = new Date().toISOString().split("T")[0];

    if (existingSubmission) {
      db.prepare(`
        UPDATE lab_submissions
        SET file_path = ?, notes = ?, grade = NULL, comment = NULL, submission_date = ?, team_members = ?
        WHERE id = ?
      `).run(publicFilePath, notes || null, submissionDate, teamMembers, existingSubmission.id);
    } else {
      db.prepare(`
        INSERT INTO lab_submissions (id, lab_id, student_id, file_path, notes, grade, comment, submission_date, team_members)
        VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?)
      `).run(uuidv4(), labId, studentId, publicFilePath, notes || null, submissionDate, teamMembers);
    }

    res.json({ message: "Solution submitted successfully!", filePath: publicFilePath });
  } catch (error) {
    console.error("Error submitting solution:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
