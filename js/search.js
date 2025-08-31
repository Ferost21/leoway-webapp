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
            if (inputId === 'modal-input') {
                // Update the corresponding field and close modal
                const fieldType = input.dataset.fieldType;
                document.getElementById(`${fieldType}-text`).textContent = item.dataset.name;
                closeLocationModal();
                updateSwapButtonVisibility();
            }
        }
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.style.display = 'none';
        }
    });
}

function swapLocations() {
    const departureText = document.getElementById('departure-text').textContent;
    const arrivalText = document.getElementById('arrival-text').textContent;
    document.getElementById('departure-text').textContent = arrivalText === 'Місце прибуття' ? 'Місце відправлення' : arrivalText;
    document.getElementById('arrival-text').textContent = departureText === 'Місце відправлення' ? 'Місце прибуття' : departureText;
    updateSwapButtonVisibility();
}

function openLocationModal(fieldType) {
    const modal = document.getElementById('location-modal');
    const modalInput = document.getElementById('modal-input');
    const modalTitle = document.getElementById('modal-title');
    modalInput.value = '';
    modalInput.dataset.fieldType = fieldType;
    modalTitle.textContent = fieldType === 'departure' ? 'Місце відправлення' : 'Місце прибуття';
    modal.style.display = 'flex';
    modalInput.focus();
    // Show BackButton to close modal
    Telegram.WebApp.BackButton.show();
}

function closeLocationModal() {
    const modal = document.getElementById('location-modal');
    modal.style.display = 'none';
    document.getElementById('modal-suggestions').style.display = 'none';
    document.getElementById('modal-input').value = '';
    // Hide BackButton if on search page
    if (history.state?.page === 'search') {
        Telegram.WebApp.BackButton.hide();
    }
    updateSwapButtonVisibility();
}

async function submitSearch() {
    const departure = document.getElementById('departure-text').textContent.trim();
    const arrival = document.getElementById('arrival-text').textContent.trim();
    const dateInput = document.getElementById('date').value.trim();
    const seats = document.getElementById('seats').value.trim();

    if (departure === 'Місце відправлення' || arrival === 'Місце прибуття' || !dateInput || !seats) {
        return alert('Заповніть усі поля!');
    }
    if (departure.length > 255 || arrival.length > 255) {
        return alert('Назви місць мають бути до 255 символів!');
    }

    let date;
    try {
        const [day, month, year] = dateInput.split('-');
        date = `${year}-${month}-${day}`;
    } catch (e) {
        return alert('Невірний формат дати!');
    }

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

        console.log('API response:', rides);

        const nonParsedRides = rides.filter(ride => !ride.is_parsed);
        const parsedRides = rides.filter(ride => ride.is_parsed);

        const sortByDepartureTime = (a, b) => new Date(a.departure_time) - new Date(b.departure_time);
        nonParsedRides.sort(sortByDepartureTime);
        parsedRides.sort(sortByDepartureTime);

        const sortedRides = [...nonParsedRides, ...parsedRides];

        const searchResults = document.getElementById('search-results');
        searchResults.innerHTML = sortedRides.length === 0
            ? '<div class="no-rides">Поїздок не знайдено.</div>'
            : sortedRides.map(ride => {
                const dt = new Date(ride.departure_time);
                const timeStr = dt.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
                const dateStr = dt.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });
                const isParsed = ride.is_parsed;
                console.log(`Ride ID: ${ride.id}, is_parsed: ${isParsed}, additional_info: ${ride.additional_info}, description: ${ride.description}`);
                return `
                    <div class="ride-item">
                        <div class="ride-top">
                            <div class="ride-route">
                                <p class="route">${ride.departure} → ${ride.arrival}</p>
                                <p>${timeStr}, ${dateStr}</p>
                                ${!isParsed ? `<p>Місць: ${ride.seats_available}/${ride.seats_total}</p>` : ''}
                                ${isParsed ? `<p class="description">Опис: ${ride.additional_info || 'відсутній'}</p>` : (!isParsed && ride.description ? `<p class="description">Опис: ${ride.description}</p>` : '')}
                                ${!isParsed ? `<p>Водій: ${ride.driver_name} ★ ${ride.driver_rating.toFixed(1)}</p>` : `<p>Водій: ${ride.driver_name}</p>`}
                            </div>
                            ${!isParsed ? `<div class="price-tag">${ride.price} ₴</div>` : ''}
                        </div>
                        ${!isParsed ? `<button class="book-button" onclick="bookRide(${ride.id}, ${seats}, '${ride.driver_telegram_id}')">Забронювати</button>` 
                                    : `<a class="book-button" href="${ride.description}" target="_blank" style="text-decoration: none; text-align: center; display: flex; justify-content: center; align-items: center;">Перейти до чату</a>`}
                    </div>`;
            }).join('');

        document.getElementById('search-results-title').textContent = `${departure} → ${arrival}`;

        const titleBox = document.querySelector('#search-results-page .my-rides-title-box');
        const oldSubtitle = titleBox.querySelector('p');
        if (oldSubtitle) oldSubtitle.remove();

        const subtitle = document.createElement('p');
        subtitle.style.margin = '4px 0 0';
        subtitle.style.fontSize = '14px';
        subtitle.style.color = 'var(--text-color, #555)';
        const seatsNumber = parseInt(seats);
        const seatWord = seatsNumber === 1 ? 'пасажир' : (seatsNumber >= 2 && seatsNumber <= 4 ? 'пасажири' : 'пасажирів');
        subtitle.textContent = `${formatShortDate(date)}, ${seatsNumber} ${seatWord}`;
        titleBox.appendChild(subtitle);

        saveSearchHistory({ departure, arrival, date, seats });

        navigate('search-results');
    } catch (err) {
        alert('Помилка при пошуку поїздок: ' + err.message);
    }
}

function updateSwapButtonVisibility() {
    const departure = document.getElementById('departure-text').textContent.trim();
    const arrival = document.getElementById('arrival-text').textContent.trim();
    const swapButton = document.querySelector('.swap-button');
    swapButton.classList.toggle('visible', departure !== 'Місце відправлення' || arrival !== 'Місце прибуття');
}