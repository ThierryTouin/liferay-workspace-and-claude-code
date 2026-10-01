const root = fragmentElement.querySelector('.conference-signup-wrapper');
const form = fragmentElement.querySelector('[data-signup-form]');
const eventSelect = fragmentElement.querySelector('[data-event-select]');
const statusElement = fragmentElement.querySelector('[data-form-status]');
const submitButton = fragmentElement.querySelector('[data-submit-button]');

const successMessage =
	root.getAttribute('data-success-message') ||
	'You are on the list. See you there!';
const submitLabel = root.getAttribute('data-submit-label') || 'Reserve my seat';

submitButton.textContent = submitLabel;

// A switched off field must leave the DOM — hiding it with CSS would still submit it.

['company', 'dietary'].forEach((name) => {
	const attribute = name === 'company' ? 'data-show-company' : 'data-show-dietary';

	if (root.getAttribute(attribute) === 'false') {
		const field = fragmentElement.querySelector(`[data-optional-field="${name}"]`);

		if (field) {
			field.remove();
		}
	}
});

const setStatus = (message, state) => {
	statusElement.textContent = message;

	if (state) {
		statusElement.setAttribute('data-state', state);
	}
	else {
		statusElement.removeAttribute('data-state');
	}
};

const replaceOptions = (options) => {
	eventSelect.textContent = '';

	options.forEach(({label, disabled, value}) => {
		const option = document.createElement('option');

		option.disabled = Boolean(disabled);
		option.textContent = label;
		option.value = value;

		eventSelect.appendChild(option);
	});
};

// Returns null when the signupCount aggregation is unavailable, so the option
// label stays silent rather than claiming every place is free.

const seatsLeft = (event) => {
	if (event.signupCount === undefined || event.signupCount === null) {
		return null;
	}

	return Math.max(
		(parseInt(event.capacity, 10) || 0) - (parseInt(event.signupCount, 10) || 0),
		0
	);
};

const preselectedEventId = new URLSearchParams(window.location.search).get(
	'eventId'
);

Liferay.Util.fetch('/o/c/events?pageSize=200&sort=startsAt:asc')
	.then((response) => {
		if (!response.ok) {
			throw new Error('Unable to load events');
		}

		return response.json();
	})
	.then((data) => {
		const now = Date.now();
		const events = (data.items || []).filter(
			(event) => new Date(event.endsAt).getTime() >= now
		);

		if (!events.length) {
			replaceOptions([{label: 'No events are open yet', value: ''}]);

			return;
		}

		replaceOptions(
			[{label: 'Select an event', value: ''}].concat(
				events.map((event) => {
					const left = seatsLeft(event);

					if (left === null) {
						return {label: event.eventName, value: String(event.id)};
					}

					return {
						disabled: !left,
						label: left
							? `${event.eventName} — ${left} places left`
							: `${event.eventName} — fully booked`,
						value: String(event.id),
					};
				})
			)
		);

		if (preselectedEventId) {
			eventSelect.value = preselectedEventId;
		}
	})
	.catch(() => {
		replaceOptions([{label: 'Events unavailable', value: ''}]);
		setStatus('We could not load the events right now.', 'error');
	});

form.addEventListener('submit', (event) => {
	event.preventDefault();

	submitButton.disabled = true;
	setStatus('Saving your seat…');

	const formData = new FormData(form);
	const payload = {
		attendeeName: formData.get('attendeeName'),
		email: formData.get('email'),
		r_eventSignups_c_eventId: Number(formData.get('eventId')),
	};

	if (formData.has('company')) {
		payload.company = formData.get('company');
	}

	if (formData.has('dietaryRequirement')) {
		payload.dietaryRequirement = formData.get('dietaryRequirement');
	}

	Liferay.Util.fetch('/o/c/signups', {
		body: JSON.stringify(payload),
		headers: {
			'Content-Type': 'application/json',
		},
		method: 'POST',
	})
		.then(async (response) => {
			// Anything in front of Liferay may answer with HTML, so read text first.

			const body = await response.text();

			let data = {};

			try {
				data = JSON.parse(body);
			}
			catch (error) {
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}`);
				}
			}

			if (!response.ok) {
				throw new Error(data.title || data.detail || `HTTP ${response.status}`);
			}

			return data;
		})
		.then(() => {
			form.reset();
			setStatus(successMessage, 'success');
		})
		.catch((error) => {
			setStatus(error.message || 'We could not save your signup.', 'error');
		})
		.finally(() => {
			submitButton.disabled = false;
		});
});