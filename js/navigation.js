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
    const currentActive = document.querySelector('.page.active');
    const nextPage = document.getElementById(`${page}-page`);

    if (currentActive !== nextPage) {
        if (currentActive) {
            currentActive.classList.remove('active');
        }

        // Затримка, щоб спрацював fade-out
        setTimeout(() => {
            pages.forEach(p => {
                if (p !== nextPage) {
                    p.style.display = 'none';
                }
            });

            nextPage.style.display = 'block';
            requestAnimationFrame(() => {
                nextPage.classList.add('active');
            });

            currentPage = page;
            window.history.pushState({ page }, document.title);

            if (page === 'my-rides') {
                loadMyRides();
            }
        }, 50); // Мінімальна затримка для плавного переходу
    }
}
