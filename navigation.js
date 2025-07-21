function navigate(page) {
    if (isModalOpen) {
        closeModal();
    } else if (isDriverRideModalOpen) {
        closeDriverRideModal();
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

window.addEventListener('popstate', (event) => {
    const modal = document.getElementById('modal');
    const driverRideModal = document.getElementById('driver-ride-modal');
    if (event.state && event.state.driverRideModalOpen && isDriverRideModalOpen) {
        closeDriverRideModal();
    } else if (event.state && event.state.modalOpen && isModalOpen) {
        closeModal();
    } else {
        navigate(event.state?.page || 'search');
    }
});