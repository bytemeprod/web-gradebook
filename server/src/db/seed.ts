import Database from "better-sqlite3";
import bcrypt from "bcrypt";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, "../../database.db");

async function seed() {
  console.log("Seeding database at:", DB_PATH);
  const db = new Database(DB_PATH);

  // Enable foreign keys
  db.pragma("foreign_keys = ON");

  // Drop tables if they exist
  db.exec(`
    DROP TABLE IF EXISTS lab_submissions;
    DROP TABLE IF EXISTS labs;
    DROP TABLE IF EXISTS grades;
    DROP TABLE IF EXISTS lessons;
    DROP TABLE IF EXISTS schedule;
    DROP TABLE IF EXISTS subjects;
    DROP TABLE IF EXISTS students_groups;
    DROP TABLE IF EXISTS groups;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS lesson_timings;
  `);

  // Create tables
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'teacher')),
      is_new INTEGER DEFAULT 0 CHECK(is_new IN (0, 1)),
      is_expelled INTEGER DEFAULT 0 CHECK(is_expelled IN (0, 1))
    );

    CREATE TABLE groups (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE students_groups (
      student_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      PRIMARY KEY (student_id, group_id),
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE schedule (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 1 AND 7),
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      room TEXT NOT NULL,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE lessons (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      date TEXT NOT NULL, -- YYYY-MM-DD
      title TEXT,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE grades (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      lesson_id TEXT NOT NULL,
      grade TEXT NOT NULL, -- e.g., '10', 'Н' (absent), 'О' (late)
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
      UNIQUE(student_id, lesson_id)
    );

    CREATE TABLE labs (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      deadline TEXT NOT NULL, -- YYYY-MM-DD
      max_grade INTEGER DEFAULT 10,
      is_team INTEGER DEFAULT 0 CHECK(is_team IN (0, 1)),
      file_path TEXT,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE lab_submissions (
      id TEXT PRIMARY KEY,
      lab_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      notes TEXT,
      grade INTEGER,
      comment TEXT,
      submission_date TEXT NOT NULL,
      team_members TEXT, -- JSON array of student IDs if team lab
      FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE lesson_timings (
      lesson_number INTEGER PRIMARY KEY,
      start_time TEXT NOT NULL, -- HH:MM
      end_time TEXT NOT NULL    -- HH:MM
    );
  `);

  const saltRounds = 10;
  const teacherHash = await bcrypt.hash("password", saltRounds);
  const studentHash = await bcrypt.hash("password", saltRounds);

  // Insert Users
  const teacherId = uuidv4();
  const student1Id = uuidv4();
  const student2Id = uuidv4();
  const student3Id = uuidv4();
  const student4Id = uuidv4();

  const insertUser = db.prepare(`
    INSERT INTO users (id, username, password, name, role, is_new, is_expelled)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(teacherId, "teacher1", teacherHash, "Иван Иванович Иванов", "teacher", 0, 0);
  insertUser.run(student1Id, "student1", studentHash, "Петр Петров", "student", 0, 0);
  insertUser.run(student2Id, "student2", studentHash, "Анна Сидорова (Новая)", "student", 1, 0);
  insertUser.run(student3Id, "student3", studentHash, "Сергей Смирнов (Отчислен)", "student", 0, 1);
  insertUser.run(student4Id, "student4", studentHash, "Мария Федорова", "student", 0, 0);

  // Insert Groups
  const group1Id = uuidv4(); // 951001
  const group2Id = uuidv4(); // 951002

  const insertGroup = db.prepare("INSERT INTO groups (id, name) VALUES (?, ?)");
  insertGroup.run(group1Id, "951001");
  insertGroup.run(group2Id, "951002");

  // Link Students to Groups
  const insertStudentGroup = db.prepare("INSERT INTO students_groups (student_id, group_id) VALUES (?, ?)");
  insertStudentGroup.run(student1Id, group1Id);
  insertStudentGroup.run(student2Id, group1Id);
  insertStudentGroup.run(student3Id, group1Id);
  insertStudentGroup.run(student4Id, group2Id);

  // Insert Subjects
  const subject1Id = uuidv4(); // Веб-технологии
  const subject2Id = uuidv4(); // Математический анализ

  const insertSubject = db.prepare("INSERT INTO subjects (id, name, teacher_id) VALUES (?, ?, ?)");
  insertSubject.run(subject1Id, "Веб-технологии", teacherId);
  insertSubject.run(subject2Id, "Математический анализ", teacherId);

  // Insert Lesson Timings
  const insertTiming = db.prepare("INSERT INTO lesson_timings (lesson_number, start_time, end_time) VALUES (?, ?, ?)");
  insertTiming.run(1, "08:30", "10:00");
  insertTiming.run(2, "10:15", "11:45");
  insertTiming.run(3, "12:00", "13:30");
  insertTiming.run(4, "14:00", "15:30");
  insertTiming.run(5, "15:45", "17:15");

  // Insert Schedule
  const insertSchedule = db.prepare(`
    INSERT INTO schedule (id, group_id, subject_id, day_of_week, start_time, end_time, room)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Monday, Lesson 1: Веб-технологии for 951001 in 405
  insertSchedule.run(uuidv4(), group1Id, subject1Id, 1, "08:30", "10:00", "405");
  // Monday, Lesson 2: Математический анализ for 951001 in 302
  insertSchedule.run(uuidv4(), group1Id, subject2Id, 1, "10:15", "11:45", "302");
  // Tuesday, Lesson 3: Веб-технологии for 951002 in 405
  insertSchedule.run(uuidv4(), group2Id, subject1Id, 2, "12:00", "13:30", "405");
  // Wednesday, Lesson 1: Веб-технологии for 951001 in 405
  insertSchedule.run(uuidv4(), group1Id, subject1Id, 3, "08:30", "10:00", "405");

  // Insert Lessons (already passed days)
  const lesson1Id = uuidv4();
  const lesson2Id = uuidv4();
  const insertLesson = db.prepare("INSERT INTO lessons (id, group_id, subject_id, date, title) VALUES (?, ?, ?, ?, ?)");
  insertLesson.run(lesson1Id, group1Id, subject1Id, "2026-06-15", "Введение в HTML/CSS");
  insertLesson.run(lesson2Id, group1Id, subject1Id, "2026-06-17", "Селекторы и Flexbox");

  // Insert Grades for lessons
  const insertGrade = db.prepare("INSERT INTO grades (id, student_id, lesson_id, grade) VALUES (?, ?, ?, ?)");
  // Student 1 got 9 and 8
  insertGrade.run(uuidv4(), student1Id, lesson1Id, "9");
  insertGrade.run(uuidv4(), student1Id, lesson2Id, "8");
  // Student 2 was absent on lesson 1, and late on lesson 2
  insertGrade.run(uuidv4(), student2Id, lesson1Id, "Н");
  insertGrade.run(uuidv4(), student2Id, lesson2Id, "О");

  // Insert Labs
  const lab1Id = uuidv4();
  const lab2Id = uuidv4();
  const insertLab = db.prepare(`
    INSERT INTO labs (id, subject_id, title, description, deadline, max_grade, is_team, file_path)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertLab.run(
    lab1Id,
    subject1Id,
    "Лабораторная работа №1: Разметка веб-страниц",
    "Необходимо сверстать адаптивный макет профиля пользователя, используя семантический HTML и чистый CSS.",
    "2026-06-22",
    10,
    0,
    ""
  );
  insertLab.run(
    lab2Id,
    subject1Id,
    "Лабораторная работа №2: Интерактивное React-приложение (Командная)",
    "Разработать Single Page Application (SPA) с использованием React и стейт-менеджера. Работа выполняется в командах по 2 человека.",
    "2026-06-30",
    10,
    1,
    ""
  );

  console.log("Database seeded successfully!");
  db.close();
}

seed().catch(err => {
  console.error("Failed to seed database:", err);
});
