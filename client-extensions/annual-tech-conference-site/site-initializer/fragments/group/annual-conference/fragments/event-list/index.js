const listElement = fragmentElement.querySelector('[data-event-list]');
const statusElement = fragmentElement.querySelector('[data-event-status]');

const formatDate = (value) => {
	const date = new Date(value);
	const datePart = date.toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'short',
	});
	const timePart = `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;

	return `${datePart}, ${timePart}`;
};

Liferay.Util.fetch('/o/c/events?pageSize=50&sort=startsAt:asc')
	.then((response) => {
		if (!response.ok) {
			throw new Error('Unable to load events');
		}

		return response.json();
	})
	.then((data) => {
		if (!data.items.length) {
			statusElement.textContent = 'New sessions are being announced soon.';
			return;
		}

		listElement.innerHTML = data.items.map((event) => `
			<article class="conference-event-card">
				<h3>${Liferay.Util.escapeHTML(event.eventName)}</h3>
				<p>${Liferay.Util.escapeHTML(event.description)}</p>
				<div class="conference-event-meta">
					<div>${formatDate(event.startsAt)} - ${formatDate(event.endsAt)}</div>
					<div>${Liferay.Util.escapeHTML(event.venue)} · ${event.capacity} seats</div>
				</div>
				<a class="conference-event-cta" href="register">Reserve a seat</a>
			</article>
		`).join('');
	})
	.catch(() => {
		statusElement.textContent = 'We could not load the programme right now.';
	});