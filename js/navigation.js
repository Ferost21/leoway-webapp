const pages = ['search', 'create', 'my-rides', 'profile', 'search-results', 'driver-ride-details', 'passenger-info'];
let isNavigating = false;

function navigate(page, params = {}) {
    if (isNavigating) {
        console.info(`Navigation to ${page} skipped due to ongoing navigation`);
        return;
    }
    isNavigating = true;

    if (!pages.includes(page)) {
        console.error(`Page ${page} not found`);
        navigate('search');
        isNavigating = false;
        return;
    }

    const currentActivePage = document.querySelector('.page.active');
    const newPage = document.getElementById(`${page}-page`);

    if (!newPage) {
        console.error(`Page element #${page}-page not found`);
        navigate('search');
        isNavigating = false;
        return;
    }

    if (['search', 'create', 'my-rides', 'profile'].includes(page)) {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => item.classList.remove('active'));
        const navItem = document.querySelector(`.nav-item[onclick="navigate('${page}')"]`);
        if (navItem) navItem.classList.add('active');
    }

    if (currentActivePage) {
        currentActivePage.classList.add('fade-out');
        setTimeout(() => {
            document.querySelectorAll('.page').forEach(p => {
                p.classList.remove('active', 'fade-out', 'fade-in');
                p.style.display = 'none';
            });
            newPage.style.display = 'block';
            newPage.classList.add('active', 'fade-in');
            isNavigating = false;
        }, 300);
    } else {
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active', 'fade-in');
            p.style.display = 'none';
        });
        newPage.style.display = 'block';
        newPage.classList.add('active', 'fade-in');
        isNavigating = false;
    }

    let hash = `#${page}`;
    if (page === 'driver-ride-details' && params.rideId) {
        hash = `#my-rides/${params.rideId}`;
    } else if (page === 'search-results' && params.departure && params.arrival && params.date && params.seats) {
        hash = `#search-results/${encodeURIComponent(params.departure)}/${encodeURIComponent(params.arrival)}/${params.date}/${params.seats}`;
    } else if (page === 'passenger-info' && params.rideId && params.bookingId) {
        hash = `#my-rides/${params.rideId}/${params.bookingId}`;
    }
    history.pushState({ page, ...params }, '', hash);

    if (['search-results', 'driver-ride-details', 'passenger-info'].includes(page)) {
        Telegram.WebApp.BackButton.show();
    } else {
        Telegram.WebApp.BackButton.hide();
    }

    if (page === 'my-rides') {
        loadMyRides();
    } else if (page === 'profile') {
        loadProfile();
    } else if (page === 'driver-ride-details' && params.rideId && !newPage.classList.contains('active')) {
        const rideItem = document.querySelector(`.ride-item[data-ride-id="${params.rideId}"]`);
        if (rideItem) {
            rideItem.click();
        } else {
            console.error(`No ride-item found for rideId: ${params.rideId}`);
        }
    }
}

window.addEventListener('load', () => {
    const hash = location.hash.replace('#', '');
    if (!hash) {
        navigate('search');
        return;
    }

    const [page, rideId, bookingId] = hash.split('/');
    if (pages.includes(page)) {
        navigate(page, { rideId, bookingId });
    } else if (page === 'my-rides' && rideId) {
        if (bookingId) {
            navigate('passenger-info', { rideId, bookingId });
        } else {
            navigate('driver-ride-details', { rideId });
        }
    } else {
        navigate('search');
    }
});

window.addEventListener('popstate', () => {
    const hash = location.hash.replace('#', '');
    if (!hash) {
        navigate('search');
        return;
    }

    const [page, rideId, bookingId] = hash.split('/');
    if (pages.includes(page)) {
        navigate(page, { rideId, bookingId });
    } else if (page === 'my-rides' && rideId) {
        if (bookingId) {
            navigate('passenger-info', { rideId, bookingId });
        } else {
            navigate('driver-ride-details', { rideId });
        }
    } else {
        navigate('search');
    }
});

Telegram.WebApp.BackButton.onClick(() => {
    history.back();
});