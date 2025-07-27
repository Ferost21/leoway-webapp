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
            body: JSON.stringify({ bookingId, tgId, status: 'cancel' })
        });
        if (!res.ok) throw new Error('Помилка скасування бронювання');
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
        navigate('my-rides');
    } catch (err) {
        alert('Помилка при видаленні поїздки: ' + err.message);
    }
}