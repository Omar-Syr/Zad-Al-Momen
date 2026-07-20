// 1. رابط خادم الأمان الخاص بك في Cloudflare
const WORKER_URL = "https://zad-bot-proxy.almohanadgamer.workers.dev";

// 2. تعليمات النظام (مع حصر السلام والمصادر)
const SYSTEM_INSTRUCTION = "أنت باحث شرعي ومفتي رقمي مساعد في موقع 'زاد المؤمن'. مهمتك الإجابة على أسئلة المستخدمين الدينية بكل أدب واحترام. يُلزم عليك دائماً وأبداً دعم جميع الفتاوى والأحكام والخطوات بذكر الأدلة الشرعية الصريحة والمباشرة من آيات القرآن الكريم والأحاديث النبوية الصحيحة مع ذكر تخريج الحديث (مثل: رواه البخاري، رواه مسلم، صححه الألباني). قدم الإجابات بأسلوب ميسر ومنظم ودقيق شرعياً، وأيضاً اعتمد على مصادر كبار علماء السنة مثل ابن باز وابن عثيمين وعثمان الخميس وغيرهم واذكر المصادر دائماً. تنبيه مهم جداً: لا تبدأ إجابتك بالسلام أو الترحيب (مثل: 'وعليكم السلام' أو 'أهلاً بك') إلا إذا ألقى عليك المستخدم السلام أولاً في رسالته، وابدأ في الإجابة عن السؤال مباشرة.";

// 3. إدارة الجلسات والأرشيف
let currentChatHistory = [];
let archivedChats = JSON.parse(localStorage.getItem('zad_archived_chats')) || [];

document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');

    if (!chatForm || !chatInput || !chatMessages) return;

    // --- نقل المحادثة السابقة للأرشيف عند دخول الموقع من جديد ---
    const lastActiveChat = JSON.parse(localStorage.getItem('zad_current_active_chat'));
    if (lastActiveChat && lastActiveChat.length > 0) {
        const timeString = new Date().toLocaleString('ar-SA', { 
            dateStyle: 'short', 
            timeStyle: 'short' 
        });
        
        archivedChats.unshift({
            id: Date.now(),
            date: timeString,
            messages: lastActiveChat
        });
        
        localStorage.setItem('zad_archived_chats', JSON.stringify(archivedChats));
        localStorage.removeItem('zad_current_active_chat'); // تصفير الشات الحالي
    }

    // --- إنشاء زر الخانة السابقة (سجل المحادثات) تلقائياً فوق الشات ---
    setupHistoryUI(chatMessages);

    // --- معالجة إرسال الرسائل ---
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userText = chatInput.value.trim();
        if (!userText) return;

        chatInput.disabled = true;
        const submitBtn = chatForm.querySelector('button');
        if (submitBtn) submitBtn.disabled = true;

        appendBotMessage(userText, 'user');
        chatInput.value = '';

        const loadingDiv = appendBotMessage('جاري التفكير وتحضير الرد مع الأدلة الشرعية...', 'bot', true);

        currentChatHistory.push({ role: "user", content: userText });
        localStorage.setItem('zad_current_active_chat', JSON.stringify(currentChatHistory));

        const messagesPayload = [
            { role: "system", content: SYSTEM_INSTRUCTION },
            ...currentChatHistory.slice(-10)
        ];

        try {
            const response = await fetch(WORKER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: messagesPayload,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            let botResponse = data.choices[0].message.content;

            // --- تنظيف السلام والترحيب برمجياً إذا لم يسلم المستخدم ---
            const userDidGreet = /سلام|مرحبا|أهلا|اهلا|مسي/i.test(userText);

            if (!userDidGreet) {
                // مسح السلام والترحيب من بداية النص فوراً
                botResponse = botResponse.replace(/^(وعليكم السلام ورحمة الله وبركاته|وعليكم السلام ورحمة الله|وعليكم السلام|السلام عليكم ورحمة الله وبركاته|السلام عليكم|أهلاً وسهلاً بك|أهلاً بك|مرحباً بك|مرحباً|أهلاً)[!،.\n\s]*/gi, '');
    
                //رفع أول حرف أو تنظيف أي أسطر فارغة نتجت عن الحذف
                botResponse = botResponse.trim();
}

            if (loadingDiv) loadingDiv.remove();
            appendBotMessage(botResponse, 'bot');

            currentChatHistory.push({ role: "assistant", content: botResponse });
            localStorage.setItem('zad_current_active_chat', JSON.stringify(currentChatHistory));

        } catch (error) {
            console.error('تفاصيل الخطأ:', error);
            if (loadingDiv) loadingDiv.remove();
            appendBotMessage('عذراً، حدث خطأ: ' + error.message, 'bot');
        } finally {
            chatInput.disabled = false;
            if (submitBtn) submitBtn.disabled = false;
            chatInput.focus();
        }
    });

    function appendBotMessage(text, sender, isLoading = false) {
        const msgDiv = document.createElement('div');
        
        if (sender === 'user') {
            msgDiv.style.cssText = "background: #d6a85c; color: #1a1200; padding: 10px 14px; border-radius: 14px 14px 0 14px; align-self: flex-end; max-width: 85%; font-weight: bold; font-size: 0.9rem; line-height: 1.6; margin-bottom: 8px;";
        } else {
            msgDiv.style.cssText = "background: rgba(255,255,255,0.06); color: #f3efe3; padding: 10px 14px; border-radius: 14px 14px 14px 0; align-self: flex-start; max-width: 85%; font-size: 0.9rem; line-height: 1.6; margin-bottom: 8px;";
        }

        msgDiv.innerHTML = text.replace(/\n/g, '<br>');
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return msgDiv;
    }

    // --- واجهة سجل المحادثات (Modal / Popup) ---
    function setupHistoryUI(container) {
        // إنشاء شريط الزر أقصى أعلى صندوق الشات
        const headerBar = document.createElement('div');
        headerBar.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; margin-bottom: 10px; background: rgba(0,0,0,0.2); border-radius: 8px;";
        
        headerBar.innerHTML = `
            <span style="font-size: 0.85rem; color: #d6a85c; font-weight: bold;">💬 محادثة جديدة</span>
            <button id="open-history-btn" style="background: rgba(214, 168, 92, 0.15); border: 1px solid #d6a85c; color: #d6a85c; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">📜 سجل المحادثات</button>
        `;

        container.parentNode.insertBefore(headerBar, container);

        // إنشاء النافذة المنبثقة للسجل
        const modal = document.createElement('div');
        modal.id = 'history-modal';
        modal.style.cssText = "display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 9999; justify-content: center; align-items: center; padding: 20px;";
        
        modal.innerHTML = `
            <div style="background: #181512; border: 1px solid #d6a85c; width: 100%; max-width: 500px; max-height: 80vh; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; color: #f3efe3;">
                <div style="padding: 12px 16px; background: rgba(214,168,92,0.1); border-bottom: 1px solid rgba(214,168,92,0.2); display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 1rem; color: #d6a85c;">📜 أرشيف المحادثات السابقة</h3>
                    <button id="close-history-btn" style="background: none; border: none; color: #aaa; font-size: 1.2rem; cursor: pointer;">✕</button>
                </div>
                <div id="history-list" style="padding: 16px; overflow-y: auto; flex: 1;"></div>
            </div>
        `;
        document.body.appendChild(modal);

        // فتح وإغلاق النافذة
        document.getElementById('open-history-btn').addEventListener('click', () => {
            renderHistoryList();
            modal.style.display = 'flex';
        });

        document.getElementById('close-history-btn').addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    function renderHistoryList() {
        const listContainer = document.getElementById('history-list');
        const archives = JSON.parse(localStorage.getItem('zad_archived_chats')) || [];

        if (archives.length === 0) {
            listContainer.innerHTML = `<p style="text-align: center; color: #888; font-size: 0.9rem;">لا توجد محادثات محفوظة في الأرشيف بعد.</p>`;
            return;
        }

        listContainer.innerHTML = archives.map((session, index) => {
            const firstMsg = session.messages.find(m => m.role === 'user')?.content || 'محادثة بدون عنوان';
            return `
                <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(214,168,92,0.15); padding: 10px; border-radius: 8px; margin-bottom: 10px;">
                    <div style="font-size: 0.75rem; color: #d6a85c; margin-bottom: 4px;">📅 ${session.date}</div>
                    <div style="font-size: 0.85rem; color: #eee; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${firstMsg}</div>
                    <details style="margin-top: 8px; font-size: 0.8rem; color: #ccc;">
                        <summary style="cursor: pointer; color: #d6a85c;">عرض المحادثة كاملة</summary>
                        <div style="margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">
                            ${session.messages.map(m => `
                                <div style="margin-bottom: 6px;">
                                    <strong style="color: ${m.role === 'user' ? '#d6a85c' : '#7aa2f7'}">${m.role === 'user' ? 'المستخدم:' : 'تبصرة:'}</strong>
                                    <div>${m.content.replace(/\n/g, '<br>')}</div>
                                </div>
                            `).join('')}
                        </div>
                    </details>
                </div>
            `;
        }).join('');
    }
});