# Tournament Points — Final Bhargav Visual Pass

## Points table
- Rebuilt the exported points table as a clean **white + orange + yellow** result sheet.
- Removed the dark/black lower canvas issue by exporting with a white background.
- Orange frame and table header.
- Yellow Total Points column; orange highlight for rank #1.
- Clearer, larger team names, numbers and headings.
- Columns use `#`, `SLOT`, `TEAM`, `MP`, `BOOYAH'S`, `KILLS`, `PP`, `TP`.
- BOOYAH'S is used everywhere in the result sheet instead of WWCD.
- Team monograms remain automatic (`TEAM X` -> `TX`).
- Footer includes `MADE WITH LOVE BY BHARGAV`.
- Existing scoring/ranking data is untouched.
- Existing 4:5, 9:16 and 16:9 export dimensions remain supported.

## Organizer interface
- Added a short branded opening animation, shown once per browser session.
- Added lightweight route/page entrance animation.
- Refined sidebar, cards, hover states and buttons with a consistent orange esports accent.
- Kept the interface dark for organizer usability while keeping exported result graphics bright and print-friendly.
- Existing modal/dropdown behavior is preserved.

## Data / logic
- No scoring engine changes.
- No Gemini extraction logic changes.
- No Firebase authentication or tournament ownership logic changes.
- MVP remains a separate Tournament MVP area/page.
- Existing FAQ and Information footer remain compact and simple.

## Migration
- Visual configuration version bumped to `4`.
- Older saved designs are automatically refreshed to the final white/orange/yellow visual system while preserving tournament content.
