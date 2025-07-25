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
                    // Змінюємо цю частину, щоб завжди виводити "+ число"
                    passengerNameText = `<p><strong>${passenger.passenger_name} (+${otherPassengers})</strong></p>`;
                }
                const photoUrl = passenger.photo_url || 'https://t.me/i/userpic/320/default.svg';
                return `
                    <div class="passenger-item">
                        <div class="passenger-info">
                            <img src="${photoUrl}" alt="Profile Photo" class="passenger-photo">
                            <div class="passenger-text">
                                ${passengerNameText}
                                <p class="status ${statusClass}">Статус: ${statusText}</p>
                            </div>
                        </div>
                        ${passenger.status === 'pending' ? `
                            <div class="passenger-actions">
                                <button class="approve-button" onclick="approveBooking(${passenger.booking_id}, ${rideId})">Підтвердити</button>
                                <button class="cancel-booking-button" onclick="cancelBooking(${passenger.booking_id}, ${rideId})">Скасувати</button>
                            </div>
                        ` : ''}
                    </div>
                `;
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