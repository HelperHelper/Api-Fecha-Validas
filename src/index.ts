import express, { Request, Response } from 'express';
import { DateTime } from 'luxon';
import { isHolidayDynamic } from './holidays';
import { normalizeBackwardToNearestWorkTime, addBusinessDays, addBusinessHours } from './businessDate';
import { ApiResponseError, ApiResponseSuccess } from './types';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const BOGOTA = 'America/Bogota';

// Helper para enviar errores
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

    // Validar la fecha si se pasa
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
      start = parsed.setZone(BOGOTA);
    } else {
      start = DateTime.now().setZone(BOGOTA);
    }

    // Normalizar inicio
    const normalized = await normalizeBackwardToNearestWorkTime(start, isHolidayDynamic);

    // Sumar días hábiles
    let afterDays = normalized;
    if (daysNum > 0) {
      afterDays = await addBusinessDays(afterDays, daysNum, isHolidayDynamic);
    }

    // Sumar horas hábiles
    let afterHours = afterDays;
    if (hoursNum > 0) {
      afterHours = await addBusinessHours(afterHours, hoursNum, isHolidayDynamic);
    }

    // Convertir a UTC con Z
    const resultUtc = afterHours.setZone('utc').toISO({ suppressMilliseconds: true });
    const payload: ApiResponseSuccess = {
      date: resultUtc && resultUtc.endsWith('Z') ? resultUtc : resultUtc + 'Z'
    };

    res.status(200).json(payload);
  } catch (err) {
    console.error('Unexpected error', err);
    sendError(res, 500, 'ServerError', 'An unexpected error occurred.');
  }
});

app.listen(PORT, () => {
  console.log(`Business days API listening on port ${PORT}`);
});

