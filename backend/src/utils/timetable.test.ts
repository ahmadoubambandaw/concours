import { describe, expect, it } from 'vitest';
import { findConflicts, overlaps } from './timetable';

const base = {
  dayOfWeek: 1,
  startTime: '08:00',
  endTime: '09:00',
  teacherId: 't1',
  classroomId: 'r1',
  classId: 'c1',
};

describe('overlaps', () => {
  it('détecte un chevauchement partiel', () => {
    expect(overlaps(base, { ...base, startTime: '08:30', endTime: '09:30' })).toBe(true);
  });

  it('ne signale pas des créneaux consécutifs', () => {
    expect(overlaps(base, { ...base, startTime: '09:00', endTime: '10:00' })).toBe(false);
  });

  it('ignore les jours différents', () => {
    expect(overlaps(base, { ...base, dayOfWeek: 2 })).toBe(false);
  });
});

describe('findConflicts', () => {
  it('détecte les conflits enseignant, salle et classe', () => {
    const conflicts = findConflicts(base, [
      { ...base, id: 'x', classId: 'c2', classroomId: 'r2' }, // même prof
      { ...base, id: 'y', teacherId: 't2', classId: 'c3' }, // même salle
      { ...base, id: 'z', teacherId: 't3', classroomId: 'r3' }, // même classe
    ]);
    expect(conflicts.map((c) => c.kind).sort()).toEqual(['CLASS', 'CLASSROOM', 'TEACHER']);
  });

  it('aucun conflit si tout est différent', () => {
    expect(
      findConflicts(base, [
        { ...base, id: 'a', teacherId: 't9', classroomId: 'r9', classId: 'c9' },
      ]),
    ).toEqual([]);
  });

  it('ne se compare pas à lui-même (mise à jour)', () => {
    expect(findConflicts({ ...base, id: 's1' }, [{ ...base, id: 's1' }])).toEqual([]);
  });
});
