const webApp = window.Telegram.WebApp;
webApp.ready();

let isModalOpen = false;
let isDriverRideModalOpen = false;
let isPassengerModalOpen = false;
let currentPage = 'search';

const API_BASE_URL = 'https://49c939404297.ngrok-free.app';

// Функція для оновлення стилів на основі теми
function updateTheme() {
    const themeParams = webApp.themeParams || {};
    const isDark = webApp.colorScheme === 'dark';

    const root = document.documentElement;
    root.style.setProperty('--bg-color', themeParams.bg_color || (isDark ? '#1f2a2d' : '#f5f5f5'));
    root.style.setProperty('--text-color', themeParams.text_color || (isDark ? '#e0e0e0' : '#222'));
    root.style.setProperty('--border-color', themeParams.border_color || (isDark ? '#555' : '#ccc'));
    root.style.setProperty('--input-bg-color', themeParams.section_bg_color || (isDark ? '#2c3839' : 'white'));
    root.style.setProperty('--button-bg-color', themeParams.button_color || (isDark ? '#2ecc71' : '#27ae60'));
    root.style.setProperty('--button-text-color', themeParams.button_text_color || 'white');
    root.style.setProperty('--button-hover-bg-color', themeParams.button_color || (isDark ? '#27ae60' : '#219653'));
    root.style.setProperty('--hover-bg-color', themeParams.section_bg_color || (isDark ? '#2c3839' : '#f0f0f0'));
    root.style.setProperty('--modal-bg-color', themeParams.section_bg_color || (isDark ? '#2c3839' : '#eee'));
    root.style.setProperty('--ride-bg-color', themeParams.section_bg_color || (isDark ? '#2c3839' : 'white'));
    root.style.setProperty('--nav-bg-color', themeParams.section_bg_color || (isDark ? '#2c3839' : '#fff'));
    root.style.setProperty('--cancel-button-bg-color', themeParams.destructive_text_color || (isDark ? '#e74c3c' : '#e74c3c'));
    root.style.setProperty('--cancel-button-hover-bg-color', themeParams.destructive_text_color || (isDark ? '#c0392b' : '#c0392b'));
    root.style.setProperty('--status-approved-color', isDark ? '#2ecc71' : '#27ae60');
    root.style.setProperty('--status-pending-color', isDark ? '#f1c40f' : '#f39c12');
    root.style.setProperty('--status-cancelled-color', isDark ? '#e74c3c' : '#e74c3c');
    root.style.setProperty('--contact-button-bg-color', themeParams.link_color || (isDark ? '#3498db' : '#2980b9'));
    root.style.setProperty('--contact-button-hover-bg-color', themeParams.link_color || (isDark ? '#2980b9' : '#2471a3'));

    webApp.setHeaderColor(themeParams.bg_color || (isDark ? '#1f2a2d' : '#ffffff'), 'bg_color');
    webApp.setBackgroundColor(themeParams.bg_color || (isDark ? '#1f2a2d' : '#f5f5f5'));
}

document.addEventListener('DOMContentLoaded', () => {
    webApp.ready();
    updateTheme();
    webApp.onEvent('themeChanged', updateTheme);

    // Явно приховуємо модальні вікна при завантаженні
    document.getElementById('modal').style.display = 'none';
    document.getElementById('driver-ride-modal').style.display = 'none';
    document.getElementById('passenger-modal').style.display = 'none';

    try {
        flatpickr("#date", {
            dateFormat: "d-m-Y",
            minDate: "today",
            locale: "uk",
            onReady: () => {
                const dateInput = document.getElementById('date');
                dateInput.placeholder = "Дата (ДД-ММ-РРРР)";
                if (webApp.requestFullscreen && window.innerWidth <= 600) {
                    webApp.requestFullscreen().catch(() => {});
                }
            }
        });
    } catch (err) {}

    flatpickr("#create-date", {
        dateFormat: "d-m-Y",
        minDate: "today",
        locale: "uk"
    });

    flatpickr("#create-time", {
        enableTime: true,
        noCalendar: true,
        dateFormat: "H:i",
        time_24hr: true,
        locale: "uk"
    });

    setupSuggestions('departure', 'departure-suggestions');
    setupSuggestions('arrival', 'arrival-suggestions');
    setupSuggestions('create-departure', 'create-departure-suggestions');
    setupSuggestions('create-arrival', 'create-arrival-suggestions');

    Telegram.WebApp.BackButton.hide();

    function updateSwapButtonVisibility() {
        const departure = document.getElementById('departure').value.trim();
        const arrival = document.getElementById('arrival').value.trim();
        const swapButton = document.querySelector('.swap-button');
        swapButton.classList.toggle('visible', departure.length > 0 || arrival.length > 0);
    }

    ['departure', 'arrival'].forEach(id => {
        document.getElementById(id).addEventListener('input', updateSwapButtonVisibility);
    });

    updateSwapButtonVisibility();

    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.passengerModalOpen && isPassengerModalOpen) {
            closePassengerModal();
        } else if (event.state && event.state.driverRideModalOpen && isDriverRideModalOpen) {
            closeDriverRideModal();
        } else if (event.state && event.state.modalOpen && isModalOpen) {
            closeModal();
        } else {
            navigate(event.state?.page || 'search');
        }
    });

    // Ініціалізуємо історію зі сторінкою search
    window.history.replaceState({ page: 'search' }, document.title);

    // Ініціалізація користувача
    const user = webApp.initDataUnsafe.user;
    if (user && user.id) {
        const isInitialized = localStorage.getItem(`userInitialized_${user.id}`);
        if (!isInitialized) {
            fetch(`${API_BASE_URL}/api/init-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({
                    tgId: user.id,
                    firstName: user.first_name || 'Невідомий користувач',
                    photoUrl: user.photo_url || null
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    console.error('Error initializing user:', data.error);
                } else {
                    localStorage.setItem(`userInitialized_${user.id}`, 'true');
                    console.log('User initialized successfully:', data.message);
                }
            })
            .catch(err => {
                console.error('Network error initializing user:', err);
            });
        }
    }

    // Встановлюємо сторінку пошуку за замовчуванням
    currentPage = 'search';
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    document.querySelector(`.nav-item[onclick="navigate('search')"]`).classList.add('active');

    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.classList.remove('active'));
    document.getElementById('search-page').classList.add('active');

    loadProfile();

    if (currentPage === 'my-rides') {
        loadMyRides();
    }
});

function loadProfile() {
    const user = webApp.initDataUnsafe.user;
    if (user && user.id) {
        const profilePhoto = document.getElementById('profile-photo');
        const profileName = document.getElementById('profile-name');
        const profileRating = document.getElementById('profile-rating');

        profileName.textContent = user.first_name || 'Невідомий користувач';

        // Fetch and display rating
        fetchRating(user.id).then(rating => {
            profileRating.textContent = `Рейтинг: ★${rating || 'N/A'}`;
        });

        if (user.photo_url) {
            profilePhoto.src = user.photo_url;
        } else {
            profilePhoto.src = 'https://via.placeholder.com/100'; // Placeholder if no photo
        }
    }
}

// Fetch rating function (unchanged)
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

function setupSuggestions(inputId, suggestionsId) {
    const input = document.getElementById(inputId);
    const suggestions = document.getElementById(suggestionsId);

    input.addEventListener('input', async (e) => {
        const query = e.target.value;
        const cities = await fetchCities(query);
        suggestions.style.display = cities.length > 0 ? 'block' : 'none';
        suggestions.innerHTML = cities.map(city =>
            `<div class="suggestion-item" data-name="${city.name}">
                ${city.name}
            </div>`).join('');
    });

    suggestions.addEventListener('click', (e) => {
        const item = e.target.closest('.suggestion-item');
        if (item) {
            input.value = item.dataset.name;
            suggestions.style.display = 'none';
        }
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.style.display = 'none';
        }
    });
}

setupSuggestions('departure', 'departure-suggestions');
setupSuggestions('arrival', 'arrival-suggestions');

function formatShortDate(dateStr) {
    const parts = dateStr.split('-');
    return parts.length === 3 ? `${parts[0]}.${parts[1]}` : dateStr;
}

function swapLocations() {
    const departure = document.getElementById('departure').value;
    const arrival = document.getElementById('arrival').value;
    document.getElementById('departure').value = arrival;
    document.getElementById('arrival').value = departure;
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
        // Log the contact attempt to the backend
        await fetch(`${API_BASE_URL}/api/log-contact-attempt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ userTgId, bookingId, driverTelegramId })
        });
        // Use Deeplink to the bot instead of direct user link
        webApp.openTelegramLink(`https://t.me/pdsdk_bot?start=contact_${driverTelegramId}_${bookingId}`);
    } catch (err) {
        alert(`Не вдалося відкрити чат з водієм: ${err.message}. Спробуйте ще раз або зв’яжіться з підтримкою.`);
    }
}

async function approveBooking(bookingId, rideId) {
    const tgId = webApp.initDataUnsafe.user?.id;
    if (!tgId) return alert('Не вдалося отримати ваш Telegram ID!');
    try {
        const res = await fetch(`${API_BASE_URL}/api/update-bicking-status`, {
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
        // Оновлюємо список пасажирів
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
        // Оновлюємо список пасажирів
        showDriverRideDetails(rideId, document.querySelector('.ride-details .route').textContent.split(' → ')[0], document.querySelector('.ride-details .route').textContent.split(' → ')[1], document.querySelector('.ride-details p:nth-child(2)').textContent.split(', ')[0], document.querySelector('.ride-details p:nth-child(2)').textContent.split(', ')[1], parseInt(document.querySelector('.ride-details p:nth-child(3)').textContent.split('/')[0].replace('Місць: ', '')), parseInt(document.querySelector('.ride-details p:nth-child(3)').textContent.split('/')[1]), parseFloat(document.querySelector('.ride-details p:nth-child(5)').textContent.replace('Ціна: ', '').replace(' ₴', '')), document.querySelector('.ride-details p:nth-child(4)')?.textContent?.replace('Опис: ', '') || '');
    } catch (err) {
        alert('Помилка при скасуванні бронювання: ' + err.message);
    }
}

function getStatusText(status) {
    switch (status) {
        case 'approved':
            return 'Підтверджено';
        case 'pending':
            return 'Очікує';
        case 'cancelled':
            return 'Скасовано';
        default:
            return 'Невідомо';
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

        // Оновлюємо список всіх поїздок
        document.getElementById('my-rides-results').innerHTML = rides.length === 0
            ? '<div class="no-rides">У вас немає поїздок.</div>'
            : renderRides(rides);

        // Додаємо/знімаємо клас no-rides-container залежно від вмісту
        if (rides.length === 0) {
            scrollableContent.classList.add('no-rides-container');
        } else {
            scrollableContent.classList.remove('no-rides-container');
        }

        // Примусово прокручуємо до верху
        scrollableContent.scrollTop = 0;
    } catch (err) {
        document.getElementById('my-rides-results').innerHTML = '<div class="no-rides">Помилка при завантаженні поїздок: ' + err.message + '</div>';
        const scrollableContent = document.querySelector('#my-rides-page .scrollable-content');
        scrollableContent.classList.add('no-rides-container');
    }
}

function renderRides(rides, isBooking) {
    return rides.map(ride => {
        const dt = new Date(ride.departure_time);
        const timeStr = dt.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
        const dateStr = dt.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });
        const statusText = getStatusText(ride.status || '');
        const statusClass = ride.status ? `status-${ride.status}` : '';
        if (isBooking) {
            return `
                <div class="ride-item">
                    <div class="ride-top">
                        <div class="ride-route">
                            <p class="route">${ride.departure} → ${ride.arrival}</p>
                            <p>${timeStr}, ${dateStr}</p>
                            <p>Місць: ${ride.seats_booked}/${ride.seats_total}</p>
                            ${ride.status ? `<p class="status ${statusClass}">Статус: ${statusText}</p>` : ''}
                            ${ride.description ? `<p>Опис: ${ride.description}</p>` : ''}
                            <p>Водій: ${ride.driver_name} ★ ${ride.driver_rating.toFixed(1)}</p>
                            <p>Номер бронювання: ${ride.booking_id}</p>
                        </div>
                        <div class="price-tag">${ride.price} ₴</div>
                    </div>
                    ${ride.status !== 'cancelled' ? `
                        <div class="ride-actions">
                            <button class="cancel-button" onclick="cancelRide(${ride.booking_id})">Скасувати</button>
                            ${ride.driver_telegram_id ? `<button class="contact-button" onclick="contactDriver('${ride.driver_telegram_id}', ${ride.booking_id})">Зв’язатися з водієм</button>` : ''}
                        </div>` : ''}
                </div>`;
        } else {
            return `
                <div class="ride-item clickable" onclick="showDriverRideDetails(${ride.ride_id}, '${ride.departure}', '${ride.arrival}', '${timeStr}', '${dateStr}', ${ride.seats_available}, ${ride.seats_total}, ${ride.price}, '${ride.description || ''}')">
                    <div class="ride-top">
                        <div class="ride-route">
                            <p class="route">${ride.departure} → ${ride.arrival}</p>
                            <p>${timeStr}, ${dateStr}</p>
                            <p>Місць: ${ride.seats_available}/${ride.seats_total}</p>
                            ${ride.description ? `<p>Опис: ${ride.description}</p>` : ''}
                        </div>
                        <div class="price-tag">${ride.price} ₴</div>
                    </div>
                </div>`;
        }
    }).join('');
}

async function showDriverRideDetails(rideId, departure, arrival, time, date, seatsAvailable, seatsTotal, price, description) {
    const modal = document.getElementById('driver-ride-modal');
    const modalTitle = document.getElementById('driver-ride-modal-title');
    const modalResults = document.getElementById('driver-ride-modal-results');

    let formattedDate;
    try {
        const [day, month] = date.split('.');
        const parsedDate = new Date(`2025-${month}-${day}T${time}`);
        if (isNaN(parsedDate.getTime())) throw new Error('Недійсна дата');
        formattedDate = parsedDate.toLocaleDateString('uk-UA', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
        }).replace(/^\w/, c => c.toUpperCase());
    } catch (err) {
        console.warn('Помилка парсингу дати:', err.message, 'Використовуємо поточну дату');
        const fallbackDate = new Date();
        fallbackDate.setHours(time.split(':')[0], time.split(':')[1], 0, 0);
        formattedDate = fallbackDate.toLocaleDateString('uk-UA', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
        }).replace(/^\w/, c => c.toUpperCase());
    }

    const occupiedSeats = seatsTotal - seatsAvailable;

    try {
        const tgId = webApp.initDataUnsafe.user?.id;
        if (!tgId) throw new Error('Не вдалося отримати ваш Telegram ID!');

        const res = await fetch(`${API_BASE_URL}/api/ride-passengers?rideId=${rideId}&tgId=${tgId}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        if (!res.ok) throw new Error('Не вдалося отримати список пасажирів');
        const passengers = await res.json();

        const passengersHtml = passengers.length === 0
            ? '<div class="no-passengers">Пасажирів не знайдено.</div>'
            : passengers.map(passenger => {
                const statusText = getStatusText(passenger.status);
                const statusClass = passenger.status ? `status-${passenger.status}` : '';
                let passengerNameText;
                if (passenger.seats_booked === 1) {
                    passengerNameText = `<p><strong>${passenger.passenger_name}</strong></p>`;
                } else {
                    const otherPassengers = passenger.seats_booked - 1;
                    passengerNameText = `<p><strong>${passenger.passenger_name} (+${otherPassengers})</strong></p>`;
                }
                const photoUrl = passenger.photo_url || 'https://t.me/i/userpic/320/default.svg';
                return `
                    <div class="passenger-item" onclick="showPassengerDetails('${passenger.passenger_name}', ${passenger.booking_id}, ${rideId})">
                        <div class="passenger-info">
                            <img src="${photoUrl}" alt="Profile Photo" class="passenger-photo">
                            <div class="passenger-text">
                                ${passengerNameText}
                                <p class="status ${statusClass}">Статус: ${statusText}</p>
                            </div>
                        </div>
                        ${passenger.status === 'pending' ? `
                            <div class="passenger-actions">
                                <button class="approve-button" onclick="approveBooking(${passenger.booking_id}, ${rideId});event.stopPropagation();">Підтвердити</button>
                                <button class="cancel-booking-button" onclick="cancelBooking(${passenger.booking_id}, ${rideId});event.stopPropagation();">Скасувати</button>
                            </div>
                        ` : ''}
                    </div>`;
            }).join('');

        modalResults.innerHTML = `
            <div class="ride-details">
                <p class="ride-date">${time}, ${formattedDate}</p>
                <p class="route">${departure} → ${arrival}</p>
                ${description ? `<p>Опис: ${description}</p>` : ''}
                <p>Ціна: ${price} ₴</p>
            </div>
            <div class="passengers-list">
                <h3>Пасажири ${occupiedSeats}/${seatsTotal}</h3>
                ${passengersHtml}
            </div>
            <div class="ride-actions" style="position: absolute; bottom: 20px; width: calc(100% - 40px);">
                <button class="delete-button" onclick="deleteRide(${rideId})">Видалити поїздку</button>
            </div>`;
    } catch (err) {
        modalResults.innerHTML = `
            <div class="ride-details">
                <p class="ride-date">${time}, ${formattedDate}</p>
                <p class="route">${departure} → ${arrival}</p>
                ${description ? `<p>Опис: ${description}</p>` : ''}
                <p>Ціна: ${price} ₴</p>
            </div>
            <div class="passengers-list">
                <h3>Пасажири ${occupiedSeats}/${seatsTotal}</h3>
                <div class="no-passengers">Помилка при завантаженні пасажирів: ${err.message}</div>
            </div>
            <div class="ride-actions" style="position: absolute; bottom: 20px; width: calc(100% - 40px);">
                <button class="delete-button" onclick="deleteRide(${rideId})">Видалити поїздку</button>
            </div>`;
    }

    modal.style.display = 'flex';
    requestAnimationFrame(() => {
        modal.classList.add('show');
    });
    modal.classList.remove('closing');

    Telegram.WebApp.BackButton.show();
    Telegram.WebApp.BackButton.onClick(() => {
        closeDriverRideModal();
    });

    isDriverRideModalOpen = true;
    setTimeout(() => {
        window.history.pushState({ driverRideModalOpen: true }, '');
    }, 100);
}

function showPassengerDetails(passengerName, bookingId, rideId) {
    const passengerModal = document.getElementById('passenger-modal');
    const modalTitle = document.getElementById('passenger-modal-title');
    const modalResults = document.getElementById('passenger-modal-results');
    const driverRideModal = document.getElementById('driver-ride-modal');

    // Keep the driver ride modal visible
    driverRideModal.style.display = 'flex';
    driverRideModal.classList.add('show');

    modalTitle.textContent = 'Інформація про пасажира';
    modalResults.innerHTML = `
        <div class="passenger-details">
            <p><strong>Ім'я:</strong> ${passengerName}</p>
        </div>
    `;

    passengerModal.style.display = 'flex';
    requestAnimationFrame(() => {
        passengerModal.classList.add('show');
    });
    passengerModal.classList.remove('closing');

    Telegram.WebApp.BackButton.show();
    Telegram.WebApp.BackButton.onClick(() => {
        closePassengerModal(rideId);
    });

    isPassengerModalOpen = true;
    setTimeout(() => {
        window.history.pushState({ passengerModalOpen: true, rideId }, '');
    }, 100);
}

function closePassengerModal(rideId) {
    const passengerModal = document.getElementById('passenger-modal');
    const driverRideModal = document.getElementById('driver-ride-modal');
    
    passengerModal.classList.add('closing');
    passengerModal.classList.remove('show');
    setTimeout(() => {
        passengerModal.style.display = 'none';
        passengerModal.classList.remove('closing');
        isPassengerModalOpen = false;

        // Ensure driver ride modal remains open
        driverRideModal.style.display = 'flex';
        driverRideModal.classList.add('show');
        driverRideModal.classList.remove('closing');

        Telegram.WebApp.BackButton.show();
        Telegram.WebApp.BackButton.onClick(() => {
            closeDriverRideModal();
        });

        window.history.pushState({ driverRideModalOpen: true }, '');
    }, 300);
}

function closeDriverRideModal() {
    const modal = document.getElementById('driver-ride-modal');
    modal.classList.add('closing');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        modal.classList.remove('closing');
        isDriverRideModalOpen = false;
        Telegram.WebApp.BackButton.hide();
        window.history.pushState({ page: currentPage }, document.title);
        if (currentPage === 'my-rides') {
            loadMyRides();
        }
    }, 300);
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.add('closing');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        modal.classList.remove('closing');
        isModalOpen = false;
        Telegram.WebApp.BackButton.hide();
        window.history.pushState({ page: currentPage }, document.title);
    }, 300);
}

function navigate(page) {
    if (isPassengerModalOpen) {
        closePassengerModal();
    } else if (isDriverRideModalOpen) {
        closeDriverRideModal();
    } else if (isModalOpen) {
        closeModal();
    }

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    document.querySelector(`.nav-item[onclick="navigate('${page}')"]`).classList.add('active');

    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.classList.remove('active'));
    document.getElementById(`${page}-page`).classList.add('active');

    currentPage = page;
    window.history.pushState({ page }, document.title);

    if (page === 'my-rides') {
        loadMyRides();
    }
}

setupSuggestions('create-departure', 'create-departure-suggestions');
setupSuggestions('create-arrival', 'create-arrival-suggestions');

function submitCreateRide() {
    const user = webApp.initDataUnsafe.user;
    if (!user || !user.id) {
        alert("Не вдалося отримати ваш Telegram ID!");
        return;
    }

    const data = {
        tgId: user.id,
        firstName: user.first_name || "Невідомий користувач",
        photoUrl: user.photo_url || null,
        departure: document.getElementById("create-departure").value.trim(),
        arrival: document.getElementById("create-arrival").value.trim(),
        date: document.getElementById("create-date").value,
        time: document.getElementById("create-time").value,
        description: document.getElementById("create-description").value.trim(),
        seats: parseInt(document.getElementById("create-seats").value),
        price: parseFloat(document.getElementById("create-price").value)
    };

    if (!data.departure || !data.arrival || !data.date || !data.time || !data.seats || !data.price) {
        alert("Будь ласка, заповніть усі обов'язкові поля.");
        return;
    }

    fetch(`${API_BASE_URL}/api/create-ride`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true"
        },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(response => {
        if (response.error) {
            alert("Помилка: " + response.error);
        } else {
            alert("Поїздка створена успішно!");
            navigate("search");
        }
    })
    .catch(err => {
        alert("Помилка при з'єднанні з сервером.");
        console.error(err);
    });
}