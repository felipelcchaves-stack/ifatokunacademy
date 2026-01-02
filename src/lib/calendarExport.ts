// Utilitário para gerar arquivos iCalendar (.ics)

export interface StudySession {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location?: string;
}

export interface StudyPlanCalendarData {
  sessions: StudySession[];
  planName: string;
}

const formatDateToICS = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

const escapeText = (text: string): string => {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
};

const generateUID = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@offeorunmila.com`;
};

export const generateICSContent = (data: StudyPlanCalendarData): string => {
  const events = data.sessions.map((session) => {
    return `BEGIN:VEVENT
DTSTART:${formatDateToICS(session.startDate)}
DTEND:${formatDateToICS(session.endDate)}
SUMMARY:${escapeText(session.title)}
DESCRIPTION:${escapeText(session.description)}
${session.location ? `LOCATION:${escapeText(session.location)}` : ''}
UID:${generateUID()}
DTSTAMP:${formatDateToICS(new Date())}
END:VEVENT`;
  }).join('\n');

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Offe Orunmila Learning//Study Plan//PT
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${escapeText(data.planName)}
X-WR-TIMEZONE:America/Sao_Paulo
${events}
END:VCALENDAR`;
};

export const downloadICSFile = (data: StudyPlanCalendarData, filename: string = 'plano-estudos.ics'): void => {
  const icsContent = generateICSContent(data);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Gerar sessões de estudo para as próximas semanas baseado na disponibilidade
export const generateStudySessions = (
  availability: Array<{ day: number; slots: Array<{ start: string; end: string }> }>,
  lessons: Array<{ id: string; title: string; moduleTitle: string; durationMinutes: number }>,
  weeksAhead: number = 4
): StudySession[] => {
  const sessions: StudySession[] = [];
  const today = new Date();
  let lessonIndex = 0;

  for (let week = 0; week < weeksAhead && lessonIndex < lessons.length; week++) {
    for (const dayAvail of availability) {
      if (lessonIndex >= lessons.length) break;

      for (const slot of dayAvail.slots) {
        if (lessonIndex >= lessons.length) break;

        const lesson = lessons[lessonIndex];
        const sessionDate = new Date(today);
        
        // Calcular o próximo dia da semana correspondente
        const daysUntilTarget = (dayAvail.day - today.getDay() + 7) % 7 + (week * 7);
        sessionDate.setDate(today.getDate() + daysUntilTarget);

        // Definir horário de início
        const [startHour, startMinute] = slot.start.split(':').map(Number);
        sessionDate.setHours(startHour, startMinute, 0, 0);

        // Calcular horário de fim
        const endDate = new Date(sessionDate);
        endDate.setMinutes(endDate.getMinutes() + lesson.durationMinutes);

        sessions.push({
          title: `📚 ${lesson.moduleTitle} - ${lesson.title}`,
          description: `Sessão de estudos - Offe Orunmila Learning\n\nMódulo: ${lesson.moduleTitle}\nLição: ${lesson.title}\nDuração: ${lesson.durationMinutes} minutos`,
          startDate: sessionDate,
          endDate: endDate,
          location: `${window.location.origin}/lesson/${lesson.id}`,
        });

        lessonIndex++;
      }
    }
  }

  return sessions;
};
