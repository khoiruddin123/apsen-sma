-- =====================================================================
-- Sistem Absensi SMA (APSEN SMA) - MySQL Schema
-- Database: apsensd
-- =====================================================================

CREATE TABLE IF NOT EXISTS classes (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  grade VARCHAR(10) NOT NULL, -- 'X', 'XI', 'XII'
  major VARCHAR(50) NOT NULL DEFAULT 'IPA', -- 'IPA', 'IPS', 'Bahasa'
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('admin', 'guru', 'wali_kelas') NOT NULL DEFAULT 'guru',
  class_id VARCHAR(36) NULL, -- Untuk role 'wali_kelas', mereferensikan kelas bimbingannya
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS students (
  id VARCHAR(36) PRIMARY KEY,
  nisn VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  class_id VARCHAR(36) NOT NULL,
  gender ENUM('L', 'P') NOT NULL DEFAULT 'L',
  password VARCHAR(255) NOT NULL DEFAULT '123456', -- Password login murid
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT
);

CREATE INDEX idx_students_class ON students(class_id);
CREATE INDEX idx_students_nisn ON students(nisn);

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id VARCHAR(36) PRIMARY KEY,
  subject_name VARCHAR(255) NOT NULL, -- Contoh: 'Matematika', 'Fisika', 'Bahasa Indonesia'
  class_id VARCHAR(36) NOT NULL,
  teacher_id VARCHAR(36) NULL,
  teacher_name VARCHAR(255) NOT NULL,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NULL,
  qr_token VARCHAR(100) NOT NULL UNIQUE, -- Token QR Code unik untuk di-scan murid
  status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_sessions_date ON attendance_sessions(session_date);
CREATE INDEX idx_sessions_class ON attendance_sessions(class_id);

CREATE TABLE IF NOT EXISTS attendance_records (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  student_id VARCHAR(36) NOT NULL,
  status ENUM('hadir', 'sakit', 'izin', 'alpa') NOT NULL DEFAULT 'alpa',
  scanned_at DATETIME NULL,
  source ENUM('qr_scan_siswa', 'manual_guru') NOT NULL DEFAULT 'qr_scan_siswa',
  notes VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE (session_id, student_id),
  FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE INDEX idx_attendance_session ON attendance_records(session_id);
CREATE INDEX idx_attendance_student ON attendance_records(student_id);

-- =====================================================================
-- SEED DATA AWAL (Kelas, Users/Guru/Wali Kelas, & Siswa Sample)
-- =====================================================================

-- 1. Data Kelas SMA
INSERT IGNORE INTO classes (id, name, grade, major, sort_order) VALUES
('cls-x-ipa1', 'X IPA 1', 'X', 'IPA', 1),
('cls-x-ips1', 'X IPS 1', 'X', 'IPS', 2),
('cls-xi-ipa1', 'XI IPA 1', 'XI', 'IPA', 3),
('cls-xi-ips1', 'XI IPS 1', 'XI', 'IPS', 4),
('cls-xii-mipa1', 'XII MIPA 1', 'XII', 'IPA', 5),
('cls-xii-ips1', 'XII IPS 1', 'XII', 'IPS', 6);

-- 2. Data Akun Guru & Wali Kelas (Default password: admin/guru/walikelas)
INSERT IGNORE INTO users (id, username, password, name, role, class_id) VALUES
('usr-admin', 'admin', 'admin', 'Administrator Kurikulum', 'admin', NULL),
('usr-guru1', 'guru', 'guru', 'Budi Santoso, S.Pd (Guru Mapel)', 'guru', NULL),
('usr-wali1', 'walikelas', 'walikelas', 'Dra. Siti Rahma (Wali Kelas XI IPA 1)', 'wali_kelas', 'cls-xi-ipa1');

-- 3. Data Siswa Sample Kelas XI IPA 1 (Dapat login dengan NISN & pass default 123456)
INSERT IGNORE INTO students (id, nisn, name, class_id, gender, password) VALUES
('std-001', '1001', 'Ahmad Rizky Pratama', 'cls-xi-ipa1', 'L', '123456'),
('std-002', '1002', 'Anisa Nur Syafiqah', 'cls-xi-ipa1', 'P', '123456'),
('std-003', '1003', 'Bagas Dwi Cahyono', 'cls-xi-ipa1', 'L', '123456'),
('std-004', '1004', 'Citra Kirana Dewi', 'cls-xi-ipa1', 'P', '123456'),
('std-005', '1005', 'Dimas Anggara Putra', 'cls-xi-ipa1', 'L', '123456');
