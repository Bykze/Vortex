import type pg from "pg";

export function isTeacher(user: { role: string }): boolean {
  return user.role === "teacher";
}

export async function assertTeacherOwnsClassSubject(
  client: pg.PoolClient,
  user: { role: string; userId: string },
  classSubjectId: string
): Promise<void> {
  if (!isTeacher(user)) return;
  const { rows } = await client.query(
    "SELECT 1 FROM class_subjects WHERE id=$1 AND teacher_id=$2",
    [classSubjectId, user.userId]
  );
  if (rows.length === 0) {
    throw { statusCode: 403, message: "Vous ne pouvez agir que sur vos propres matières." };
  }
}

export async function assertTeacherOwnsGradeItem(
  client: pg.PoolClient,
  user: { role: string; userId: string },
  gradeItemId: string
): Promise<void> {
  if (!isTeacher(user)) return;
  const { rows } = await client.query(
    `SELECT 1 FROM grade_items gi
     JOIN class_subjects cs ON cs.id = gi.class_subject_id
     WHERE gi.id=$1 AND cs.teacher_id=$2`,
    [gradeItemId, user.userId]
  );
  if (rows.length === 0) {
    throw { statusCode: 403, message: "Vous ne pouvez agir que sur vos propres évaluations." };
  }
}

export async function assertTeacherOwnsSession(
  client: pg.PoolClient,
  user: { role: string; userId: string },
  sessionId: string
): Promise<void> {
  if (!isTeacher(user)) return;
  const { rows } = await client.query(
    `SELECT 1 FROM attendance_sessions s
     JOIN class_subjects cs ON cs.id = s.class_subject_id
     WHERE s.id=$1 AND cs.teacher_id=$2`,
    [sessionId, user.userId]
  );
  if (rows.length === 0) {
    throw { statusCode: 403, message: "Vous ne pouvez agir que sur vos propres appels." };
  }
}

export async function assertTeacherCanSeeStudent(
  client: pg.PoolClient,
  user: { role: string; userId: string },
  studentId: string
): Promise<void> {
  if (!isTeacher(user)) return;
  const { rows } = await client.query(
    `SELECT 1 FROM students s
     WHERE s.id=$1 AND s.class_id IN (
       SELECT cs.class_id FROM class_subjects cs WHERE cs.teacher_id=$2
     )`,
    [studentId, user.userId]
  );
  if (rows.length === 0) {
    throw { statusCode: 404, message: "Élève introuvable" };
  }
}
