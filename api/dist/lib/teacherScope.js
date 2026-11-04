export function isTeacher(user) {
    return user.role === "teacher";
}
export async function assertTeacherOwnsClassSubject(client, user, classSubjectId) {
    if (!isTeacher(user))
        return;
    const { rows } = await client.query("SELECT 1 FROM class_subjects WHERE id=$1 AND teacher_id=$2", [classSubjectId, user.userId]);
    if (rows.length === 0) {
        throw { statusCode: 403, message: "Vous ne pouvez agir que sur vos propres matières." };
    }
}
export async function assertTeacherOwnsGradeItem(client, user, gradeItemId) {
    if (!isTeacher(user))
        return;
    const { rows } = await client.query(`SELECT 1 FROM grade_items gi
     JOIN class_subjects cs ON cs.id = gi.class_subject_id
     WHERE gi.id=$1 AND cs.teacher_id=$2`, [gradeItemId, user.userId]);
    if (rows.length === 0) {
        throw { statusCode: 403, message: "Vous ne pouvez agir que sur vos propres évaluations." };
    }
}
export async function assertTeacherOwnsSession(client, user, sessionId) {
    if (!isTeacher(user))
        return;
    const { rows } = await client.query(`SELECT 1 FROM attendance_sessions s
     JOIN class_subjects cs ON cs.id = s.class_subject_id
     WHERE s.id=$1 AND cs.teacher_id=$2`, [sessionId, user.userId]);
    if (rows.length === 0) {
        throw { statusCode: 403, message: "Vous ne pouvez agir que sur vos propres appels." };
    }
}
export async function assertTeacherCanSeeStudent(client, user, studentId) {
    if (!isTeacher(user))
        return;
    const { rows } = await client.query(`SELECT 1 FROM students s
     WHERE s.id=$1 AND s.class_id IN (
       SELECT cs.class_id FROM class_subjects cs WHERE cs.teacher_id=$2
     )`, [studentId, user.userId]);
    if (rows.length === 0) {
        throw { statusCode: 404, message: "Élève introuvable" };
    }
}
//# sourceMappingURL=teacherScope.js.map