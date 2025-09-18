import axios from 'axios';
import { DateTime } from 'luxon';

// URL provided in the task
const HOLIDAYS_URL = 'https://content.capta.co/Recruitment/WorkingDays.json';

// cache: year -> Set of 'YYYY-MM-DD' strings
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
      if (typeof item === 'string') {
        out.add(item.slice(0,10));
      } else if (item && typeof item === 'object') {
        // try common keys
        if (item.date) out.add(String(item.date).slice(0,10));
        else if (item.Date) out.add(String(item.Date).slice(0,10));
        else if (item.fecha) out.add(String(item.fecha).slice(0,10));
        else {
          // search nested values
          for (const v of Object.values(item)) {
            if (typeof v === 'string' && /\d{4}-\d{2}-\d{2}/.test(v)) {
              out.add(v.slice(0,10));
              break;
            }
          }
        }
      }
    }
    return Array.from(out);
  } else if (typeof obj === 'object') {
    // try to find arrays inside
    for (const v of Object.values(obj)) {
      if (Array.isArray(v)) {
        for (const item of v) {
          if (typeof item === 'string' && /\d{4}-\d{2}-\d{2}/.test(item)) out.add(item.slice(0,10));
          else if (item && typeof item === 'object') {
            if (item.date) out.add(String(item.date).slice(0,10));
            else {
              for (const vv of Object.values(item)) {
                if (typeof vv === 'string' && /\d{4}-\d{2}-\d{2}/.test(vv)) out.add(vv.slice(0,10));
              }
            }
          }
        }
      } else if (typeof v === 'string' && /\d{4}-\d{2}-\d{2}/.test(v)) {
        out.add(v.slice(0,10));
      }
    }
    return Array.from(out);
  }
  return Array.from(out);
}

export async function getHolidaysForYear(year: number): Promise<Set<string>> {
  if (cache.has(year)) return cache.get(year)!;
  // fetch JSON and try to extract date strings
  const data = await fetchHolidaysJson();
  const dates = extractDates(data);
  // keep only those for the requested year
  const set = new Set<string>(dates.filter(d => d.startsWith(String(year))));
  cache.set(year, set);
  return set;
}

export function isHoliday(date: DateTime, set: Set<string>): boolean {
  return set.has(date.toISODate() ?? '');
}
