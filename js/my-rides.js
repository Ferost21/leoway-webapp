async function loadMyRides() {
    const tgId = webApp.initDataUnsafe.user?.id;
    if (!tgId) {
        document.getElementById('my-rides-results').innerHTML = '<div class="no-rides">Не вдалося отримати ваш Telegram ID!</div>';
        const scrollableContent = document.querySelector('#my-rides-page .scrollable-content');
        scrollableContent.classList.add('no-rides-container');
        console.error('Не вдалося отримати Telegram ID');
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

        // Перевіряємо хеш для автоматичного відкриття деталей
        const hash = location.hash.replace('#', '');
        const [page, rideId, bookingId] = hash.split('/');
        const driverRideDetailsPage = document.getElementById('driver-ride-details-page');
        if (page === 'my-rides' && rideId && !driverRideDetailsPage.classList.contains('active')) {
            const ride = rides.find(r => r.ride_id === parseInt(rideId));
            if (ride) {
                const dt = new Date(ride.departure_time);
                const timeStr = dt.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
                const dateStr = dt.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });
                showDriverRideDetails(
                    ride.ride_id,
                    ride.departure,
                    ride.arrival,
                    timeStr,
                    dateStr,
                    ride.seats_available,
                    ride.seats_total,
                    ride.price,
                    ride.description || '',
                    ride.role,
                    ride.status,
                    ride.cancel_reason || 'Невідома причина',
                    ride.booking_id
                );
            } else {
                console.error(`Поїздка з rideId: ${rideId} не знайдена`);
                navigate('my-rides');
            }
        }
    } catch (err) {
        console.error('Помилка при завантаженні поїздок:', err.message);
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
        const occupiedSeats = ride.seats_total - ride.seats_available;
        if (ride.role === 'passenger' && ride.status === 'cancelled') {
            return `
                <div class="ride-item clickable" data-ride-id="${ride.ride_id}" onclick="showDriverRideDetails(${ride.ride_id}, '${ride.departure}', '${ride.arrival}', '${timeStr}', '${dateStr}', ${ride.seats_available}, ${ride.seats_total}, ${ride.price}, '${ride.description || ''}', '${ride.role}', '${ride.status}', '${ride.cancel_reason || 'Невідома причина'}', ${ride.booking_id})">
                    <div class="ride-top">
                        <div class="ride-route">
                            <p class="route">${ride.departure} - ${ride.arrival}</p>
                            <p>${timeStr}, ${dateStr}</p>
                            <p class="status ${statusClass}">Скасовано</p>
                        </div>
                        <div class="price-tag">${ride.price} ₴</div>
                    </div>
                </div>`;
        } else if (ride.role === 'passenger' && ride.status === 'pending') {
            return `
                <div class="ride-item clickable" data-ride-id="${ride.ride_id}" onclick="showDriverRideDetails(${ride.ride_id}, '${ride.departure}', '${ride.arrival}', '${timeStr}', '${dateStr}', ${ride.seats_available}, ${ride.seats_total}, ${ride.price}, '${ride.description || ''}', '${ride.role}', '${ride.status}', '${ride.cancel_reason || ''}', ${ride.booking_id})">
                    <div class="ride-top">
                        <div class="ride-route">
                            <p class="route">${ride.departure} → ${ride.arrival}</p>
                            <p>${timeStr}, ${dateStr}</p>
                            <p>Бронь місць: ${ride.seats_booked}</p>
                            ${ride.status ? `<p class="status ${statusClass}">Статус: ${statusText}</p>` : ''}
                            ${ride.description ? `<p>Опис: ${ride.description}</p>` : ''}
                        </div>
                        <div class="price-tag">${ride.price} ₴</div>
                    </div>
                </div>`;
        } else if (ride.role === 'passenger') {
            return `
                <div class="ride-item clickable" data-ride-id="${ride.ride_id}" onclick="showDriverRideDetails(${ride.ride_id}, '${ride.departure}', '${ride.arrival}', '${timeStr}', '${dateStr}', ${ride.seats_available}, ${ride.seats_total}, ${ride.price}, '${ride.description || ''}', '${ride.role}', '${ride.status}', '${ride.cancel_reason || ''}', ${ride.booking_id})">
                    <div class="ride-top">
                        <div class="ride-route">
                            <p class="route">${ride.departure} → ${ride.arrival}</p>
                            <p>${timeStr}, ${dateStr}</p>
                            <p>Зайнято місць: ${occupiedSeats}/${ride.seats_total}</p>
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
                            ${ride.driver_telegram_id ? `<button class="contact-button" onclick="contactDriver('${ride.driver_telegram_id}', ${ride.booking_id}, ${ride.ride_id})">Зв’язатися з водієм</button>` : ''}
                        </div>` : ''}
                </div>`;
        } else {
            return `
                <div class="ride-item clickable" data-ride-id="${ride.ride_id}" onclick="showDriverRideDetails(${ride.ride_id}, '${ride.departure}', '${ride.arrival}', '${timeStr}', '${dateStr}', ${ride.seats_available}, ${ride.seats_total}, ${ride.price}, '${ride.description || ''}', '${ride.role}', '${ride.status || ''}', '${ride.cancel_reason || ''}', ${ride.booking_id || null})">
                    <div class="ride-top">
                        <div class="ride-route">
                            <p class="route">${ride.departure} → ${ride.arrival}</p>
                            <p>${timeStr}, ${dateStr}</p>
                            <p>Зайнято місць: ${occupiedSeats}/${ride.seats_total}</p>
                            ${ride.description ? `<p>Опис: ${ride.description}</p>` : ''}
                        </div>
                        <div class="price-tag">${ride.price} ₴</div>
                    </div>
                </div>`;
        }
    }).join('');
}

function getStatusText(status) {
    switch (status) {
        case 'approved': return 'Підтверджено';
        case 'pending': return 'Очікує';
        case 'cancelled': return 'Скасовано';
        default: return '';
    }
}

async function contactPassenger(passengerTelegramId, bookingId, rideId) {
    const tgId = webApp.initDataUnsafe.user?.id;
    const initData = webApp.initData;
    if (!tgId || !initData) {
        alert('Не вдалося отримати ваш Telegram ID або дані авторизації. Будь ласка, увійдіть через Telegram.');
        return;
    }

    if (!passengerTelegramId || !/^\d+$/.test(passengerTelegramId)) {
        alert('Невірний ID пасажира. Зв’язок неможливий.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/start-chat?initData=${encodeURIComponent(initData)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                userTgId: parseInt(tgId),
                bookingId: parseInt(bookingId),
                contactTgId: passengerTelegramId.toString(),
                rideId: parseInt(rideId),
                initData: initData
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Не вдалося розпочати чат');
        }

        const data = await response.json();
        const chatId = data.chatId;
        const contactName = document.getElementById('passenger-name')?.textContent || 'Пасажир';

        // Navigate to the chat page
        navigate('chat', {
            chatId: chatId,
            contactName: contactName,
            bookingId: bookingId,
            rideId: rideId
        });
    } catch (err) {
        console.error('Помилка при створенні чату:', err.message);
        alert(`Помилка при створенні чату: ${err.message}`);
    }
}

async function showDriverRideDetails(rideId, departure, arrival, time, date, seatsAvailable, seatsTotal, price, description, role, status, cancelReason, bookingId) {
    const driverRideDetailsPage = document.getElementById('driver-ride-details-page');
    const currentHash = location.hash.replace('#', '');
    const [currentPage, currentRideId] = currentHash.split('/');

    // Prevent re-navigation if already on the correct driver-ride-details page
    if (currentPage === 'my-rides' && parseInt(currentRideId) === rideId && driverRideDetailsPage.classList.contains('active')) {
        console.info(`Already on driver-ride-details for rideId: ${rideId}, skipping navigation`);
        return;
    }

    const resultsContainer = document.getElementById('driver-ride-details-results');

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
        console.error('Помилка парсингу дати:', err.message);
        const fallbackDate = new Date();
        fallbackDate.setHours(time.split(':')[0], time.split(':')[1], 0, 0);
        formattedDate = fallbackDate.toLocaleDateString('uk-UA', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
        }).replace(/^\w/, c => c.toUpperCase());
    }

    const occupiedSeats = seatsTotal - seatsAvailable;

    if (role === 'passenger' && status === 'cancelled') {
        const cancelText = cancelReason && (cancelReason.includes('Driver') || cancelReason.includes('Водій')) ? 'Скасовано водієм' : 'Скасовано пасажиром';
        resultsContainer.innerHTML = `
            <div class="ride-details">
                <p class="ride-date">${time}, ${formattedDate}</p>
                <p class="route">${departure} → ${arrival}</p>
                <p>Ціна: ${price} ₴</p>
                <p class="status status-cancelled">${cancelText}</p>
            </div>`;
        navigate('driver-ride-details', { rideId });
        return;
    }

    try {
        const tgId = webApp.initDataUnsafe.user?.id;
        if (!tgId) throw new Error('Не вдалося отримати Telegram ID');

        if (role === 'passenger') {
            resultsContainer.innerHTML = `
                <div class="ride-details">
                    <p class="ride-date">${time}, ${formattedDate}</p>
                    <p class="route">${departure} → ${arrival}</p>
                    ${description ? `<p>Опис: ${description}</p>` : ''}
                    <p>Ціна: ${price} ₴</p>
                    ${status ? `<p class="status status-${status}">Статус: ${getStatusText(status)}</p>` : ''}
                    <p>Номер бронювання: ${bookingId}</p>
                </div>
                ${status !== 'cancelled' ? `
                    <div class="ride-actions" style="position: absolute; bottom: 20px; width: calc(100% - 40px);">
                        <button class="cancel-button" onclick="cancelRide(${bookingId})">Скасувати</button>
                    </div>` : ''}`;
        } else {
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
                        <div class="passenger-item" onclick="showPassengerInfo(${rideId}, ${passenger.booking_id}, '${photoUrl}', '${passenger.passenger_name}', ${passenger.rating || 'null'}, '${passenger.status}', '${passenger.passenger_telegram_id}')">
                            <div class="passenger-info">
                                <img src="${photoUrl}" alt="Profile Photo" class="passenger-photo">
                                <div class="passenger-text">
                                    ${passengerNameText}
                                    <p class="status ${statusClass}">Статус: ${statusText}</p>
                                </div>
                            </div>
                            ${passenger.status === 'pending' ? `
                                <div class="passenger-actions">
                                    <button class="approve-button" onclick="approveBooking(${passenger.booking_id}, ${rideId})">Підтвердити запит</button>
                                    <button class="cancel-booking-button" onclick="cancelBooking(${passenger.booking_id}, ${rideId})">Скасувати запит</button>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('');

            resultsContainer.innerHTML = `
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
        }
    } catch (err) {
        console.error('Помилка при завантаженні пасажирів:', err.message);
        resultsContainer.innerHTML = `
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

    navigate('driver-ride-details', { rideId });
}

function showPassengerInfo(rideId, bookingId, photoUrl, name, rating, status, passengerTelegramId) {
    document.getElementById('passenger-photo').src = photoUrl || 'https://placehold.co/100x100';
    document.getElementById('passenger-name').textContent = name || 'Невідомий пасажир';
    document.getElementById('passenger-rating').textContent = `Рейтинг: ★${rating || 'N/A'}`;
    document.getElementById('passenger-status').textContent = `Статус: ${getStatusText(status) || 'N/A'}`;
    document.getElementById('passenger-booking-id').textContent = `Бронювання №${bookingId}`;

    const cancelButton = document.getElementById('cancel-booking-btn');
    const approveButton = document.getElementById('approve-booking-btn');
    const contactButton = document.getElementById('contact-passenger-btn');

    // Перевірка наявності кнопок у DOM
    if (!cancelButton) {
        console.warn('Cancel button (cancel-booking-btn) not found in the DOM.');
    }
    if (!approveButton) {
        console.warn('Approve button (approve-booking-btn) not found in the DOM.');
    }
    if (!contactButton) {
        console.warn('Contact button (contact-passenger-btn) not found in the DOM.');
    }

    // Обробка видимості та поведінки кнопок залежно від статусу бронювання
    if (status === 'pending') {
        if (approveButton) {
            approveButton.textContent = 'Підтвердити запит';
            approveButton.style.display = 'block';
            approveButton.onclick = () => approveBooking(bookingId, rideId);
        }
        if (cancelButton) {
            cancelButton.textContent = 'Скасувати запит';
            cancelButton.style.display = 'block';
            cancelButton.onclick = () => cancelBooking(bookingId, rideId);
        }
        if (contactButton && passengerTelegramId && /^\d+$/.test(passengerTelegramId)) {
            contactButton.style.display = 'block';
            contactButton.onclick = () => contactPassenger(passengerTelegramId, bookingId, rideId);
        } else if (contactButton) {
            contactButton.style.display = 'none';
            contactButton.onclick = null;
        }
    } else if (status === 'approved') {
        if (approveButton) {
            approveButton.textContent = 'Підтверджено';
            approveButton.style.display = 'none';
            approveButton.onclick = null;
        }
        if (cancelButton) {
            cancelButton.textContent = 'Скасувати';
            cancelButton.style.display = 'block';
            cancelButton.onclick = () => cancelBooking(bookingId, rideId);
        }
        if (contactButton && passengerTelegramId && /^\d+$/.test(passengerTelegramId)) {
            contactButton.style.display = 'block';
            contactButton.onclick = () => contactPassenger(passengerTelegramId, bookingId, rideId);
        } else if (contactButton) {
            contactButton.style.display = 'none';
            contactButton.onclick = null;
        }
    } else if (status === 'cancelled') {
        if (approveButton) {
            approveButton.textContent = 'Підтвердити запит';
            approveButton.style.display = 'none';
            approveButton.onclick = null;
        }
        if (cancelButton) {
            cancelButton.textContent = 'Скасувати запит';
            cancelButton.style.display = 'none';
            cancelButton.onclick = null;
        }
        if (contactButton) {
            contactButton.style.display = 'none';
            contactButton.onclick = null;
        }
        alert(`Бронювання вже скасовано: статус "${getStatusText(status)}".`);
    } else {
        if (approveButton) {
            approveButton.textContent = 'Підтвердити запит';
            approveButton.style.display = 'none';
            approveButton.onclick = null;
        }
        if (cancelButton) {
            cancelButton.textContent = 'Скасувати запит';
            cancelButton.style.display = 'none';
            cancelButton.onclick = null;
        }
        if (contactButton) {
            contactButton.style.display = 'none';
            contactButton.onclick = null;
        }
        console.warn(`Невідомий статус бронювання: ${status}`);
    }

    navigate('passenger-info', { rideId, bookingId });
}