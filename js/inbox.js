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
                    return { ...conversation, photo_url: 'https://t.me/i/userpic/320/default.svg' };
                }
            } catch (err) {
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

        // ✅ Зберігаємо у localStorage
        localStorage.setItem(`conversations_${tgId}`, JSON.stringify(conversationsWithPhotos));

        // Синхронізація відкладених повідомлень
        syncPendingMessages();
    } catch (err) {
        console.error('Помилка при завантаженні розмов:', err.message);

        const cached = localStorage.getItem(`conversations_${tgId}`);
        if (cached) {
            const conversations = JSON.parse(cached);
            conversationList.innerHTML = renderConversations(conversations);
        } else {
            conversationList.innerHTML = `<div class="no-messages">Немає з'єднання і немає збережених чатів.</div>`;
        }

        const scrollableContent = document.querySelector('#inbox-page .scrollable-content');
        scrollableContent.classList.add('no-messages-container');
    }
}

function renderConversations(conversations) {
    return conversations.map(conversation => {
        const lastMessage = conversation.last_message || 'Немає повідомлень';
        const lastMessageTime = conversation.last_message_time
            ? new Date(conversation.last_message_time)
            : null;
        let formattedTime = '';

        if (lastMessageTime) {
            const now = new Date();
            const diffDays = Math.floor((now - lastMessageTime) / (1000 * 60 * 60 * 24));
            const weekday = lastMessageTime.toLocaleString('uk-UA', { weekday: 'short' }).slice(0, 2);

            if (diffDays === 0) {
                formattedTime = lastMessageTime.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
            } else if (diffDays === 1) {
                formattedTime = 'Вчора';
            } else if (diffDays > 1 && diffDays <= 7) {
                formattedTime = weekday;
            } else {
                formattedTime = lastMessageTime.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });
            }
        }

        const isUnread = conversation.unread_count > 0;

        return `
            <div class="conversation-item${isUnread ? ' unread' : ''}" onclick="navigate('chat', { chatId: ${conversation.chat_id}, contactName: '${conversation.contact_name}', bookingId: ${conversation.booking_id}, rideId: ${conversation.ride_id} })">
                <img src="${conversation.photo_url}" alt="Contact Photo" class="conversation-photo">
                <div class="conversation-info">
                    <div class="conversation-header">
                        <h3>${conversation.contact_name}</h3>
                        <p class="booking-id">Бронювання №${conversation.booking_id}</p>
                    </div>
                    <div class="conversation-last-message">
                        <p class="last-message">${lastMessage}</p>
                        <p class="last-message-time">${formattedTime}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function loadChat(params) {
    const { chatId, contactName, bookingId, rideId } = params;
    const chatMessages = document.getElementById('chat-messages');
    const sendButton = document.getElementById('send-message-btn');
    const messageInput = document.getElementById('message-input');
    const chatContactPhoto = document.getElementById('chat-contact-photo');
    const chatContactName = document.getElementById('chat-contact-name');
    const chatBookingId = document.getElementById('chat-booking-id');
    const chatRideDetails = document.getElementById('chat-ride-details');

    chatContactName.textContent = contactName;
    chatBookingId.textContent = `Бронювання №${bookingId}`;

    try {
        const tgId = webApp.initDataUnsafe.user?.id;
        const resMessages = await fetch(`${API_BASE_URL}/api/messages?chatId=${chatId}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });

        if (!resMessages.ok) throw new Error('Не вдалося отримати повідомлення');

        const messages = await resMessages.json();
        chatMessages.innerHTML = messages.length === 0
            ? '<div class="no-messages">Повідомлення відсутні.</div>'
            : renderMessages(messages);

        chatMessages.scrollTop = chatMessages.scrollHeight;

        // ✅ Зберігаємо локально
        localStorage.setItem(`chat_${chatId}`, JSON.stringify(messages));

        sendButton.onclick = () => sendMessage(chatId, bookingId, rideId);
        messageInput.onkeypress = (e) => {
            if (e.key === 'Enter') sendMessage(chatId, bookingId, rideId);
        };
    } catch (err) {
        console.error('Помилка при завантаженні чату:', err.message);

        const cached = localStorage.getItem(`chat_${chatId}`);
        if (cached) {
            const messages = JSON.parse(cached);
            chatMessages.innerHTML = renderMessages(messages);
        } else {
            chatMessages.innerHTML = `<div class="no-messages">Немає з'єднання і немає збережених повідомлень.</div>`;
        }
    }
}

function renderMessages(messages) {
    const tgId = webApp.initDataUnsafe.user?.id;
    const messagesByDate = messages.reduce((acc, message) => {
        const messageDate = new Date(message.sent_at).toLocaleDateString('uk-UA', {
            day: '2-digit',
            month: 'long'
        });
        if (!acc[messageDate]) acc[messageDate] = [];
        acc[messageDate].push(message);
        return acc;
    }, {});

    return Object.entries(messagesByDate).map(([date, dateMessages]) => {
        const messageHtml = dateMessages.map(message => {
            const isSentByUser = message.sender_id === tgId;
            const sentTime = message.sent_at
                ? new Date(message.sent_at).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
                : 'Невідомий час';
            const readIndicator = isSentByUser ? `<span class="message-read-indicator">${message.is_read ? '✔✔' : '✔'}</span>` : '';

            return `
                <div class="message ${isSentByUser ? 'sent' : 'received'}">
                    <p>${message.content}</p>
                    <span class="message-time">${sentTime}${readIndicator}</span>
                </div>
            `;
        }).join('');
        return `
            <div class="message-date-header">${date}</div>
            ${messageHtml}
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
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify({ chatId, senderId: tgId, bookingId, rideId, content, initData })
        });

        if (!res.ok) throw new Error('Помилка при надсиланні повідомлення');

        messageInput.value = '';
        loadChat({ chatId, contactName: '', bookingId, rideId });
    } catch (err) {
        console.warn('Немає інтернету, зберігаю повідомлення локально');
        const pending = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
        pending.push({ chatId, bookingId, rideId, senderId: tgId, content, sent_at: new Date().toISOString() });
        localStorage.setItem('pendingMessages', JSON.stringify(pending));

        chatMessages.innerHTML += `
            <div class="message sent">
                <p>${content}</p>
                <span class="message-time">Відправиться при з'єднанні</span>
            </div>
        `;
        messageInput.value = '';
    }
}

async function syncPendingMessages() {
    const pending = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
    if (pending.length === 0) return;

    const stillPending = [];
    for (const msg of pending) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/send-message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                body: JSON.stringify(msg)
            });
            if (!res.ok) throw new Error('fail');
        } catch (err) {
            stillPending.push(msg);
        }
    }

    localStorage.setItem('pendingMessages', JSON.stringify(stillPending));
}
