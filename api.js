const API_BASE_URL = 'https://49c939404297.ngrok-free.app';
const webApp = window.Telegram.WebApp;

async function fetchCities(query) {
    if (query.length < 2) return [];
    const response = await fetch(`${API_BASE_URL}/api/cities?query=${encodeURIComponent(query)}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
    });
    if (!response.ok) return [];
    const data = await response.json();
    const uniqueCities = [];
    const seenNames = new Set();
    data.forEach(city => {
        if (!seenNames.has(city.name)) {
            seenNames.add(city.name);
            uniqueCities.push(city.name);
        }
    });
    return uniqueCities.map(name => ({ name }));
}

function fetchRating(tgId) {
    return fetch(`${API_BASE_URL}/api/user-rating?tgId=${tgId}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) throw new Error(data.error);
        return data.rating ? data.rating.toFixed(1) : null;
    })
    .catch(err => {
        console.error('Error fetching rating:', err);
        return null;
    });
}

async function submitSearch() {
    const departure = document.getElementById('departure').value.trim();
    const arrival = document.getElementById('arrival').value.trim();
    const date = document.getElementById('date').value.trim();
    const seats = document.getElementById('seats').value.trim();

    if (!departure || !arrival || !date || !seats) return alert('Заповніть усі поля!');
    if (departure.length > 255 || arrival.length > 255) return alert('Назви місць мають бути до 255 символів!');

    try {
        const res = await fetch(`${API_BASE_URL}/api/search-rides`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ departure, arrival, date, seats })
        });
        if (!res.ok) throw new Error('Не вдалося отримати поїздки');
        const rides = await res.json();
        const modalResults = document.getElementById('modal-results');
        modalResults.innerHTML = rides.length === 0
            ? '<div class="no-rides">Поїздок не знайдено.</div>'
            : rides.map(ride => {
                const dt = new Date(ride.departure_time);
                const timeStr = dt.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
                const dateStr = dt.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });
                return `
                    <div class="ride-item">
                        <div class="ride-top">
                            <div class="ride-route">
                                <p class="route">${ride.departure} → ${ride.arrival}</p>
                                <p>${timeStr}, ${dateStr}</p>
                                <p>Місць: ${ride.seats_available}/${ride.seats_total}</p>
                                ${ride.description ? `<p>Опис: ${ride.description}</p>` : ''}
                                <p>Водій: ${ride.driver_name} ★ ${ride.driver_rating.toFixed(1)}</p>
                            </div>
                            <div class="price-tag">${ride.price} ₴</div>
                        </div>
                        <button class="book-button" onclick="bookRide(${ride.id}, ${seats}, '${ride.driver_telegram_id}')">Забронювати</button>
                    </div>`;
            }).join('');
        document.getElementById('modal-title').textContent = `${departure} → ${arrival}`;

        const modalTitleBox = document.querySelector('.modal-title-box');
        const oldSubtitle = modalTitleBox.querySelector('p');
        if (oldSubtitle) oldSubtitle.remove();

        const subtitle = document.createElement('p');
        subtitle.style.margin = '4px 0 0';
        subtitle.style.fontSize = '14px';
        subtitle.style.color = 'var(--text-color, #555)';

        const seatsNumber = parseInt(seats);
        const seatWord = seatsNumber === 1 ? 'пасажир' : (seatsNumber >= 2 && seatsNumber <= 4 ? 'пасажири' : 'пасажирів');

        subtitle.textContent = `${formatShortDate(date)}, ${seatsNumber} ${seatWord}`;
        modalTitleBox.appendChild(subtitle);
        const modal = document.getElementById('modal');
        modal.style.display = 'flex';
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
        modal.classList.remove('closing');

        Telegram.WebApp.BackButton.show();
        Telegram.WebApp.BackButton.onClick(() => {
            closeModal();
        });

        isModalOpen = true;
        setTimeout(() => {
            window.history.pushState({ modalOpen: true }, '');
        }, 100);
    } catch (err) {
        alert('Помилка при пошуку поїздок: ' + err.message);
    }
}

async function bookRide(rideId, seats, driverTelegramId) {
    const user = webApp.initDataUnsafe.user;
    if (!user || !user.id) return alert('Не вдалося отримати ваш Telegram ID!');
    if (String(driverTelegramId) === String(user.id)) {
        return alert('Ви не можете забронювати власну поїздку!');
    }
    try {
        const res = await fetch(`${API_BASE_URL}/api/book-ride`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                rideId,
                tgId: user.id,
                firstName: user.first_name || "Невідомий користувач",
                photoUrl: user.photo_url || null,
                seats
            })
        });
        if (!res.ok) throw new Error('Помилка бронювання');
        const result = await res.json();
        alert(`Бронювання створено! Номер: ${result.bookingId}`);
        if (currentPage === 'my-rides') {
            loadMyRides();
        }
    } catch (err) {
        alert('Помилка при бронюванні: ' + err.message);
    }
}

async function cancelRide(bookingId) {
    const tgId = webApp.initDataUnsafe.user?.id;
    if (!tgId) return alert('Не вдалося отримати ваш Telegram ID!');
    try {
        const res = await fetch(`${API_BASE_URL}/api/cancel-ride`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ bookingId, tgId })
        });
        if (!res.ok) throw new Error('Помилка скасування бронювання');
        const result = await res.json();
        alert(`Бронювання ${bookingId} скасовано!`);
        loadMyRides();
    } catch (err) {
        alert('Помилка при скасуванні бронювання: ' + err.message);
    }
}

async function contactDriver(driverTelegramId, bookingId) {
    const userTgId = webApp.initDataUnsafe.user?.id;
    if (!userTgId) {
        alert('Не вдалося отримати ваш Telegram ID!');
        return;
    }
    if (!driverTelegramId || !/^\d+$/.test(driverTelegramId)) {
        alert('Не вдалося відкрити чат: водій не вказав дійсний Telegram ID');
        return;
    }
    if (driverTelegramId === String(userTgId)) {
        alert('Ви не можете відкрити чат із собою!');
        return;
    }
    try {
        await fetch(`${API_BASE_URL}/api/log-contact-attempt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ userTgId, bookingId, driverTelegramId })
        });
        webApp.openTelegramLink(`https://t.me/pdsdk_bot?start=contact_${driverTelegramId}_${bookingId}`);
    } catch (err) {
        alert(`Не вдалося відкрити чат з водієм: ${err.message}. Спробуйте ще раз або зв’яжіться з підтримкою.`);
    }
}

async function approveBooking(bookingId, rideId) {
    const tgId = webApp.initDataUnsafe.user?.id;
    if (!tgId) return alert('Не вдалося отримати ваш Telegram ID!');
    try {
        const res = await fetch(`${API_BASE_URL}/api/update-booking-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ bookingId, tgId, status: 'approve' })
        });
        if (!res.ok) throw new Error('Помилка підтвердження бронювання');
        const result = await res.json();
        alert(`Бронювання ${bookingId} підтверджено!`);
        showDriverRideDetails(rideId, document.querySelector('.ride-details .route').textContent.split(' → ')[0], document.querySelector('.ride-details .route').textContent.split(' → ')[1], document.querySelector('.ride-details p:nth-child(2)').textContent.split(', ')[0], document.querySelector('.ride-details p:nth-child(2)').textContent.split(', ')[1], parseInt(document.querySelector('.ride-details p:nth-child(3)').textContent.split('/')[0].replace('Місць: ', '')), parseInt(document.querySelector('.ride-details p:nth-child(3)').textContent.split('/')[1]), parseFloat(document.querySelector('.ride-details p:nth-child(5)').textContent.replace('Ціна: ', '').replace(' ₴', '')), document.querySelector('.ride-details p:nth-child(4)')?.textContent?.replace('Опис: ', '') || '');
    } catch (err) {
        alert('Помилка при підтвердженні бронювання: ' + err.message);
    }
}

async function cancelBooking(bookingId, rideId) {
    const tgId = webApp.initDataUnsafe.user?.id;
    if (!tgId) return alert('Не вдалося отримати ваш Telegram ID!');
    if (!confirm('Ви впевнені, що хочете скасувати це бронювання?')) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/update-booking-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ bookingId, tgId, status: 'cancel' })
        });
        if (!res.ok) throw new Error('Помилка скасування бронювання');
        const result = await res.json();
        alert(`Бронювання ${bookingId} скасовано!`);
        showDriverRideDetails(rideId, document.querySelector('.ride-details .route').textContent.split(' → ')[0], document.querySelector('.ride-details .route').textContent.split(' → ')[1], document.querySelector('.ride-details p:nth-child(2)').textContent.split(', ')[0], document.querySelector('.ride-details p:nth-child(2)').textContent.split(', ')[1], parseInt(document.querySelector('.ride-details p:nth-child(3)').textContent.split('/')[0].replace('Місць: ', '')), parseInt(document.querySelector('.ride-details p:nth-child(3)').textContent.split('/')[1]), parseFloat(document.querySelector('.ride-details p:nth-child(5)').textContent.replace('Ціна: ', '').replace(' ₴', '')), document.querySelector('.ride-details p:nth-child(4)')?.textContent?.replace('Опис: ', '') || '');
    } catch (err) {
        alert('Помилка при скасуванні бронювання: ' + err.message);
    }
}

async function deleteRide(rideId) {
    const tgId = webApp.initDataUnsafe.user?.id;
    if (!tgId) return alert('Не вдалося отримати ваш Telegram ID!');
    if (!confirm('Ви впевнені, що хочете видалити цю поїздку?')) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/delete-ride`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ rideId, tgId })
        });
        if (!res.ok) throw new Error('Помилка видалення поїздки');
        const result = await res.json();
        alert(`Поїздка ${rideId} видалена!`);
        closeDriverRideModal();
        loadMyRides();
    } catch (err) {
        alert('Помилка при видаленні поїздки: ' + err.message);
    }
}

async function loadMyRides() {
    const tgId = webApp.initDataUnsafe.user?.id;
    if (!tgId) {
        document.getElementById('my-rides-results').innerHTML = '<div class="no-rides">Не вдалося отримати ваш Telegram ID!</div>';
        const scrollableContent = document.querySelector('#my-rides-page .scrollable-content');
        scrollableContent.classList.add('no-rides-container');
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/my-rides?tgId=${tgId}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });

        if (!res.ok) throw new Error('Не вдалося отримати ваші поїздки');

        const rides = await res.json();
        const scrollableContent = document.querySelector('#my-rides-page .scrollable-content');

        document.getElementById('my-rides-results').innerHTML = rides.length === 0
            ? '<div class="no-rides">У вас немає поїздок.</div>'
            : renderRides(rides);

        if (rides.length === 0) {
            scrollableContent.classList.add('no-rides-container');
        } else {
            scrollableContent.classList.remove('no-rides-container');
        }

        scrollableContent.scrollTop = 0;
    } catch (err) {
        document.getElementById('my-rides-results').innerHTML = '<div class="no-rides">Помилка при завантаженні поїздок: ' + err.message + '</div>';
        const scrollableContent = document.querySelector('#my-rides-page .scrollable-content');
        scrollableContent.classList.add('no-rides-container');
    }
}

export { fetchCities, fetchRating, submitSearch, bookRide, cancelRide, contactDriver, approveBooking, cancelBooking, deleteRide, loadMyRides };