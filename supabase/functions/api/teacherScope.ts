import { HttpError, type Db, type Profile } from "./http.ts";

export function isTeacher(user: Profile): boolean {
  return user.role === "teacher";
}

export async function assertTeacherOwnsClassSubject(db: Db, user: Profile, classSubjectId: string) {
  if (!isTeacher(user)) return;
  const rows = await db.unsafe("SELECT 1 FROM class_subjects WHERE id=$1 AND teacher_id=$2", [classSubjectId, user.userId]);
  if (rows.length === 0) throw new HttpError(403, "Vous ne pouvez agir que sur vos propres matières.");
}

export async function assertTeacherOwnsGradeItem(db: Db, user: Profile, gradeItemId: string) {
  if (!isTeacher(user)) return;
  const rows = await db.unsafe(
    `SELECT 1 FROM grade_items gi
     JOIN class_subjects cs ON cs.id = gi.class_subject_id
     WHERE gi.id=$1 AND cs.teacher_id=$2`,
    [gradeItemId, user.userId],
  );
  if (rows.length === 0) throw new HttpError(403, "Vous ne pouvez agir que sur vos propres évaluations.");
}

export async function assertTeacherOwnsSession(db: Db, user: Profile, sessionId: string) {
  if (!isTeacher(user)) return;
  const rows = await db.unsafe(
    `SELECT 1 FROM attendance_sessions s
     JOIN class_subjects cs ON cs.id = s.class_subject_id
     WHERE s.id=$1 AND cs.teacher_id=$2`,
    [sessionId, user.userId],
  );
  if (rows.length === 0) throw new HttpError(403, "Vous ne pouvez agir que sur vos propres appels.");
}

export async function assertTeacherCanSeeStudent(db: Db, user: Profile, studentId: string) {
  if (!isTeacher(user)) return;
  const rows = await db.unsafe(
    `SELECT 1 FROM students s
     WHERE s.id=$1 AND s.class_id IN (
       SELECT cs.class_id FROM class_subjects cs WHERE cs.teacher_id=$2
     )`,
    [studentId, user.userId],
  );
  if (rows.length === 0) throw new HttpError(404, "Élève introuvable");
}
