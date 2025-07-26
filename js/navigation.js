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
    const current = document.querySelector('.page.fade-in');
    const next = document.getElementById(`${page}-page`);

    if (current === next) return;

    if (current) {
        current.classList.remove('fade-in');
        current.style.zIndex = 0;
    }

    next.classList.add('fade-in');
    next.style.zIndex = 1;

    currentPage = page;
    window.history.pushState({ page }, document.title);

    if (page === 'my-rides') {
        loadMyRides();
    }
}
