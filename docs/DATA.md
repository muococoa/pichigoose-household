# Pichigoose: data plan

This file describes what the app stores and who can see it. The backend is Supabase (Postgres, Auth, Realtime, Storage). Everything in the database is in English, including household addresses. Only the interface text switches to Serbian.

Story ids (A1, S2, M4...) point to the user stories in PRODUCT.md.

Labels used below:
- **[Nora]** decided by Nora.
- **[Claude]** a proposal from Claude. Fine to change, but ask Nora before changing it.

---

## 1. The big picture

```
profiles ──< household_members >── households ──< lists ──< list_items
                                        │
                                        ├──< todos
                                        └──< notes

profiles ──< money_people ──< money_entries        (money is personal, not per household)
profiles ──< notifications
profiles ──< push_tokens
```

- A person can be in many households (A3): their own, their dad's, their mom's.
- Shopping lists, to-dos and notes belong to a household.
- Money belongs to a person, never to a household (M3). The other person doesn't need the app.
- An event is a household with `kind = 'event'` (E1). It reuses everything, but the app shows it in a simpler way.

---

## 2. Tables

### profiles
One row per signed-up person. Created right after sign up (A1).

| column | type | notes |
|---|---|---|
| id | uuid, primary key | same as `auth.users.id` |
| display_name | text | the name others see, like "Nora" |
| avatar | jsonb | `{ "character": "onigiri", "color": "blush", "accessory": null }` (A8). The ids come from a fixed set in the app |
| language | text | `'en'` or `'sr'`, default `'en'` (A4) [Nora] |
| theme | text | default `'pichigoose'` (A10). More themes later |
| track_money | boolean | default `true`. When `false`, the money tab and the money card on home are hidden for this person [Nora] |
| created_at | timestamptz | |

### households
A home, or an event (temporary household).

| column | type | notes |
|---|---|---|
| id | uuid, primary key | |
| name | text | the name given when created, like "Our home" |
| address | text, unique | three random English words joined by dots, like `lemon.sunny.goose` (A9) [Nora] |
| secret | text | the household's secret password [Nora]. Joining by typing the address needs it ("Knock knock!"); email invites skip it; join links carry it. Members can see and change it. |
| kind | text | `'home'` or `'event'` (E1) |
| event_date | date, nullable | events only |
| archived_at | timestamptz, nullable | events archive themselves after the date (E3) [Claude] |
| created_by | uuid, references profiles | |
| created_at | timestamptz | |

**Address rules [Nora, details Claude]**
- Three words from one fixed English word list kept in the app's code. Short, friendly words only, nothing rude, no words that look alike.
- Created by a database function: pick three words, try to insert, and if the address is taken, pick again. The unique constraint is the final guard.
- Also works as a link: `pichigoose.com/join/lemon.sunny.goose/<secret password>`. The link carries the password, so whoever gets it can join with one tap.
- People type it with dots, spaces or dashes. The app cleans it up before looking it up.

### household_members
Who belongs to which household, plus each person's own settings for that household.

| column | type | notes |
|---|---|---|
| household_id | uuid, references households | primary key together with user_id |
| user_id | uuid, references profiles | |
| label | text, nullable | what this person calls the household, set with Rename in My households. Joining leaves it empty (Nora: the person joining doesn't name the household). If empty, the app shows `households.name` |
| home_layout | jsonb | this person's own home order (A11): `[{ "section": "todos", "visible": true }, { "section": "shopping", "visible": true }, ...]` [Nora] |
| joined_at | timestamptz | |

- Leaving a household deletes this row (A7). When the last member leaves, the household and everything in it is deleted [Claude].
- Default `home_layout` order: Pichi's news, shopping, to-dos, money, notes.
- Decided by Nora: the household name is shared, and the person who joins doesn't name it. `label` stays as a personal rename from My households.

### lists
Shopping lists inside a household, like Groceries and Pharmacy (S4).

| column | type | notes |
|---|---|---|
| id | uuid, primary key | |
| household_id | uuid, references households | |
| name | text | |
| position | int | order of the list tabs |
| created_by | uuid, references profiles | |
| created_at | timestamptz | |

A new household gets one list called "Groceries" [Claude].

### list_items
The things to buy (S1, S2, S3).

| column | type | notes |
|---|---|---|
| id | uuid, primary key | |
| list_id | uuid, references lists | |
| name | text | "rice" |
| note | text, nullable | "the big bag" [Claude] |
| added_by | uuid, references profiles | shown as the avatar and "added by Danko" (S3) |
| created_at | timestamptz | shown as "2 hours ago" |
| checked_by | uuid, nullable | who bought it (S2) |
| checked_at | timestamptz, nullable | when set, the item moves to "Bought" |
| position | int | order on the list |

- Bought items stay visible under "Bought" so people can undo, then disappear after a while [Claude: after 24 hours].
- Realtime is on for this table, so a list updates live while someone is in the store (X2).

### todos
Shared chores (T1 to T4).

| column | type | notes |
|---|---|---|
| id | uuid, primary key | |
| household_id | uuid, references households | |
| title | text | "Take out the trash" |
| assignee_id | uuid, nullable | (T2) |
| due_date | date, nullable | (T3) |
| repeat | text, nullable | `'daily'`, `'weekly'`, `'monthly'`, or null (T4) [Claude: simple repeats only in version 1] |
| done_at | timestamptz, nullable | |
| done_by | uuid, nullable | |
| created_by | uuid, references profiles | |
| created_at | timestamptz | |

When a repeating to-do is ticked off, the app sets `done_at` and creates the next one with the new due date [Claude].

### notes
Shared household info (N1, N2).

| column | type | notes |
|---|---|---|
| id | uuid, primary key | |
| household_id | uuid, references households | |
| title | text | |
| body | text | plain text in version 1 |
| pinned | boolean | pinned notes stay on top (N2) |
| created_by | uuid | |
| updated_by | uuid | |
| updated_at | timestamptz | |

### comments
A short conversation under a shopping item, to-do or note [Nora]. Flat, like a chat.

| column | type | notes |
|---|---|---|
| id | uuid, primary key | |
| household_id | uuid, references households | always taken from the thing commented on, by a database trigger |
| item_id / todo_id / note_id | uuid, one of them | exactly one is set; deleting the thing deletes its comments |
| author_id | uuid, references profiles | must be the person writing it |
| body | text | 1 to 2000 characters |
| created_at | timestamptz | |

Everyone in the household can read and write comments; people can delete only their own. Live updates on.

### messages
Chat, like WhatsApp [Nora]: each household has one group chat for everyone, and each pair of people in it has a private chat.

| column | type | notes |
|---|---|---|
| id | uuid, primary key | |
| household_id | uuid, references households | |
| author_id | uuid, references profiles | must be the person writing it |
| to_user | uuid, nullable | empty: the household's group chat. Set: a private message to that person (who must be in the household) |
| body | text | 1 to 4000 characters |
| created_at | timestamptz | |

Group messages: everyone in the household reads them. Private ones: only the two people. You can delete your own. Live updates on.

### chat_reads
Where each person stopped reading each chat, for the unread counts. Only you see your own.

| column | type | notes |
|---|---|---|
| user_id, household_id, chat | primary key | chat is `household` or the other person's id |
| read_at | timestamptz | set by `mark_chat_read(hid, chat)` while the chat is open |

### money_people
The people someone has money with (M1 to M3). They don't need the app.

| column | type | notes |
|---|---|---|
| id | uuid, primary key | |
| owner_id | uuid, references profiles | whose list this is |
| name | text | "Dad", "Bane" |
| linked_user_id | uuid, nullable | set when that person has the app and accepts the link (M7) |
| created_at | timestamptz | |

**Linking [Claude]:** the owner shares a link from that person's page. If the other person opens it in the app and accepts, `linked_user_id` is set. From then on they see the same debt from their side, read only.

### money_entries
Each debt and each payback (M1, M2, M4, M5).

| column | type | notes |
|---|---|---|
| id | uuid, primary key | |
| person_id | uuid, references money_people | |
| owner_id | uuid, references profiles | |
| direction | text | `'i_owe'` or `'owes_me'` |
| kind | text | `'debt'` or `'payback'` |
| amount | numeric(12,2) | always positive |
| currency | text | `'RSD'` in version 1 (M6) |
| note | text, nullable | "for the car repair" |
| happened_on | date | |
| created_at | timestamptz | |

- The balance is calculated, never stored: debts minus paybacks, per person and direction.
- The history per person (M5) is just these rows in date order.
- Version 1 is only "who owes who" [Nora]. Budgeting and household money modes are version 2 and get their own tables then.

### notifications
What Pichi brings (P3, P4, X1).

| column | type | notes |
|---|---|---|
| id | uuid, primary key | |
| user_id | uuid, references profiles | who receives it |
| household_id | uuid, nullable | |
| kind | text | `'item_added'`, `'list_done'`, `'todo_assigned'`, `'debt_nudge'`... |
| payload | jsonb | `{ "actor": "Danko", "item": "rice" }`. The app turns this into the sentence in the current language, so texts are never stored in one language |
| read_at | timestamptz, nullable | |
| created_at | timestamptz | |

The Pichi bubble on home shows the newest unread one.

### push_tokens
| column | type | notes |
|---|---|---|
| user_id | uuid, references profiles | |
| subscription | jsonb | the browser's Web Push subscription |
| platform | text | `'ios'`, `'android'` or `'desktop'` |
| updated_at | timestamptz | |

---

## 3. Who can see and change what (Row Level Security)

Turn on Row Level Security for every table. The rules:

- **Households, lists, list_items, todos, notes:** any member of the household can read, add, change and delete everything (A5) [Nora]. A helper function `is_member(household_id)` keeps the rules short.
- **household_members:** members can see who else is in their households. People can only change or delete their own row (their label, their home order, leaving).
- **Joining:** someone who isn't a member yet can't read a household. Joining goes through a database function `join_household(address, label)` that checks the address and adds the member.
- **profiles:** people can edit only their own. They can see the name and avatar of anyone they share a household with.
- **money_people and money_entries:** only the owner, plus the linked person (read only).
- **notifications and push_tokens:** only the person they belong to.

---

## 4. Things to build in from day one [Claude]

- **Installable on the home screen (PWA).** On iPhone, push notifications only work after "Add to Home Screen", so the app should guide people to do that.
- **Works offline in the store.** Signal is often bad in shops. Ticking items off and adding items must work offline and sync when the phone is back online.
- **Realtime** on `list_items` and `todos`, so changes show up without refreshing.
- **All times stored in UTC.** The app shows them in the phone's time zone.
- **No interface text in the database.** Words like "Groceries" for the first list are created in the person's language at the moment the household is made. Notifications store data, not sentences.

---

## 5. Later, not in version 1

- **Subscriptions** ($2.22 a month or $13.32 a year, one person pays for the household) [Nora]. Will need a `subscriptions` table tied to the household.
- **Budgeting and household money modes** (share everything, or track who pays).
- **Themes beyond the default**, dark mode, and the sticky-note color per person.
- **Store apps:** wrap the same web app with Capacitor for the App Store and Google Play, once it's tested and paid for ($99 a year Apple, $25 once Google).
- **Apple Watch** quick-add, possible after the Capacitor wrap.
