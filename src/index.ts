import express, { Request, Response } from 'express';
import { DateTime } from 'luxon';
import { getHolidaysForYear } from './holidays';
import { ApiResponseError, ApiResponseSuccess } from './types';
import { normalizeBackwardToNearestWorkTime, addBusinessDays, addBusinessHours } from './businessDate';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const BOGOTA = 'America/Bogota';

// Helper to send error response with required shape
function sendError(res: Response, status: number, code: string, message: string) {
  const payload: ApiResponseError = { error: code, message };
  res.status(status).json(payload);
}

app.get('/', async (req: Request, res: Response) => {
  try {
    const { days, hours, date } = req.query;

    if (days === undefined && hours === undefined) {
      return sendError(res, 400, 'InvalidParameters', 'At least one of "days" or "hours" must be provided.');
    }

    // parse days/hours if present
    let daysNum = 0;
    let hoursNum = 0;

    if (days !== undefined) {
      const parsed = parseInt(String(days), 10);
      if (isNaN(parsed) || parsed < 0) {
        return sendError(res, 400, 'InvalidParameters', '"days" must be a non-negative integer.');
      }
      daysNum = parsed;
    }

    if (hours !== undefined) {
      const parsed = parseInt(String(hours), 10);
      if (isNaN(parsed) || parsed < 0) {
        return sendError(res, 400, 'InvalidParameters', '"hours" must be a non-negative integer.');
      }
      hoursNum = parsed;
    }

    // If date is provided it must be an ISO UTC with trailing Z
    let start: DateTime;
    if (date !== undefined) {
      const ds = String(date);
      if (!ds.endsWith('Z')) {
        return sendError(res, 400, 'InvalidParameters', '"date" must be in UTC ISO 8601 format and include a trailing Z.');
      }
      const parsed = DateTime.fromISO(ds, { zone: 'utc' });
      if (!parsed.isValid) {
        return sendError(res, 400, 'InvalidParameters', '"date" is not a valid ISO 8601 UTC date.');
      }
      // convert to Bogota time for computations
      start = parsed.setZone(BOGOTA);
    } else {
      // now in Bogota
      start = DateTime.now().setZone(BOGOTA);
    }

    // Load holidays for relevant years (start year and possibly range)
    const yearsToCheck = new Set<number>();
    yearsToCheck.add(start.year);
    // also include some years forward to handle large day additions
    yearsToCheck.add(start.plus({ days: 365 }).year);

    const holidaySets: Map<number, Set<string>> = new Map();
    for (const y of Array.from(yearsToCheck)) {
      try {
        const s = await getHolidaysForYear(y);
        holidaySets.set(y, s);
      } catch (err) {
        return sendError(res, 503, 'ServiceUnavailable', 'Failed to fetch holidays data.');
      }
    }

    // create a function that checks holiday for a given DateTime by consulting the map
    function isHoliday(dt: DateTime): boolean {
      const s = holidaySets.get(dt.year);
      return s ? s.has(dt.toISODate() ?? '') : false;
    }

    // Normalize start backwards to nearest working time per rules
    const normalized = normalizeBackwardToNearestWorkTime(start, new Set(Array.from(holidaySets.get(start.year) || [])));

    // First add days (business days)
    let afterDays = normalized;
    if (daysNum > 0) {
      afterDays = addBusinessDays(afterDays, daysNum, new Set(Array.from(holidaySets.get(afterDays.year) || [])));
    }

    // Then add hours (business hours)
    let afterHours = afterDays;
    if (hoursNum > 0) {
      afterHours = addBusinessHours(afterHours, hoursNum, new Set(Array.from(holidaySets.get(afterHours.year) || [])));
    }

    // Convert final DateTime (which is in America/Bogota) back to UTC ISO with Z
    const resultUtc = afterHours.setZone('utc').toISO({ suppressMilliseconds: true });
    const payload: ApiResponseSuccess = { date: resultUtc && resultUtc.endsWith('Z') ? resultUtc : resultUtc + 'Z' };
    res.status(200).json(payload);
  } catch (err) {
    console.error('Unexpected error', err);
    sendError(res, 500, 'ServerError', 'An unexpected error occurred.');
  }
});

app.listen(PORT, () => {
  console.log(`Business days API listening on port ${PORT}`);
});
