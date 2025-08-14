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
        price: parseFloat(document.getElementById("create-price").value),
        initData: webApp.initData || ''  // Додаємо initData
    };

    if (!data.departure || !data.arrival || !data.date || !data.time || !data.seats || !data.price || !data.initData) {
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
    .then(res => {
        if (!res.ok) {
            return res.text().then(text => {
                let errorData;
                try {
                    errorData = JSON.parse(text);
                } catch {
                    errorData = { detail: text };
                }
                throw new Error(errorData.detail || "Помилка створення поїздки");
            });
        }
        return res.json();
    })
    .then(response => {
        if (response.error) {
            alert("Помилка: " + response.error);
        } else {
            alert("Поїздка створена успішно!");
            navigate("search"); // Повернення на головну сторінку
        }
    })
    .catch(err => {
        alert("Помилка при створенні поїздки: " + err.message);
        console.error(err);
    });
}