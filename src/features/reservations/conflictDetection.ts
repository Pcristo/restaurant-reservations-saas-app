import { Reservation, Table, RestaurantSettings } from '../../types';
import { addMinutes, parse } from 'date-fns';
import { getSessionFromTime } from '../../lib/utils';

export interface OverlapCheckOptions {
  currentResId?: string;
  tableId: string;
  date: string;
  time: string;
  tables: Table[];
  reservations: Reservation[];
  settings?: Partial<RestaurantSettings> | null;
  manualSession?: 'lunch' | 'dinner';
}

export interface OverlapCheckResult {
  hasConflict: boolean;
  conflictType?: 'table_blocked' | 'reservation_blocked' | 'time_overlap';
  conflictingReservation?: Reservation | null;
  joinGroup: string[];
}

/**
 * Returns all table IDs in the join group for a given table, date, and time/session.
 */
export function getJoinGroupForTable(
  tableId: string,
  date: string,
  time: string,
  tables: Table[],
  manualSession?: 'lunch' | 'dinner'
): string[] {
  if (!tableId || tableId === 'auto' || tableId === 'none') {
    return [];
  }

  const table = tables.find(t => t.id === tableId);
  if (!table) return [tableId];

  const sessionKey = manualSession || getSessionFromTime(time, date);
  const dailyJoin = table.dailyJoins?.[date]?.[sessionKey] || table.dailyJoins?.[date]?.default;

  if (dailyJoin?.joinedTables && dailyJoin.joinedTables.length > 0) {
    return Array.from(new Set([tableId, ...dailyJoin.joinedTables]));
  }

  // Fallback to static joinedTables if defined
  if (table.joinedTables && table.joinedTables.length > 0) {
    return Array.from(new Set([tableId, ...table.joinedTables]));
  }

  return [tableId];
}

/**
 * Checks whether a given table or any table in its join group is blocked on a given date/session.
 */
export function checkTableBlocked(
  joinGroup: string[],
  tables: Table[],
  date: string,
  sessionKey: 'lunch' | 'dinner' | string
): boolean {
  return joinGroup.some(tid => {
    const table = tables.find(t => t.id === tid);
    if (!table) return false;
    return Boolean(
      table.blockedDates?.[date]?.[sessionKey] ||
      table.blockedDates?.[date]?.default ||
      table.isBlocked
    );
  });
}

/**
 * Creates a synthetic blocked reservation placeholder for UI feedback when a table is blocked.
 */
export function createSyntheticBlockedReservation(tableId: string, date: string): Reservation {
  return {
    id: 'blocked-simulated',
    customerName: 'BLOCKED',
    customerEmail: '',
    customerPhone: '',
    date,
    time: '00:00',
    guests: 0,
    tableId,
    status: 'blocked',
    notes: 'Manual block',
    source: 'admin'
  };
}

/**
 * Unified reservation conflict and overlap detection engine.
 * Used by Live View, Reservation List, and Booking Modals to prevent overlapping bookings.
 */
export function checkReservationConflict(options: OverlapCheckOptions): OverlapCheckResult {
  const {
    currentResId,
    tableId,
    date,
    time,
    tables,
    reservations,
    settings,
    manualSession
  } = options;

  if (!tableId || tableId === 'auto' || tableId === 'none' || !date || !time) {
    return { hasConflict: false, joinGroup: [] };
  }

  const joinGroup = getJoinGroupForTable(tableId, date, time, tables, manualSession);
  if (joinGroup.length === 0) {
    return { hasConflict: false, joinGroup: [] };
  }

  const sessionKey = manualSession || getSessionFromTime(time, date);

  // 1. Check for manual blocked reservations (status === 'blocked') on ANY table in the group
  const blockedRes = reservations.find(r => {
    if (r.id === currentResId || r.date !== date || r.status !== 'blocked') return false;
    return joinGroup.includes(r.tableId || '');
  });

  if (blockedRes) {
    return {
      hasConflict: true,
      conflictType: 'reservation_blocked',
      conflictingReservation: blockedRes,
      joinGroup
    };
  }

  // 2. Check if the table or joined tables are blocked in table settings
  const isTableBlocked = checkTableBlocked(joinGroup, tables, date, sessionKey);
  if (isTableBlocked) {
    return {
      hasConflict: true,
      conflictType: 'table_blocked',
      conflictingReservation: createSyntheticBlockedReservation(tableId, date),
      joinGroup
    };
  }

  // 3. Time overlap check with configured minimum reservation gap (default: 135 minutes)
  const gap = settings?.minReservationGap || 135;

  let newStart: Date;
  try {
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    newStart = new Date(year, month - 1, day, hours, minutes, 0, 0);
  } catch {
    newStart = parse(time, 'HH:mm', new Date());
  }

  const newEnd = addMinutes(newStart, gap);

  const ignoredStatuses: Array<Reservation['status']> = [
    'cancelled',
    'completed',
    'no-show',
    'blocked',
    'waiting-list'
  ];

  const overlappingRes = reservations.find(r => {
    if (r.id === currentResId || r.date !== date) return false;
    if (ignoredStatuses.includes(r.status)) return false;
    if (!joinGroup.includes(r.tableId || '')) return false;
    if (!r.time) return false;

    let resStart: Date;
    try {
      const [rYear, rMonth, rDay] = r.date.split('-').map(Number);
      const [rHours, rMinutes] = r.time.split(':').map(Number);
      resStart = new Date(rYear, rMonth - 1, rDay, rHours, rMinutes, 0, 0);
    } catch {
      resStart = parse(r.time, 'HH:mm', new Date());
    }

    const resEnd = addMinutes(resStart, gap);
    return (newStart < resEnd && resStart < newEnd);
  });

  if (overlappingRes) {
    return {
      hasConflict: true,
      conflictType: 'time_overlap',
      conflictingReservation: overlappingRes,
      joinGroup
    };
  }

  return {
    hasConflict: false,
    joinGroup
  };
}
