// src/businessDate.ts
import { DateTime } from 'luxon';
export type IsHolidayFn = (dt: DateTime) => boolean | Promise<boolean>;
//export type LoggerFn = (msg: string) => void | undefined;

const BOGOTA = 'America/Bogota';
const MORNING_START = 8;
const MORNING_END = 12;
const AFTERNOON_START = 13;
const AFTERNOON_END = 17;

export function isWeekend(dt: DateTime): boolean {
  return dt.setZone(BOGOTA).weekday === 6 || dt.setZone(BOGOTA).weekday === 7;
}

// function log(logger: LoggerFn | undefined, message: string) {
//   if (logger) logger(message);
// }

/**
 * Retrocede al día hábil anterior y lo deja a las 17:00 (zona Bogotá).
 */
export async function previousWorkingDay(dt: DateTime, isHoliday: IsHolidayFn): Promise<DateTime> {
  let cursor = dt.setZone(BOGOTA).minus({ days: 1 }).startOf('day');
  //log(logger, `previousWorkingDay: start ${cursor.toISO()}`);
  while (isWeekend(cursor) || await isHoliday(cursor)) {
    //log(logger, `  skipping ${cursor.toISO()} weekend/holiday`);
    cursor = cursor.minus({ days: 1 });
  }
  const res = cursor.set({ hour: AFTERNOON_END, minute: 0, second: 0, millisecond: 0 });
  //log(logger, `previousWorkingDay -> ${res.toISO()}`);
  return res;
}

/**
 * Normaliza hacia atrás al último instante laborable según reglas.
 */
export async function normalizeBackwardToNearestWorkTime(dt: DateTime, isHoliday: IsHolidayFn): Promise<DateTime> {
  let cursor = dt.setZone(BOGOTA);
  //log(logger, `normalizeBackward: starting ${cursor.toISO()}`);
  if (isWeekend(cursor) || await isHoliday(cursor)) {
    const prev = await previousWorkingDay(cursor, isHoliday);
    //log(logger, `normalizeBackward -> weekend/holiday -> ${prev.toISO()}`);
    return prev;
  }

  const hour = cursor.hour;
  const minute = cursor.minute;

  if (hour < MORNING_START) {
    const prev = await previousWorkingDay(cursor, isHoliday);
    //log(logger, `normalizeBackward -> before work -> ${prev.toISO()}`);
    return prev;
  }

  if (hour === MORNING_END) {
    const out = cursor.set({ hour: MORNING_END, minute: 0, second: 0, millisecond: 0 });
    //log(logger, `normalizeBackward -> lunch -> ${out.toISO()}`);
    return out;
  }

  if (hour > AFTERNOON_END || (hour === AFTERNOON_END && minute > 0)) {
    const out = cursor.set({ hour: AFTERNOON_END, minute: 0, second: 0, millisecond: 0 });
    //log(logger, `normalizeBackward -> after work -> ${out.toISO()}`);
    return out;
  }

  const out = cursor.set({ second: 0, millisecond: 0 });
  //log(logger, `normalizeBackward -> within work -> ${out.toISO()}`);
  return out;
}

/**
 * Suma N días hábiles PRESERVANDO la hora (se asume dt ya normalizado).
 */
export async function addBusinessDays(dt: DateTime, days: number, isHoliday: IsHolidayFn): Promise<DateTime> {
  let cursor = dt.setZone(BOGOTA);
  //log(logger, `addBusinessDays: start ${cursor.toISO()}, days=${days}`);
  for (let i = 0; i < days; i++) {
    // avance un día y buscar próximo hábil
    do {
      cursor = cursor.plus({ days: 1 });
      //log(logger, `  advance to ${cursor.toISO()}`);
    } while (isWeekend(cursor) || await isHoliday(cursor));
    //log(logger, `  counted day ${i + 1} -> ${cursor.toISO()}`);
  }
  //log(logger, `addBusinessDays -> ${cursor.toISO()}`);
  return cursor;
}

/**
 * Suma horas hábiles (minuto-preciso) respetando bloques y feriados.
 */
export async function addBusinessHours(dt: DateTime, hours: number, isHoliday: IsHolidayFn): Promise<DateTime> {
  let cursor = dt.setZone(BOGOTA);
  let remainingMinutes = Math.round(hours * 60);
  //log(logger, `addBusinessHours: start ${cursor.toISO()}, hours=${hours}, remainingMinutes=${remainingMinutes}`);

  while (remainingMinutes > 0) {
    // Si el día no es hábil => siguiente día hábil 08:00
    if (isWeekend(cursor) || await isHoliday(cursor)) {
      do {
        //log(logger, `  not working day ${cursor.toISO()}, advance day`);
        cursor = cursor.plus({ days: 1 }).startOf('day').set({ hour: MORNING_START, minute: 0, second: 0, millisecond: 0 });
      } while (isWeekend(cursor) || await isHoliday(cursor));
      //log(logger, `  landed on next working day ${cursor.toISO()}`);
      continue;
    }

    const morningStart = cursor.set({ hour: MORNING_START, minute: 0, second: 0, millisecond: 0 });
    const morningEnd = cursor.set({ hour: MORNING_END, minute: 0, second: 0, millisecond: 0 });
    const afternoonStart = cursor.set({ hour: AFTERNOON_START, minute: 0, second: 0, millisecond: 0 });
    const afternoonEnd = cursor.set({ hour: AFTERNOON_END, minute: 0, second: 0, millisecond: 0 });

    let currentIntervalEnd: DateTime | null = null;

    if (cursor < morningStart) {
      //log(logger, `  before morningStart -> snap to ${morningStart.toISO()}`);
      cursor = morningStart;
      currentIntervalEnd = morningEnd;
    } else if (cursor < morningEnd) {
      currentIntervalEnd = morningEnd;
    } else if (cursor < afternoonStart) {
      //log(logger, `  in lunch -> snap to ${afternoonStart.toISO()}`);
      cursor = afternoonStart;
      currentIntervalEnd = afternoonEnd;
    } else if (cursor < afternoonEnd) {
      currentIntervalEnd = afternoonEnd;
    } else {
      // after work end -> next working day 08:00
      //log(logger, `  after working day (${cursor.toISO()}) -> move to next working day 08:00`);
      do {
        cursor = cursor.plus({ days: 1 }).startOf('day').set({ hour: MORNING_START, minute: 0, second: 0, millisecond: 0 });
      } while (isWeekend(cursor) || await isHoliday(cursor));
      //log(logger, `  next working day ${cursor.toISO()}`);
      continue;
    }

    if (currentIntervalEnd) {
      const diffMinutes = Math.max(0, Math.floor(currentIntervalEnd.diff(cursor, 'minutes').minutes));
      if (diffMinutes === 0) {
        //log(logger, `  no minutes available in interval at ${cursor.toISO()}, moving to ${currentIntervalEnd.toISO()}`);
        cursor = currentIntervalEnd;
        continue;
      }
      const take = Math.min(diffMinutes, remainingMinutes);
      //log(logger, `  consuming ${take} minutes from ${cursor.toISO()} to ${cursor.plus({ minutes: take }).toISO()} (interval end ${currentIntervalEnd.toISO()})`);
      cursor = cursor.plus({ minutes: take });
      remainingMinutes -= take;
      //log(logger, `  remainingMinutes=${remainingMinutes}, cursor=${cursor.toISO()}`);
      continue;
    }
  }

  //log(logger, `addBusinessHours -> final ${cursor.toISO()}`);
  return cursor;
}
