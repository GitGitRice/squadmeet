# SquadMeet

A map of free public places for activities (table tennis, basketball and similar). Adults use it
to meet new people: they say when they will be at a place, and others join them. The UI is
German; the German UI word is in brackets.

## Places

**Place** (Platz):
A public, free location where one Activity type can be done, for example one table tennis table.
_Avoid_: Ort, spot, location, venue

**Activity type** (Aktivität):
The kind of activity a Place is for: table tennis, basketball, football pitch, beach volleyball,
outdoor fitness.
_Avoid_: sport, category

**Place suggestion** (Platzvorschlag):
A Place that a user added and that is not yet confirmed. It becomes an active Place when 3 different
users confirm it at the Place; the user who suggested it counts as one of the 3.
_Avoid_: draft, new place

**Confirmation** (Bestätigung):
A user's statement, made at the Place, that a Place suggestion is real.
_Avoid_: vote, verification

**Locked place** (gesperrter Platz):
A Place that an Admin marked as not publicly accessible. It is not on the map, and its future
Meetups are cancelled. An Admin can unlock it.
_Avoid_: closed, hidden, disabled

## Meetups

**Meetup** (Treffen):
A user's announcement that they (alone or with a Party) will be at a Place from a start time.
A Meetup can start now or later.
_Avoid_: event, check-in, appointment, Termin

**Host** (Gastgeber):
The one user who can edit and Cancel a Meetup. First the creator; when the Host Leaves, the role
passes to the user who joined earliest.
_Avoid_: owner, organizer, creator

**Cancel** (absagen):
The Host ends a Meetup for everyone.
_Avoid_: delete, close

**Leave** (verlassen):
A user takes back their own Join. A Host can Leave instead of Cancel when others have joined.
_Avoid_: unjoin, cancel

**Closed** (geschlossen):
The state of a Meetup that has no users left after everyone Left.
_Avoid_: cancelled, ended

**Now-meetup** ("Ich bin jetzt hier"):
A Meetup that starts at the moment it is created and ends automatically after 1–4 hours (the Host
chooses; default 2). The Host can end it early.
_Avoid_: check-in, presence

**Series** (Serie):
A weekly repeating set of Meetups at one Place, on one or more weekdays, each with its own time.
_Avoid_: recurring event

**Occurrence** (Termin einer Serie):
One date of a Series. Users join Occurrences, not the Series itself.
_Avoid_: instance

**Join** ("Ich komme mit"):
A user's statement that they will come to one Occurrence or Meetup, with a Party size.
_Avoid_: RSVP, attendance, registration

**Party size** (Personenzahl):
The number of people a user brings, including themselves (1–10). Extra people need no account.
_Avoid_: group, guests

## Ratings

**Rating** (Bewertung):
A user's 1–5 star judgement of a Place, with at least one Reason. One per user per Place.
_Avoid_: review, comment

**Reason** (Begründung):
A predefined text block that explains a Rating, positive or negative. Users cannot write free text.
_Avoid_: comment, tag

**Condition** (Zustand):
The state of a Place, derived from the negative Reasons in recent Ratings that name a problem the
city or the operator must fix (broken or missing equipment, litter, broken glass, standing water).
Negative Reasons such as "Oft überfüllt" do not change it. An issue that nobody confirmed for
two months stays, and users are asked "Ist das noch so?"; three "still there" confirm it for two
more months. Three "fixed", which users can say at any time, end it.
_Avoid_: status, quality

**Photo** (Foto):
A picture of a Place uploaded by a user. It is visible only after an Admin approves it.
_Avoid_: image, upload

## People

**Nickname**:
The only name other users see, and the login name. Unique.
_Avoid_: username, display name

**Recovery code** (Wiederherstellungscode):
A one-time code shown at registration that lets a user reset a forgotten password, or log in
without the authenticator app when MFA is on.
_Avoid_: backup code, reset link

**Avatar**:
A profile picture chosen from a predefined set. Users cannot upload their own.
_Avoid_: profile photo

**Contact** (Kontakt):
Another user that both sides agreed to connect with.
_Avoid_: friend, follower, connection

**Contact request** (Kontaktanfrage):
A request to become a Contact. The other user must accept it.
_Avoid_: friend request, invite

**Block** (Blockieren):
A user's choice to stop all requests from another user and hide their own Meetups from them.
_Avoid_: mute, report

**Admin**:
A team member who moderates Photos and can lock or delete Places.
_Avoid_: moderator, owner

## Notifications

**Home area** (Heimatbereich):
A point and a radius that a user sets. The user gets Notifications for new Meetups inside it.
_Avoid_: location, current position, radius

**Favorite** (Favorit):
A Place a user marks to get Notifications about it at any distance.
_Avoid_: bookmark, saved place

**Time rule** (Zeitfenster):
Weekdays plus a time range on a Favorite. A Notification goes out only for Meetups that start
inside a Time rule. A Favorite without Time rules notifies always.
_Avoid_: schedule, filter

**Notification** (Benachrichtigung):
A message about a Meetup, sent as push and kept in the in-app list.
_Avoid_: alert, pop-up, message
