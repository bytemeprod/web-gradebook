export interface User {
  id: string;
  username: string;
  name: string;
  role: "student" | "teacher";
  is_new: boolean;
  is_expelled: boolean;
}

export interface Group {
  id: string;
  name: string;
}

export interface Subject {
  id: string;
  name: string;
  teacher_id?: string;
  teacher_name?: string;
}

export interface ScheduleEntry {
  id: string;
  day_of_week: number; // 1-7
  start_time: string;  // HH:MM
  end_time: string;    // HH:MM
  room: string;
  subject_name: string;
  subject_id: string;
  group_name?: string;
  group_id?: string;
  teacher_name?: string;
}

export interface Lesson {
  id: string;
  date: string;       // YYYY-MM-DD
  title: string | null;
  subject_id: string;
  subject_name?: string;
}

export interface Grade {
  id: string;
  student_id: string;
  lesson_id: string;
  grade: string;      // e.g. "9", "Н", "О"
  created_at?: string;
  subject_id?: string;
}

export interface Lab {
  id: string;
  subject_id: string;
  title: string;
  description: string;
  deadline: string;   // YYYY-MM-DD
  max_grade: number;
  is_team: boolean;
  file_path: string | null;
}

export interface LabSubmission {
  id: string;
  lab_id: string;
  student_id: string;
  file_path: string;
  notes: string | null;
  grade: number | null;
  comment: string | null;
  submission_date: string;
  team_members: string | null; // JSON string array of user IDs
}
