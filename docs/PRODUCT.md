# Pichigoose: product

## What it is

Planning your household with the people you live with, so everyone stays organized. Especially shopping: whenever you need something, you add it, and next time you're at the store the list is already with you.

**Pichigoose** is Nora's umbrella brand, and this household app is its first app. The mascot is Pichi, Nora's painted goose in a scarf.

## Who it's for

- **Anyone can sign up.**
- **The first users are three households:** Nora and Danko's, Nora's dad's, and Nora's mom's. One person can belong to several households.
- **Phones first, iPhone and Android.**

## Decisions

| | |
|---|---|
| Name | Pichigoose |
| Platform | Web app first, free to test on iPhone and Android and installable on the home screen. Supabase backend. Wrapped with Capacitor for the app stores later |
| Language | English by default, Serbian switch. Household addresses and the backend are always English |
| Joining | Like adding a Minecraft server: join with two fields (what you call it, and the address), or create a new household |
| Address | Three random English words, unique, shareable as a link, like `lemon.sunny.goose` |
| Permissions | Everyone in a household can edit everything |
| Money in version 1 | Only "who owes who". Personal, tied to the profile, never to a household. Each person can turn money off |
| Navigation in version 1 | Home, Shopping, To-dos, Notes, Money |
| Home | Each member arranges their own home, like to-dos first for Nora and shopping first for Danko |
| Pantry | Lives on Home as one note per room, not in the bottom menu. Rooms (Kitchen, Bathroom, any more) each hold storage spots. Pichi puts things on the list when they run low [Nora] |
| Price, later | $2.22 a month or $13.32 a year. One person pays for the household, everyone they invite joins free. Not in the first builds |

---

## User stories

Stories marked **[Nora]** come from Nora. Stories marked **[Claude]** are Claude's proposals that Nora accepted for the plan.

### Account and households
- **A1** As anyone, I want to sign up, so that I can use the app. [Nora]
- **A2** As a new user, I want to join or create a household right after signing up. [Nora]
- **A3** As someone in several households, like my own, my dad's and my mom's, I want to belong to all of them, so each home has its own lists. [Nora]
- **A4** As a user, I want the app in English by default with a Serbian switch, so everyone can use the language they prefer. [Nora]
- **A5** As a member, I want to edit anything in the household, so no one has to ask. [Nora]
- **A6** As a member of several households, I want to switch between them quickly. [Claude]
- **A7** As a member, I want to leave a household I no longer share. [Claude]
- **A8** As a member, I want to build my own avatar: an object, animal or food with a face, then body, color and accessories. [Nora]
- **A9** As someone creating a household, I want a fun three-word address no other household has, so it's easy to share. [Nora]
- **A10** As a user, I want to pick my own theme, so the app doesn't have to be pink if I'm not into pink. [Nora] *(later)*
- **A11** As a member, I want to arrange my own home screen, so what I do most is on top. Like to-dos first for me, shopping first for Danko. [Nora]
- **A12** As a user, I want to turn money off in my profile, so I can use the app only for the household. [Nora]
- **A13** As a member, I want a broom on Arrange your home for a fresh start: it clears shopping lists, to-dos, notes, shelves and comments, but keeps the chat and the people. It asks first. [Nora]
- **A14** As the person who created a household (its admin), I want to delete it from its menu, in a red danger zone below a line, after typing its name. I can't leave it; everyone else can leave but not delete. [Nora]

### Shopping lists
- **S1** As a member, I want a shared shopping list, so anyone can add what's needed. Like my sister telling my dad what to buy. [Nora]
- **S2** As a member in the store, I want to tick items off, so others see what's bought. [Claude]
- **S3** As a member, I want to see who added an item. [Claude]
- **S4** As a member, I want more than one list, like groceries and pharmacy. [Claude]

### To-dos
- **T1** As a member, I want shared to-dos, so chores don't live in one person's head. [Nora]
- **T2** As a member, I want to assign a to-do to someone. [Claude]
- **T3** As a member, I want due dates on to-dos. [Claude]
- **T4** As a member, I want repeating to-dos, like taking out the trash. [Claude]

### Notes
- **N1** As a member, I want shared notes, so household info lives in one place. [Nora]
- **N2** As a member, I want to pin a note, like the Wi-Fi password, so it stays on top. [Claude]

### Pantry
- **K1** As a member, I want a drawn pantry, shelves with jars, bottles and boxes and a little label under each, so I can see at a glance what we have at home. [Nora]
- **K2** As a member, I want a bathroom cabinet too, for cleaning supplies, cosmetics and skincare. [Nora]
- **K3** As a member, I want to mark how full something is, like Danko's oats at 10%, with gel pen colors showing the level. [Nora]
- **K4** As a member, I want Pichi to put something on the shopping list by herself when it runs low, with a note saying how much is left, like "only 20% left". [Nora]
- **K5** As a member, I want buying it on the list to fill it back up in the pantry. [Claude]
- **K6** As a member, I want to choose at what level Pichi adds it, and which list it goes on. [Claude]
- **K7** As a member, I want several of the same thing, like four bottles of wine or my 60 g oat bags, grouped as one, each with its own level, so Pichi only adds it when we're on the last one and it's almost out. [Nora]
- **K8** As a member, I want finishing one to be a single tap, and empty ones to disappear from the shelf, because we toss them. [Nora]
- **K9** As a member, I want to type my own percentage, not only full, 75%, half, 25% or almost out. [Nora]
- **K11** As a member, I want my own rooms and storage spots in them, like a second cabinet or a bathtub shelf, and to move a thing from one spot to another, like fabric softener from the bathroom cabinet to the pantry. [Danko]
- **K10** As a member, I want a broom in the corner for a deep clean that empties the pantry (or the bathroom cabinet) after asking, because it can't be undone. [Nora]

### Money (who owes who)
- **M1** As a user, I want to track how much I owe someone, like my dad, so I know what's left to pay back. [Nora]
- **M2** As a user, I want to track how much someone owes me, like Bane, so I don't forget to remind them. [Nora]
- **M3** As a user, I want debts tied to my profile, not a household, so my brother can owe me without me joining his household. [Nora]
- **M4** As a user, I want to log a partial payback, so the amount goes down step by step. [Claude]
- **M5** As a user, I want a history per person, so I can see where a number came from. [Claude]
- **M6** As a user, I want amounts in RSD. [Claude]
- **M7** As someone who owes, if I have the app, I want to see what I owe. [Nora]
- **M8** As a user, I want Pichi to nudge about unpaid debts, so I don't have to. [Nora]

### Notifications
- **X1** As a member, I want push notifications on my phone. [Nora]
- **X2** As a member, I want to know when someone adds to a list I'm shopping from. [Claude]

### Pichi
- **P1** As a member, I want Pichi to be cute and say hi on the home screen. [Nora]
- **P2** As a member, I want Pichi to react when something happens, like a finished list. [Claude]
- **P3** As a member, I want Pichi to bring my notifications, like "Danko says we're low on rice". [Nora]
- **P4** As a user, I want Pichi to nudge me about unpaid debts. [Nora]

### Events
A temporary household for something people from different homes do together, like a picnic with my dad, my sister and Danko. A simpler version of a household. [Nora]
- **E1** As a member, I want to create an event that works like a temporary household, so people from different homes can plan it together. [Nora]
- **E2** As an event member, I want a shared shopping list for the event. [Nora]
- **E3** As an event member, I want the event to end or archive itself after the date. [Claude]

---

## Screens

| Screen | Image | Stories |
|---|---|---|
| Sign up | wireframes/WF1-SignUp.png | A1, A4 |
| Join or create | wireframes/WF2-JoinOrCreate.png | A2, A3, A9 |
| Household created | wireframes/WF12-HouseholdCreated.png | A2, A9 |
| Home | **hifi/01-home.png** (wireframe WF3) | A3, A6, P1, P3 |
| Arrange your home | **hifi/02-arrange-home.png** | A11 |
| Shopping list | **hifi/03-shopping.png** (wireframe WF4) | S1 to S4 |
| To-dos | wireframes/WF5-Todos.png | T1 to T4 |
| Add a to-do | wireframes/WF6-AddTodo.png | T2 to T4 |
| Pantry | no design yet: placeholder ink drawings until Nora draws the containers | K1 to K11 |
| Notes | wireframes/WF7-Notes.png | N1, N2 |
| A note | wireframes/WF8-Note.png | A5, N2 |
| Money | wireframes/WF9-Money.png | M1 to M3, M7 |
| One person's money | wireframes/WF10-Person.png | M4, M5, M8 |
| Add a debt or payback | wireframes/WF11-AddMoney.png | M1, M2, M4, M6 |
| My households | wireframes/WF13-MyHouseholds.png | A3, A6, A7, E1 |
| Profile and avatar | wireframes/WF14-Avatar.png, WF14b-AvatarColor.png | A8 |
| Settings | wireframes/WF15-Settings.png | A4, A10, A12, X1 |
| An event | wireframes/WF16-Event.png | E1 to E3 |
| Create an event | wireframes/WF17-CreateEvent.png | E1 |
| Notifications | wireframes/WF18-Notifications.png | P3, P4, X1, X2 |

**Desktop:** every screen also has a desktop layout. See DESKTOP.md and `screens/desktop/`.

**Notes on the screens:**
- The wireframes have Serbian placeholder copy. Build in English, with Serbian through the language switch.
- The money toggle (A12) came after the wireframes. Add it to Settings: "Track money", on by default.
- In the wireframes, the home screen shows a row of household chips. The hi-fi home replaces them with a switcher on the household name (the arrow next to "Our home").
- **Still to design:**
  - "You'll lose your changes" pop-ups.
  - Empty states (an empty list, no households yet). Pichi goes here.
  - Loading and error states.
  Keep these simple and in the same style, and show them to Nora.

---

## Build phases

1. **Core.** Sign up, join or create, household created, my households, the shopping list (offline friendly, live updates). Usable in the store.
2. **Home and household.** Home, arrange your home, to-dos, add a to-do, notes, a note, profile and avatar, settings.
3. **Money.** Who owes who, one person, add a debt or payback, linking a person who has the app, the money toggle.
4. **Everything else.** Events, notifications and push, Pichi's nudges.

Each phase ends with Nora testing it on her phone.

## Open questions (don't decide these, ask Nora)

- Events: how simple is "simpler than a household"?
- Themes: which colors, and does Pichi's scarf change too?
- Joining: is the name you give a household only yours, or shared with everyone?
- Money in version 2: personal budgeting, and how a household shares money (share everything, or track who pays).

## Ideas parked for later [Nora, 29 Oct]
- ~~**The "Looks like" picker**~~ built 29 Oct: one row of recommended drawings plus "All", which opens a drawer (Recommended, a thin line, then every drawing).


### Trophies, recaps and rewards [Danko and Nora, 29 Oct]
Later, after the bugs are fixed and the app is in production. Plan it first, then build and test it locally; nothing goes to main until it's approved.

- **Trophies for the chores people really do:** most dishes washed, laundry washed, laundry dried, grocery runs, and so on. Each trophy gets a unique, funny name, ideally rhyming (like "Magic Dishwasher"), and a little drawing in our scrapbook style.
- **Ranks inside one trophy:** gold, silver and bronze for the same chore, so the person who came second still gets something. Trophies can level up over time (Discord's Nitro badges are the reference).
- **Monthly recap:** each month, a ranked list of who did what, like "employee of the month". It's most fun in bigger households.
- **Year in the home:** at the end of the year, a recap of every month and every trophy, to look back on. Old trophies stay in a case on your profile (nonogram.com's badge collection is the reference).
- **Points and rewards for children:** in households with kids, a to-do can be worth points, and points can be swapped for rewards the parents set up.

Decided (Danko and Nora, 29 Oct):
- **Rankings:** no opting out per person; these are people who love each other. A household can turn trophies off altogether, in its settings.
- **Two people:** simpler, with no gold and silver. Just "who did the most dishes this month", "who did the most grocery shopping this month", and so on.
- **Children:** they get their own accounts. Children without a phone (a parent ticks for them) is shelved for later.
- **Points:** the app gives them automatically when a to-do is done. No approving.
- **Where trophies live:** on the profile. Only the big ones go in the "Our home" hub, like "number one dishwasher three months in a row", not every monthly win.
- **Names:** placeholders for now. Claude suggests, Nora improves. Funny, easy to remember, ideally rhyming.

Still open:
1. **Chore types.** Claude's recommendation: a short fixed list (dishes, laundry, hanging laundry, ironing, groceries, trash, cleaning, cooking, plants), and Pichi guesses the type from the to-do's title in English and Serbian ("sudovi", "veš", "prodavnica"...). You can change her guess, or leave a to-do without a type.

Placeholder trophy names (Claude's, for Nora to improve):
- Dishes: **Dish Whiz** · three months in a row: **Captain Clean Plate**
- Laundry: **Sock Whisperer** · three months: **Spin Cycle Legend**
- Hanging laundry: **Peg Legend**
- Ironing: **Wrinkle Wrangler**
- Groceries: **Cart Smart** · three months: **Aisle Style Icon**
- Trash: **Trash Panda**
- Cleaning: **Dust Buster** · mopping: **Mop Top**
- Cooking: **Pan Fan**
- Plants: **Leaf Chief**

What it builds on: to-dos already record who finished them and when (`done_by`, `done_at`), so past months can be counted. It will need a chore type on to-dos, a table for trophies won each month, and for children, points and rewards tables. Ask before changing the database.
