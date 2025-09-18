import { DateTime } from 'luxon';

export type HolidaySet = Set<string>;
const BOGOTA = 'America/Bogota';

export function isWeekend(dt: DateTime): boolean {
  // Luxon: 1 = Monday ... 7 = Sunday
  const wd = dt.weekday;
  return wd === 6 || wd === 7;
}

export function previousWorkingDay(dt: DateTime, holidays: HolidaySet): DateTime {
  let cursor = dt.minus({ days: 1 }).startOf('day').setZone(BOGOTA);
  while (isWeekend(cursor) || holidays.has(cursor.toISODate() ?? '')) {
    cursor = cursor.minus({ days: 1 });
  }
  // set to end of work day (17:00)
  return cursor.set({ hour: 17, minute: 0, second: 0, millisecond: 0 });
}

export function nextWorkingDayPreserveTime(dt: DateTime, holidays: HolidaySet): DateTime {
  // move at least one calendar day forward, then skip weekends/holidays
  let cursor = dt.plus({ days: 1 }).set({ hour: dt.hour, minute: dt.minute, second: dt.second, millisecond: dt.millisecond }).setZone(BOGOTA);
  while (isWeekend(cursor) || holidays.has(cursor.toISODate() ?? '')) {
    cursor = cursor.plus({ days: 1 });
  }
  return cursor;
}

export function normalizeBackwardToNearestWorkTime(dt: DateTime, holidays: HolidaySet): DateTime {
  // dt is expected to be in America/Bogota zone already
  let cursor = dt.setZone(BOGOTA);

  // If on weekend or holiday, jump to previous working day at 17:00
  if (isWeekend(cursor) || holidays.has(cursor.toISODate() ?? '')) {
    return previousWorkingDay(cursor, holidays);
  }

  const hour = cursor.hour;
  const minute = cursor.minute;

  // before working hours => go to previous working day's 17:00
  if (hour < 8) {
    return previousWorkingDay(cursor, holidays);
  }

  // during lunch (12:00 - 12:59...) -> set to 12:00 (backwards to nearest work time)
  if (hour === 12) {
    return cursor.set({ hour: 12, minute: 0, second: 0, millisecond: 0 });
  }

  // after work end (>=17:00) -> set to 17:00 same day
  if (hour > 17 || (hour === 17 && minute > 0)) {
    // set to 17:00 same day
    return cursor.set({ hour: 17, minute: 0, second: 0, millisecond: 0 });
  }

  // valid working time or edge: keep as is
  return cursor.set({ second: 0, millisecond: 0 });
}

export function addBusinessDays(dt: DateTime, days: number, holidays: HolidaySet): DateTime {
  let cursor = dt.setZone(BOGOTA);
  for (let i = 0; i < days; i++) {
    cursor = nextWorkingDayPreserveTime(cursor, holidays);
  }
  return cursor;
}

export function addBusinessHours(dt: DateTime, hours: number, holidays: HolidaySet): DateTime {
  let cursor = dt.setZone(BOGOTA);
  let remainingMinutes = Math.round(hours * 60);

  while (remainingMinutes > 0) {
    // Si no es día hábil, mover al siguiente día hábil a las 8:00
    if (isWeekend(cursor) || holidays.has(cursor.toISODate() ?? '')) {
      do {
        cursor = cursor.plus({ days: 1 }).startOf('day').set({ hour: 8 });
      } while (isWeekend(cursor) || holidays.has(cursor.toISODate() ?? ''));
      continue;
    }

    const morningStart = cursor.set({ hour: 8, minute: 0 });
    const morningEnd = cursor.set({ hour: 12, minute: 0 });
    const afternoonStart = cursor.set({ hour: 13, minute: 0 });
    const afternoonEnd = cursor.set({ hour: 17, minute: 0 });

    let currentIntervalEnd: DateTime | null = null;

    if (cursor < morningStart) {
      cursor = morningStart;
      currentIntervalEnd = morningEnd;
    } else if (cursor < morningEnd) {
      currentIntervalEnd = morningEnd;
    } else if (cursor < afternoonStart) {
      cursor = afternoonStart;
      currentIntervalEnd = afternoonEnd;
    } else if (cursor < afternoonEnd) {
      currentIntervalEnd = afternoonEnd;
    } else {
      // Si ya pasó la jornada laboral, mover al siguiente día hábil a las 8:00
      do {
        cursor = cursor.plus({ days: 1 }).startOf('day').set({ hour: 8 });
      } while (isWeekend(cursor) || holidays.has(cursor.toISODate() ?? ''));
      continue;
    }

    // Consumir minutos en el intervalo actual
    if (currentIntervalEnd) {
      const diff = Math.floor(currentIntervalEnd.diff(cursor, 'minutes').minutes);
      const take = Math.min(diff, remainingMinutes);

      cursor = cursor.plus({ minutes: take });
      remainingMinutes -= take;
    }
  }

  return cursor;
}

