# Tournament Points – Persistence and Export Fixes

- Organizer tournament storage now has a UID-scoped local cache fallback.
- Firestore remains the preferred cloud source when available.
- Slot-list PNG export calculates its height from the number of teams/rows and no longer clips after 9 teams.
- Slot-list poster uses a 4-column layout for 9+ teams and dynamically grows vertically.
- Player standings include every registered roster player and MVP is based strictly on cumulative kills.
- Login/authentication and existing scoring values were intentionally left unchanged.
