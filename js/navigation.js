function navigate(page) {
    if (isModalOpen) {
        closeModal();
    } else if (isDriverRideModalOpen) {
        closeDriverRideModal();
    }

    // Якщо нова сторінка та сама, що й поточна, нічого не робимо
    if (currentPage === page) {
        return;
    }

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    document.querySelector(`.nav-item[onclick="navigate('${page}')"]`).classList.add('active');

    const pages = document.querySelectorAll('.page');
    const currentActivePage = document.querySelector('.page.active');
    const newPage = document.getElementById(`${page}-page`);

    // Якщо є активна сторінка, приховуємо її з анімацією
    if (currentActivePage) {
        currentActivePage.style.opacity = '0';
        currentActivePage.style.transform = 'translateX(-20px)'; // Зміщення вліво при зникненні
        setTimeout(() => {
            currentActivePage.classList.remove('active');
            currentActivePage.style.display = 'none'; // Приховуємо після анімації
            // Показуємо нову сторінку
            newPage.style.display = 'block';
            setTimeout(() => {
                newPage.classList.add('active');
            }, 10); // Невелика затримка для коректного відображення
        }, 300); // Затримка відповідає тривалості transition (0.3s)
    } else {
        // Якщо немає активної сторінки, просто показуємо нову
        newPage.style.display = 'block';
        setTimeout(() => {
            newPage.classList.add('active');
        }, 10);
    }

    currentPage = page;
    window.history.pushState({ page }, document.title);

    if (page === 'my-rides') {
        loadMyRides();
    }
}