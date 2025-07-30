async function loadInbox(params = {}) {
    const tgId = webApp.initDataUnsafe.user?.id;
    if (!tgId) {
        document.getElementById('conversation-list').innerHTML = '<div class="no-messages">Не вдалося отримати ваш Telegram ID!</div>';
        const scrollableContent = document.querySelector('#inbox-page .scrollable-content');
        scrollableContent.classList.add('no-messages-container');
        console.error('Не вдалося отримати Telegram ID');
        return;
    }

    const conversationList = document.getElementById('conversation-list');

    try {
        const res = await fetch(`${API_BASE_URL}/api/chats?tgId=${tgId}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });

        if (!res.ok) throw new Error('Не вдалося отримати ваші розмови');

        const conversations = await res.json();
        const scrollableContent = document.querySelector('#inbox-page .scrollable-content');

        // Fetch passenger photos for each conversation
        const conversationsWithPhotos = await Promise.all(conversations.map(async (conversation) => {
            try {
                const resPassengers = await fetch(`${API_BASE_URL}/api/ride-passengers?rideId=${conversation.ride_id}&tgId=${tgId}`, {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                });
                if (resPassengers.ok) {
                    const passengers = await resPassengers.json();
                    const passenger = passengers.find(p => p.booking_id === conversation.booking_id);
                    return {
                        ...conversation,
                        photo_url: passenger?.photo_url || 'https://t.me/i/userpic/320/default.svg'
                    };
                } else {
                    console.warn(`Failed to fetch passenger photo for bookingId: ${conversation.booking_id}`);
                    return { ...conversation, photo_url: 'https://t.me/i/userpic/320/default.svg' };
                }
            } catch (err) {
                console.error(`Error fetching photo for bookingId: ${conversation.booking_id}`, err.message);
                return { ...conversation, photo_url: 'https://t.me/i/userpic/320/default.svg' };
            }
        }));

        conversationList.innerHTML = conversationsWithPhotos.length === 0
            ? '<div class="no-messages">Розмови відсутні.</div>'
            : renderConversations(conversationsWithPhotos);

        if (conversationsWithPhotos.length === 0) {
            scrollableContent.classList.add('no-messages-container');
        } else {
            scrollableContent.classList.remove('no-messages-container');
        }

        scrollableContent.scrollTop = 0;
    } catch (err) {
        console.error('Помилка при завантаженні розмов:', err.message);
        conversationList.innerHTML = `<div class="no-messages">Помилка при завантаженні розмов: ${err.message}</div>`;
        const scrollableContent = document.querySelector('#inbox-page .scrollable-content');
        scrollableContent.classList.add('no-messages-container');
    }
}

function renderConversations(conversations) {
    console.log('Rendering conversations:', conversations);
    return conversations.map(conversation => {
        const lastMessage = conversation.last_message || 'Немає повідомлень';
        const lastMessageTime = conversation.last_message_time
            ? new Date(conversation.last_message_time).toLocaleString('uk-UA', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            })
            : '';
        return `
            <div class="conversation-item" onclick="navigate('chat', { chatId: ${conversation.chat_id}, contactName: '${conversation.contact_name}', bookingId: ${conversation.booking_id}, rideId: ${conversation.ride_id} })">
                <img src="${conversation.photo_url}" alt="Contact Photo" class="conversation-photo">
                <div class="conversation-info">
                    <div class="conversation-header">
                        <h3>${conversation.contact_name}</h3>
                        <p class="booking-id">Бронювання №${conversation.booking_id}</p>
                    </div>
                    <div class="conversation-content">
                        <p class="last-message">${lastMessage}</p>
                        <p class="last-message-time">${lastMessageTime}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function loadChat(params) {
    console.log(`loadChat called with params:`, params);
    const { chatId, contactName, bookingId, rideId } = params;
    const chatPage = document.getElementById('chat-page');
    const chatMessages = document.getElementById('chat-messages');
    const sendButton = document.getElementById('send-message-btn');
    const messageInput = document.getElementById('message-input');
    const chatContactPhoto = document.getElementById('chat-contact-photo');
    const chatContactName = document.getElementById('chat-contact-name');
    const chatBookingId = document.getElementById('chat-booking-id');
    const chatRideDetails = document.getElementById('chat-ride-details');

    if (!chatPage || !chatMessages || !sendButton || !messageInput || !chatContactPhoto || !chatContactName || !chatBookingId || !chatRideDetails) {
        console.error('One or more DOM elements are missing:', {
            chatPage: !!chatPage,
            chatMessages: !!chatMessages,
            sendButton: !!sendButton,
            messageInput: !!messageInput,
            chatContactPhoto: !!chatContactPhoto,
            chatContactName: !!chatContactName,
            chatBookingId: !!chatBookingId,
            chatRideDetails: !!chatRideDetails
        });
        navigate('inbox');
        return;
    }

    // Зберігаємо параметри в dataset
    chatPage.dataset.chatId = chatId;
    chatPage.dataset.contactName = contactName;
    chatPage.dataset.bookingId = bookingId;
    chatPage.dataset.rideId = rideId;

    // Встановлюємо ім’я та номер бронювання
    chatContactName.textContent = contactName;
    chatBookingId.textContent = `Бронювання №${bookingId}`;

    try {
        // Завантажуємо фото співрозмовника
        const tgId = webApp.initDataUnsafe.user?.id;
        const resPassengers = await fetch(`${API_BASE_URL}/api/ride-passengers?rideId=${rideId}&tgId=${tgId}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        if (resPassengers.ok) {
            const passengers = await resPassengers.json();
            const passenger = passengers.find(p => p.booking_id === bookingId);
            chatContactPhoto.src = passenger?.photo_url || 'https://t.me/i/userpic/320/default.svg';
        } else {
            console.warn(`Failed to fetch passenger photo: ${resPassengers.status} ${resPassengers.statusText}`);
            chatContactPhoto.src = 'https://t.me/i/userpic/320/default.svg';
        }

        // Завантажуємо інформацію про поїздку
        const resRide = await fetch(`${API_BASE_URL}/api/ride-details?rideId=${rideId}&tgId=${tgId}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        if (resRide.ok) {
            const ride = await resRide.json();
            chatRideDetails.innerHTML = `
                <p><strong>Звідки:</strong> ${ride.departure}</p>
                <p><strong>Куди:</strong> ${ride.arrival}</p>
                <p><strong>Дата:</strong> ${new Date(ride.date).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                <p><strong>Час:</strong> ${ride.time}</p>
                <p><strong>Кількість місць:</strong> ${ride.seats}</p>
            `;
        } else {
            console.warn(`Failed to fetch ride details: ${resRide.status} ${resRide.statusText}`);
            chatRideDetails.innerHTML = '<p>Не вдалося завантажити інформацію про поїздку.</p>';
        }

        // Завантажуємо повідомлення
        const resMessages = await fetch(`${API_BASE_URL}/api/messages?chatId=${chatId}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });

        if (!resMessages.ok) throw new Error('Не вдалося отримати повідомлення');

        const messages = await resMessages.json();
        console.log(`Fetched ${messages.length} messages for chatId: ${chatId}`);
        chatMessages.innerHTML = messages.length === 0
            ? '<div class="no-messages">Повідомлення відсутні.</div>'
            : renderMessages(messages);

        // Скролимо донизу
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Налаштування відправки повідомлення
        sendButton.onclick = () => sendMessage(chatId, bookingId, rideId);
        messageInput.onkeypress = (e) => {
            if (e.key === 'Enter') sendMessage(chatId, bookingId, rideId);
        };

        // Обробка фокусу на message-input для мобільних пристроїв
        messageInput.onfocus = () => {
            setTimeout(() => {
                chatMessages.scrollTop = chatMessages.scrollHeight;
                messageInput.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 300);
        };

        // Обробка зміни розміру екрана
        const handleResize = () => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        };
        window.addEventListener('resize', handleResize);

        // Очищення слухача при закритті чату
        chatPage.addEventListener('remove', () => {
            window.removeEventListener('resize', handleResize);
        }, { once: true });
    } catch (err) {
        console.error('Помилка при завантаженні чату:', err.message);
        chatMessages.innerHTML = `<div class="no-messages">Помилка при завантаженні чату: ${err.message}</div>`;
    }
}

function renderMessages(messages) {
    const tgId = webApp.initDataUnsafe.user?.id;
    return messages.map(message => {
        const isSentByUser = message.sender_id === tgId;
        const messageTime = new Date(message.sent_at).toLocaleString('uk-UA', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        return `
            <div class="message ${isSentByUser ? 'sent' : 'received'}">
                <p>${message.content}</p>
                <span class="message-time">${messageTime}</span>
            </div>
        `;
    }).join('');
}

async function sendMessage(chatId, bookingId, rideId) {
    const tgId = webApp.initDataUnsafe.user?.id;
    const initData = webApp.initData || '';
    const messageInput = document.getElementById('message-input');
    const chatMessages = document.getElementById('chat-messages');
    const content = messageInput.value.trim();

    if (!tgId) {
        alert('Не вдалося отримати ваш Telegram ID!');
        return;
    }
    if (!content) {
        alert('Введіть повідомлення!');
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/send-message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ chatId, senderId: tgId, bookingId, rideId, content, initData })
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || 'Помилка при надсиланні повідомлення');
        }

        messageInput.value = '';
        const resMessages = await fetch(`${API_BASE_URL}/api/messages?chatId=${chatId}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });

        if (!resMessages.ok) throw new Error('Не вдалося оновити повідомлення');

        const messages = await resMessages.json();
        chatMessages.innerHTML = messages.length === 0
            ? '<div class="no-messages">Повідомлення відсутні.</div>'
            : renderMessages(messages);

        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (err) {
        alert('Помилка при надсиланні повідомлення: ' + err.message);
    }
}
