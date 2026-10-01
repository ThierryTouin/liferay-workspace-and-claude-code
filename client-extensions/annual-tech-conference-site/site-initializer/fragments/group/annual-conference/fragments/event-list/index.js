const root = fragmentElement.querySelector('.conference-event-list-wrapper');
const listElement = fragmentElement.querySelector('[data-event-list]');
const statusElement = fragmentElement.querySelector('[data-event-status]');

const ctaLabel = root.getAttribute('data-cta-label') || 'Reserve a seat';
const maxItems = parseInt(root.getAttribute('data-max-items'), 10) || 50;
const upcomingOnly = root.getAttribute('data-upcoming-only') !== 'false';

const pad = (value) => String(value).padStart(2, '0');

const MONTHS = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
];

// Events are stored as UTC and that value IS the venue's wall clock time, so read
// it back with the UTC getters rather than shifting it into the visitor's zone.

const formatDay = (date) =>
	`${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;

const formatTime = (date) =>
	`${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;

const formatWhen = (startsAt, endsAt) => {
	const start = new Date(startsAt);
	const end = new Date(endsAt);

	if (start.toUTCString().slice(0, 16) === end.toUTCString().slice(0, 16)) {
		return `${formatDay(start)}, ${formatTime(start)}–${formatTime(end)}`;
	}

	return `${formatDay(start)} ${formatTime(start)} – ${formatDay(end)} ${formatTime(end)}`;
};

const describeSeats = (event) => {
	const capacity = parseInt(event.capacity, 10) || 0;

	// Without the signupCount aggregation there is no honest remaining figure, so
	// report the capacity rather than a subtraction against an assumed zero.

	if (event.signupCount === undefined || event.signupCount === null) {
		return {modifier: 'unknown', text: `${capacity} places in total`};
	}

	// Aggregation fields serialize as strings, so parse before subtracting.

	const taken = parseInt(event.signupCount, 10) || 0;
	const left = Math.max(capacity - taken, 0);

	if (!left) {
		return {modifier: 'full', text: `Fully booked (${capacity} places)`};
	}

	return {
		modifier: left <= Math.max(capacity * 0.1, 1) ? 'low' : 'normal',
		text: `${left} of ${capacity} places left`,
	};
};

const appendMeta = (list, term, description, className) => {
	const dt = document.createElement('dt');
	const dd = document.createElement('dd');

	dt.textContent = term;
	dd.textContent = description;

	if (className) {
		dd.className = className;
	}

	list.appendChild(dt);
	list.appendChild(dd);
};

const buildCard = (event) => {
	const card = document.createElement('article');
	const title = document.createElement('h3');
	const description = document.createElement('p');
	const meta = document.createElement('dl');
	const cta = document.createElement('a');
	const seats = describeSeats(event);

	card.className = 'conference-event-card';
	title.className = 'conference-event-card__title';
	description.className = 'conference-event-card__description';
	meta.className = 'conference-event-card__meta';
	cta.className = 'conference-event-cta';

	title.textContent = event.eventName;
	description.textContent = event.description;

	appendMeta(meta, 'When', formatWhen(event.startsAt, event.endsAt));
	appendMeta(meta, 'Where', event.venue);

	const seatsGroup = document.createElement('div');

	seatsGroup.className = 'conference-event-card__seats-group';
	appendMeta(
		seatsGroup,
		seats.modifier === 'unknown' ? 'Capacity' : 'Places left',
		seats.text,
		`conference-event-card__seats conference-event-card__seats--${seats.modifier}`
	);

	// The grouped dt/dd pair lets the "show places remaining" toggle hide both at once.

	meta.appendChild(seatsGroup);

	cta.textContent = seats.modifier === 'full' ? 'Join the waiting list' : ctaLabel;
	cta.href = `register?eventId=${encodeURIComponent(event.id)}`;

	card.appendChild(title);
	card.appendChild(description);
	card.appendChild(meta);
	card.appendChild(cta);

	return card;
};

const render = (events) => {
	listElement.textContent = '';

	events.forEach((event) => listElement.appendChild(buildCard(event)));

	statusElement.hidden = true;
};

Liferay.Util.fetch('/o/c/events?pageSize=200&sort=startsAt:asc')
	.then((response) => {
		if (!response.ok) {
			throw new Error('Unable to load events');
		}

		return response.json();
	})
	.then((data) => {
		const now = Date.now();

		// OData filters reject Date/DateTime comparisons, so filter here instead.

		const events = (data.items || [])
			.filter((event) => !upcomingOnly || new Date(event.endsAt).getTime() >= now)
			.slice(0, maxItems);

		if (!events.length) {
			statusElement.textContent = 'New sessions are being announced soon.';

			return;
		}

		render(events);
	})
	.catch(() => {
		statusElement.textContent = 'We could not load the programme right now.';
	});