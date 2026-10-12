import { describe, it, expect } from 'bun:test';
import { 
  checkReservationConflict, 
  getJoinGroupForTable,
  checkTableBlocked
} from '../../src/features/reservations/conflictDetection';
import { Table, Reservation } from '../../src/types';

describe('Reservation Conflict Detection', () => {
  const mockTables: Table[] = [
    {
      id: 'table-1',
      name: 'Table 1',
      seats: 4,
      x: 100,
      y: 100,
      status: 'available',
      dailyJoins: {
        '2026-10-15': {
          dinner: { joinedTables: ['table-2'], joinedSeats: 8 }
        }
      }
    },
    {
      id: 'table-2',
      name: 'Table 2',
      seats: 4,
      x: 200,
      y: 100,
      status: 'available'
    },
    {
      id: 'table-3-blocked',
      name: 'Table 3',
      seats: 2,
      x: 300,
      y: 100,
      status: 'available',
      isBlocked: true
    }
  ];

  const mockReservations: Reservation[] = [
    {
      id: 'res-1',
      customerName: 'John Doe',
      date: '2026-10-15',
      time: '19:30',
      guests: 4,
      tableId: 'table-1',
      status: 'confirmed'
    },
    {
      id: 'res-2-cancelled',
      customerName: 'Jane Smith',
      date: '2026-10-15',
      time: '19:30',
      guests: 2,
      tableId: 'table-2',
      status: 'cancelled'
    }
  ];

  it('detects time overlap on the same table within minimum gap window', () => {
    const result = checkReservationConflict({
      tableId: 'table-1',
      date: '2026-10-15',
      time: '20:00', // within 135 mins of 19:30
      tables: mockTables,
      reservations: mockReservations,
      settings: { minReservationGap: 135 }
    });

    expect(result.hasConflict).toBe(true);
    expect(result.conflictType).toBe('time_overlap');
    expect(result.conflictingReservation?.id).toBe('res-1');
  });

  it('allows booking when outside minimum reservation gap', () => {
    const result = checkReservationConflict({
      tableId: 'table-1',
      date: '2026-10-15',
      time: '22:00', // 150 mins after 19:30, gap is 120 mins
      tables: mockTables,
      reservations: mockReservations,
      settings: { minReservationGap: 120 }
    });

    expect(result.hasConflict).toBe(false);
  });

  it('detects conflict across joined tables in dinner session', () => {
    // res-1 is on table-1 at 19:30. Table-1 and Table-2 are joined on 2026-10-15 for dinner.
    // Booking table-2 at 19:45 should conflict because it is in table-1's join group.
    const result = checkReservationConflict({
      tableId: 'table-1',
      date: '2026-10-15',
      time: '19:45',
      tables: mockTables,
      reservations: mockReservations,
      manualSession: 'dinner'
    });

    expect(result.hasConflict).toBe(true);
    expect(result.joinGroup).toContain('table-1');
    expect(result.joinGroup).toContain('table-2');
  });

  it('ignores cancelled reservations when checking conflicts', () => {
    const result = checkReservationConflict({
      tableId: 'table-2',
      date: '2026-10-15',
      time: '19:30',
      tables: mockTables,
      reservations: mockReservations,
      manualSession: 'lunch' // not joined in lunch
    });

    expect(result.hasConflict).toBe(false);
  });

  it('identifies permanently or date-blocked tables', () => {
    const result = checkReservationConflict({
      tableId: 'table-3-blocked',
      date: '2026-10-15',
      time: '13:00',
      tables: mockTables,
      reservations: mockReservations
    });

    expect(result.hasConflict).toBe(true);
    expect(result.conflictType).toBe('table_blocked');
    expect(result.conflictingReservation?.customerName).toBe('BLOCKED');
  });
});
