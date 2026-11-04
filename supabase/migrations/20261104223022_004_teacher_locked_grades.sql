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
