function loadProfile() {
    const user = webApp.initDataUnsafe.user;
    if (user && user.id) {
        const profilePhoto = document.getElementById('profile-photo');
        const profileName = document.getElementById('profile-name');
        const profileRating = document.getElementById('profile-rating');

        profileName.textContent = user.first_name || 'Невідомий користувач';

        fetchRating(user.id).then(rating => {
            profileRating.textContent = `Рейтинг: ★${rating || 'N/A'}`;
        });

        if (user.photo_url) {
            profilePhoto.src = user.photo_url;
        } else {
            profilePhoto.src = 'https://via.placeholder.com/100';
        }
    }
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