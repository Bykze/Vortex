-- ============================================================
-- Migration 004: Teachers cannot change grades sent to administration
-- ============================================================
--
-- 1. Why this migration exists
--    Once a teacher sends an evaluation's grades to the administration, the
--    evaluation is locked (period_closed = true). The API already refuses
--    changes to locked grades, but this migration adds the same rule inside
--    the database so that a teacher session cannot bypass it.
--
-- 2. Changes
--    - grades: a teacher cannot insert or update a grade whose evaluation is locked.
--    - grade_items: a teacher cannot edit a locked evaluation or reopen it.
--    - Only direction and super_admin can reopen a locked evaluation (level-2 authorization).
--
-- 3. Security notes
--    - The rule depends on the session role set per request (app.role).
--    - Other roles keep their existing behaviour.
--
-- 4. Idempotency
--    Every statement can be re-run safely.

CREATE OR REPLACE FUNCTION block_teacher_edit_locked_grade()
RETURNS trigger AS $$
DECLARE
  v_closed boolean;
BEGIN
  IF current_app_role() = 'teacher' THEN
    SELECT period_closed INTO v_closed FROM grade_items WHERE id = NEW.grade_item_id;
    IF v_closed THEN
      RAISE EXCEPTION 'Grades sent to administration cannot be modified by a teacher';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_teacher_locked_grade ON grades;
CREATE TRIGGER trg_block_teacher_locked_grade BEFORE INSERT OR UPDATE ON grades
  FOR EACH ROW EXECUTE FUNCTION block_teacher_edit_locked_grade();

CREATE OR REPLACE FUNCTION block_teacher_edit_locked_item()
RETURNS trigger AS $$
BEGIN
  IF current_app_role() = 'teacher' AND OLD.period_closed THEN
    RAISE EXCEPTION 'Locked evaluations can only be reopened by direction';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_teacher_locked_item ON grade_items;
CREATE TRIGGER trg_block_teacher_locked_item BEFORE UPDATE ON grade_items
  FOR EACH ROW EXECUTE FUNCTION block_teacher_edit_locked_item();
