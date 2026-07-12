// Détection de conflits d'emploi du temps (enseignant, salle, classe).

export interface SlotLike {
  id?: string;
  dayOfWeek: number;
  startTime: string; // "08:00"
  endTime: string; // "09:30"
  teacherId?: string | null;
  classroomId?: string | null;
  classId?: string | null;
}

const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map((v) => parseInt(v, 10));
  return (h || 0) * 60 + (m || 0);
};

export const overlaps = (a: SlotLike, b: SlotLike): boolean => {
  if (a.dayOfWeek !== b.dayOfWeek) return false;
  return toMinutes(a.startTime) < toMinutes(b.endTime) && toMinutes(b.startTime) < toMinutes(a.endTime);
};

export interface Conflict {
  kind: 'TEACHER' | 'CLASSROOM' | 'CLASS';
  slotId?: string;
  message: string;
}

/** Retourne la liste des conflits entre `candidate` et les créneaux existants. */
export const findConflicts = (candidate: SlotLike, existing: SlotLike[]): Conflict[] => {
  const conflicts: Conflict[] = [];
  for (const slot of existing) {
    if (slot.id && candidate.id && slot.id === candidate.id) continue;
    if (!overlaps(candidate, slot)) continue;
    if (candidate.teacherId && slot.teacherId === candidate.teacherId) {
      conflicts.push({
        kind: 'TEACHER',
        slotId: slot.id,
        message: `L'enseignant a déjà un cours de ${slot.startTime} à ${slot.endTime}`,
      });
    }
    if (candidate.classroomId && slot.classroomId === candidate.classroomId) {
      conflicts.push({
        kind: 'CLASSROOM',
        slotId: slot.id,
        message: `La salle est déjà occupée de ${slot.startTime} à ${slot.endTime}`,
      });
    }
    if (candidate.classId && slot.classId === candidate.classId) {
      conflicts.push({
        kind: 'CLASS',
        slotId: slot.id,
        message: `La classe a déjà un cours de ${slot.startTime} à ${slot.endTime}`,
      });
    }
  }
  return conflicts;
};
