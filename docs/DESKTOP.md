# Pichigoose: desktop

The app works on a computer too. It's the same app with the same data, copy and scrapbook pieces, laid out for a wide screen. Nothing here changes the phone layout.

Screens:
- `screens/desktop/hifi/`: home, arrange your home and shopping as finished hi-fi screens (1440 × 900). The HTML behind them is in `screens/desktop/hifi-source/`. Open it through a local server from the project root, the same as the phone hi-fi.
- `screens/desktop/wireframes/`: all 11 desktop screens (D1 to D11) as gray wireframes. Build the ones without hi-fi in the same style as the hi-fi screens.

Labels: **[Nora]** decided by Nora. **[Claude]** a proposal from Claude that Nora accepted for the plan.

---

## 1. When the desktop layout kicks in [Claude]

- **1024 px wide and up:** the desktop layout.
- **Narrower than that:** the phone layout, as it is today.
- **Each screen in its own browser tab or window:** everything works with the mouse and the keyboard.

## 2. The frame

- **The sidebar replaces the bottom tab bar.** It's its own sheet of paper, 264 px wide and taped at the top, overlapping the notebook page a little. From top to bottom it holds:
  - Nora's lettering (the logo).
  - The household switcher: the household name in ink with its address below. Clicking it opens My households.
  - The tabs: Home, Shopping, To-dos, Notes. Money comes in phase 3 and stays hidden until then. The active tab is hero dark with the pink washi strip behind its icon, the same as the phone tab bar.
  - The "+ Add" sticker, which opens the same menu as the phone's + (something to buy, a to-do, a note).
  - The person's avatar with "Profile and settings" at the bottom.
- **The notebook page** fills the rest. It has the ruled lines and the red margin line, with content starting to the right of the margin.
- **The page background** around both sheets is lilac (`color.brand.lilac`).

## 3. How phone patterns change

| On the phone | On desktop |
|---|---|
| Bottom tab bar | Sidebar |
| Round + button | "+ Add" sticker in the sidebar |
| Bottom sheets (add a to-do, edit, add a debt) | A side panel on the right of the page, 400 px wide, so the list stays in view |
| Opening a note on its own screen | The note opens in the side panel next to the grid, and you can edit it there |
| Small confirmations (rename, leave, delete) | Small centered dialogs |
| Add field at the bottom of Shopping | Add field at the top of the list. Enter adds the item and keeps the field ready for the next one |

## 4. Screen by screen

- **D1 Sign up:** split in two. Pichi, the logo and the tagline on the left, the form on the right, with the EN / SR switch at the top right.
- **D2 Join or create:** both cards side by side, so there's nothing to switch.
- **D3 Home (hi-fi):** Pichi's stamp and greeting at the top, "Arrange your home" as a sticker on the right. Below, the sections are sticky notes on a board, three across, in the person's own home order from `home_layout`, filling left to right, then down.
- **D4 Arrange your home (hi-fi):** happens in place. The board turns into draggable notes, with Reset and Done at the top. A picked-up note lifts and tilts (`shadow.noteLifted`), the same as on the phone. Hidden sections stay in the sidebar.
- **D5 Shopping (hi-fi):** the list tabs as washi tape, the add field on top, and Bought in its own column on the right. Share stays an icon sticker.
- **D6 To-dos:** the list grouped by Today, This week and No date, with add and edit in the side panel.
- **D7 Notes:** the grid of notes, pinned ones first. Search sits at the top right, and an open note shows in the side panel.
- **D8 My households:** the households as cards in a grid, with Join and Create new at the top. Each card's ⋯ menu holds Rename, Copy address and Leave.
- **D9 Your character:** the big carousel preview on the left. On the right are the tabs (Character, Color, Extra) with every option shown at once, plus the name field.
- **D10 Settings:** one centered column, 600 px wide.
- **D11 Money:** phase 3, don't build yet. The wireframe shows the plan.

## 5. Not in this round

- Events and notifications on desktop (phase 4).
- Money on desktop (phase 3).
- A tablet-specific layout.

---

## Also open: the main share image

Join links already show `public/og/join.jpg`. The regular page has no `og:image` yet, so a plain pichigoose.com link shows no picture when shared. The approved image is now in `public/og/share.jpg` (1200 × 630). Add it to the share-preview block in `index.html`, the same way `join.jpg` is set up, with this alt text: "Pichi the goose on a postage stamp, next to a shopping list".
