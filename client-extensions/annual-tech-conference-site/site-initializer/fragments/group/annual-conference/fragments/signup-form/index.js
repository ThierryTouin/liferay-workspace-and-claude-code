const form = fragmentElement.querySelector('[data-signup-form]');
const eventSelect = fragmentElement.querySelector('[data-event-select]');
const statusElement = fragmentElement.querySelector('[data-form-status]');

Liferay.Util.fetch('/o/c/events?pageSize=50&sort=startsAt:asc')
	.then((response) => response.json())
	.then((data) => {
		eventSelect.innerHTML = '<option value="">Select an event</option>';

		data.items.forEach((event) => {
			const option = document.createElement('option');
			option.textContent = event.eventName;
			option.value = event.id;
			eventSelect.appendChild(option);
		});
	})
	.catch(() => {
		eventSelect.innerHTML = '<option value="">Events unavailable</option>';
	});

form.addEventListener('submit', (event) => {
	event.preventDefault();
	statusElement.textContent = 'Saving your seat...';

	const formData = new FormData(form);
	const payload = {
		attendeeName: formData.get('attendeeName'),
		company: formData.get('company'),
		dietaryRequirement: formData.get('dietaryRequirement'),
		email: formData.get('email'),
		r_eventSignups_c_eventId: Number(formData.get('eventId')),
	};

	Liferay.Util.fetch('/o/c/signups', {
		body: JSON.stringify(payload),
		headers: {
			'Content-Type': 'application/json',
		},
		method: 'POST',
	})
		.then(async (response) => {
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
			statusElement.textContent = 'You are on the list. See you there!';
		})
		.catch((error) => {
			statusElement.textContent = error.message || 'We could not save your signup.';
		});
});