import axios from 'axios';
import { DateTime } from 'luxon';

const HOLIDAYS_URL = 'https://content.capta.co/Recruitment/WorkingDays.json';
const cache: Map<number, Set<string>> = new Map<number, Set<string>>();

async function fetchHolidaysJson(): Promise<any> {
  const res = await axios.get(HOLIDAYS_URL, { timeout: 5000 });
  return res.data;
}

function extractDates(obj: any): string[] {
  const out: Set<string> = new Set<string>();
  if (!obj) return [];
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (typeof item === 'string') out.add(item.slice(0, 10));
      else if (item && typeof item === 'object') {
        if (item.date) out.add(String(item.date).slice(0, 10));
        else if (item.Date) out.add(String(item.Date).slice(0, 10));
        else if (item.fecha) out.add(String(item.fecha).slice(0, 10));
        else {
          for (const v of Object.values(item)) {
            if (typeof v === 'string' && /\d{4}-\d{2}-\d{2}/.test(v)) {
              out.add(v.slice(0, 10));
              break;
            }
          }
        }
      }
    }
    return Array.from(out);
  }
  if (typeof obj === 'object') {
    for (const v of Object.values(obj)) {
      if (Array.isArray(v)) {
        for (const item of v) {
          if (typeof item === 'string' && /\d{4}-\d{2}-\d{2}/.test(item)) out.add(item.slice(0, 10));
          else if (item && typeof item === 'object' && item.date) out.add(String(item.date).slice(0, 10));
        }
      }
    }
    return Array.from(out);
  }
  return Array.from(out);
}

export async function getHolidaysForYear(year: number): Promise<Set<string>> {
  if (cache.has(year)) return cache.get(year)!;
  const data = await fetchHolidaysJson();
  const dates = extractDates(data);
  const set = new Set<string>(dates.filter((d) => d.startsWith(String(year))));
  cache.set(year, set);
  return set;
}

// Dinámico: revisa el año correcto
export async function isHolidayDynamic(date: DateTime): Promise<boolean> {
  const set = await getHolidaysForYear(date.year);
  const iso = date.toISODate();
  return iso ? set.has(iso) : false;
}
