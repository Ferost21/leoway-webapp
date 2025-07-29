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
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || 'Помилка бронювання');
        }
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
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || 'Помилка скасування бронювання');
        }
        const result = await res.json();
        alert(`Бронювання ${bookingId} скасовано!`);
        loadMyRides();
    } catch (err) {
        alert('Помилка при скасуванні бронювання: ' + err.message);
    }
}

async function contactDriver(driverTelegramId, bookingId, rideId) {
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
        const res = await fetch(`${API_BASE_URL}/api/start-chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ userTgId, bookingId, contactTgId: driverTelegramId, rideId })
        });
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || 'Помилка при створенні чату');
        }
        const result = await res.json();
        // Отримуємо ім’я водія з API, якщо можливо
        const driverRes = await fetch(`${API_BASE_URL}/api/ride-passengers?rideId=${rideId}&tgId=${userTgId}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        let contactName = 'Водій';
        if (driverRes.ok) {
            const passengers = await driverRes.json();
            const driver = passengers.find(p => p.passenger_telegram_id === driverTelegramId);
            contactName = driver?.passenger_name || 'Водій';
        } else {
            console.warn(`Failed to fetch driver info: ${driverRes.status} ${driverRes.statusText}`);
        }
        navigate('chat', { chatId: result.chatId, contactName, bookingId, rideId });
    } catch (err) {
        alert(`Не вдалося відкрити чат з водієм: ${err.message}. Спробуйте ще раз або зв’яжіться з підтримкою.`);
    }
}

async function contactPassenger(passengerTelegramId, bookingId, rideId) {
    const userTgId = webApp.initDataUnsafe.user?.id;
    if (!userTgId) {
        alert('Не вдалося отримати ваш Telegram ID!');
        return;
    }
    if (!passengerTelegramId || !/^\d+$/.test(passengerTelegramId)) {
        alert('Не вдалося відкрити чат: пасажир не вказав дійсний Telegram ID');
        return;
    }
    if (passengerTelegramId === String(userTgId)) {
        alert('Ви не можете відкрити чат із собою!');
        return;
    }
    try {
        const res = await fetch(`${API_BASE_URL}/api/start-chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ userTgId, bookingId, contactTgId: passengerTelegramId, rideId })
        });
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || 'Помилка при створенні чату');
        }
        const result = await res.json();
        // Отримуємо ім’я пасажира з API
        const passengerRes = await fetch(`${API_BASE_URL}/api/ride-passengers?rideId=${rideId}&tgId=${userTgId}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        let contactName = 'Пасажир';
        if (passengerRes.ok) {
            const passengers = await passengerRes.json();
            const passenger = passengers.find(p => p.passenger_telegram_id === passengerTelegramId);
            contactName = passenger?.passenger_name || 'Пасажир';
        } else {
            console.warn(`Failed to fetch passenger info: ${passengerRes.status} ${passengerRes.statusText}`);
        }
        navigate('chat', { chatId: result.chatId, contactName, bookingId, rideId });
    } catch (err) {
        alert(`Не вдалося відкрити чат з пасажиром: ${err.message}. Спробуйте ще раз або зв’яжіться з підтримкою.`);
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
            body: JSON.stringify({ bookingId, tgId, status: 'approved' })
        });
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || 'Помилка підтвердження бронювання');
        }
        const result = await res.json();
        alert(`Бронювання ${bookingId} підтверджено!`);
        const details = document.querySelector('#driver-ride-details-results .ride-details');
        showDriverRideDetails(
            rideId,
            details.querySelector('.route').textContent.split(' → ')[0],
            details.querySelector('.route').textContent.split(' → ')[1],
            details.querySelector('.ride-date').textContent.split(', ')[0],
            details.querySelector('.ride-date').textContent.split(', ')[1],
            parseInt(details.querySelector('p:nth-child(3)').textContent.split('/')[0].replace('Місць: ', '')),
            parseInt(details.querySelector('p:nth-child(3)').textContent.split('/')[1]),
            parseFloat(details.querySelector('p:nth-child(5)').textContent.replace('Ціна: ', '').replace(' ₴', '')),
            details.querySelector('p:nth-child(4)')?.textContent?.replace('Опис: ', '') || ''
        );
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
            body: JSON.stringify({ bookingId, tgId, status: 'cancelled', rideId })
        });
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || `Помилка скасування бронювання: ${errorData.message || 'Сервер повернув помилку'}`);
        }
        const result = await res.json();
        alert(`Бронювання ${bookingId} скасовано!`);
        const details = document.querySelector('#driver-ride-details-results .ride-details');
        showDriverRideDetails(
            rideId,
            details.querySelector('.route').textContent.split(' → ')[0],
            details.querySelector('.route').textContent.split(' → ')[1],
            details.querySelector('.ride-date').textContent.split(', ')[0],
            details.querySelector('.ride-date').textContent.split(', ')[1],
            parseInt(details.querySelector('p:nth-child(3)').textContent.split('/')[0].replace('Місць: ', '')),
            parseInt(details.querySelector('p:nth-child(3)').textContent.split('/')[1]),
            parseFloat(details.querySelector('p:nth-child(5)').textContent.replace('Ціна: ', '').replace(' ₴', '')),
            details.querySelector('p:nth-child(4)')?.textContent?.replace('Опис: ', '') || ''
        );
    } catch (err) {
        alert(err.message);
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
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || 'Помилка видалення поїздки');
        }
        const result = await res.json();
        alert(`Поїздка ${rideId} видалена!`);
        navigate('my-rides');
    } catch (err) {
        alert('Помилка при видаленні поїздки: ' + err.message);
    }
}