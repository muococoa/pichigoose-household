# Pichigoose: design

The look is **Scrapbook**: a lined notebook page with sticky notes, washi tape, stamps and stickers, written in ink. Every value lives in `tokens.json`. That file and this one are the source of truth. If a screen image and the tokens disagree, the tokens win.

References:
- `screens/hifi/` is what finished screens look like: home, arrange your home, shopping.
- `screens/hifi-source/` is the HTML behind those three, for exact CSS. Open it through a local server from the project root (for example `npx serve .`), not by double-clicking: browsers block the texture masks on `file://`.
- `screens/wireframes/` is the layout for every other screen. Build those in the same style as the hi-fi screens. The wireframe text is Serbian placeholder copy. The app is English by default.
- `../assets/` holds the textures, the logo and Pichi.

---

## 1. The page

- Every screen is a sheet of notebook paper, color `paper.page`.
- The paper texture `assets/paper-white.png` tiles over it (512 px tile).
- Ruled lines in `paper.rule`, 1 px, every 32 px, starting 6 px down.
- A red margin line: 2 px wide, at x = 26, color `paper.margin`. It runs top to bottom.
- Content starts at 40 px from the left (right of the margin) and ends 22 px from the right.

## 2. Ink: headlines in Nora's hand

- Screen titles and section titles are handwritten: Caveat 700, color `ink.headline`. Caveat is a stand-in until Nora's own lettering becomes a font.
- They look like a dry marker. The effect has three parts:
  1. **Rough edges:** small turbulence displacement (scale about 1.3).
  2. **Thinner core:** erode by about 0.85 px, with speckle only on the edges, never inside the letters. The text must always stay fully readable. Nora was clear about this.
  3. **Patchy ink:** an alpha mask from `assets/ink-patch.png` (420 px tile). Each headline uses a different offset of the mask, so no two look the same.
- The CSS version is in `screens/hifi-source/` (the `#dry-ink` SVG filter and the `.hand` class).
- **In the app:** reuse that CSS as it is. It's a web app, so the SVG filter and the mask work directly. Never let the effect clip letters: keep the padding and the negative margin from `.hand`.

## 3. Sticky notes

- Each home section is a sticky note in a pastel from `color.note`: to-dos blush, shopping butter, money mist, notes sage, Pichi's news lilac. Sticky-note colors per person come later.
- Over every note: `assets/note-fresh.png` with multiply blending. Notes are fresh, not recycled-looking. Keep it subtle.
- Shadow `shadow.note`: hard, no blur, slightly offset.
- Each note sits a little rotated, between -1.5 and 1.5 degrees, and the angles differ between notes.
- A piece of washi tape holds each note at the top edge, in a different pattern per note.

## 4. Washi tape

Eight patterns in `tokens.json` under `washi.patterns`: stripes in pink, yellow, mint and blue, plus dots, blocks, triangles and gingham. Tape is semi-transparent, 22 px tall, rotated a few degrees. It's only used at the edges of notes, polaroids and paper, never as a divider in the middle of content.

## 5. Stickers are the buttons

- Buttons are hand-cut stickers: a thick white border (4 px, or 3 px for small ones), uneven corners, and a soft lift shadow (`shadow.sticker`). This is Nora's pick.
- **Primary:** hero pink with white text. **Secondary:** paper color with ink text. **Disabled:** `sticker.disabled`.
- **People:** violet `#8466B8` with white text (`sticker.people`). Violet is the second hero color, used only for people: inviting someone and joining a household.
- **The round add button** is a hand-cut blob, 62 px, primary pink, rotated about -4 degrees, with the plus drawn as a 3.2 px line.
- **Shape:** the uneven corners are elliptical radii (see `sticker.handCutRadius`), written as CSS `border-radius`.
- **Pressed state:** not designed yet. For now, flatten the shadow and move the sticker down 2 px.
- **Each sticker sits slightly rotated,** about 1 to 2 degrees.

## 6. Stamps are labels, never buttons

- Stamps say things like "Bought" and "Nora's pick". Uppercase Nunito 800, 11 px, a 2 px border in the same color, and a 5 px radius.
- They're masked with `assets/stamp-grunge.png` (300 px tile), with a different offset per stamp, so the ink looks patchy.
- Each stamp is a little rotated.

## 7. Checkboxes and checks

- A box is 22 px with a 2 px ink border and a 5 px radius, and is slightly rotated per row.
- The check is drawn by hand. Use this path in a 28 x 28 viewBox, stroke `#D34471`, 2.5 px, round caps:
  `M5 15.5 C7 17, 9 19.8, 10.6 22.4 C13.5 15, 17.5 9, 24 3.5`
- It overflows the box toward the top right, like a real pen mark.
- Ticked shopping items get a hero-pink strikethrough, 2 px.
- Nora wants to improve the check later. Keep it isolated in one component.

## 8. Avatars

- Each avatar is a character with a face: an object, an animal or food (onigiri, lemon, mug...). It sits on a pastel circle.
- Sizes: 34 px in rows, 40 px in the header.
- They look like stickers: a 2 px white edge and a small shadow (`shadow.avatar`).
- **Lines are 2 px in rows and headers** (avatars under 80 px). The line weight doesn't scale there, so avatars, checkboxes and icons all match. Nora asked for this.
- **Big avatars (80 px and up, like the avatar builder)** use one consistent, thinner line weight that scales with the drawing, and are inked like the headlines: the dry-ink brush on the edges and the patchy ink mask, so lines are 50 to 100% opaque in patches. Every line, including the extras, has the same weight. Nora asked for this in October 2026.
- Faded (60% opacity) on bought or done items.
- The avatar builder (WF14) is a carousel: Character, then Color, then Accessory.

## 9. Pichi

- **Pichi is Nora's painted goose in a scarf** (`assets/pichi-painted.jpg`). Never redraw her. Nora will provide more poses.
- **On home** she sits in a postage stamp frame: white, with perforated edges and a 2 px ink border around the picture. The stamp is rotated about -5 degrees.
- **Next to her** is a white speech bubble with corners `radius.speechBubble`, holding a hand greeting ("hi Nora!") in hero dark, then the news in body text.

## 10. Icons, inputs and the tab bar

These stay **clean on purpose,** so anything you tap or type into reads right away. The scrapbook feel lives in the paper, notes, tape and ink.

- **Icons:** simple line icons, 26 px, 2 px stroke, round caps.
- **Tab bar:** a paper strip, 84 px tall, with a soft shadow on top. The active tab is hero dark, with a small pink washi strip behind its icon.
- **Inputs:** white with a 2 px lilac edge, slightly uneven corners (`radius.input`), and placeholder text in `ink.faint`.

## 11. Motion

- **Picking up a note** when arranging home: it lifts, rotates about -3 degrees, moves a few px, and its shadow becomes soft and deep (`shadow.noteLifted`). Nora loves this one, so keep it exactly like this.
- **Ticking a check:** draw the stroke on, quickly. Claude's suggestion, not designed yet.

## 12. Copy and language

- **English by default, with a Serbian switch.** All interface text goes through translation files from day one. Nothing is hard-coded.
- **Household addresses are always English words.**
- **No em dashes anywhere** in the interface. American spelling.
- **Copy from Nora is used word for word.** Draft any other copy and mark it for her review.

## 13. Not yet (don't build)

- Dark mode, which will be dark paper.
- Themes: done as a theme color in Settings (Pink, Blue, Green, Orange), saved per person in `profiles.theme`. The hero color, its dark, the margin line and the active tab follow it; errors stay pink-red and violet stays the people color in every theme.
- Sticky-note colors per person.
- The pressed state for stickers.
- Doodles in the margin.
