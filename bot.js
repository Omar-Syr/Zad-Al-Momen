// 1. رابط خادم الأمان الخاص بك في Cloudflare
const WORKER_URL = "https://zad-bot-proxy.almohanadgamer.workers.dev";

// 2. مصفوفة الذاكرة المستمرة
let chatHistory = JSON.parse(localStorage.getItem('zad_chat_history')) || [];

// 3. تعليمات النظام (System Instruction)
const SYSTEM_INSTRUCTION = "أنت باحث شرعي ومفتي رقمي مساعد في موقع 'زاد المؤمن'. مهمتك الإجابة على أسئلة المستخدمين الدينية بكل أدب واحترام. يُلزم عليك دائماً وأبداً دعم جميع الفتاوى والأحكام والخطوات بذكر الأدلة الشرعية الصريحة والمباشرة من آيات القرآن الكريم والأحاديث النبوية الصحيحة مع ذكر تخريج الحديث (مثل: رواه البخاري، رواه مسلم، صححه الألباني). قدم الإجابات بأسلوب ميسر ومنظم ودقيق شرعياً وايضا اعتمد من مصادر السُنة مثل ابن باز وابن عثيمين وعثمان الخميس وغيرهم واذكر المصادر دائما.";

document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');

    if (!chatForm || !chatInput || !chatMessages) return;

    // إعادة طباعة المحادثات السابقة تلقائياً عند فتح الصفحة
    if (chatHistory.length > 0) {
        chatMessages.innerHTML = '';
        chatHistory.forEach(msg => {
            appendBotMessage(msg.content, msg.role === 'user' ? 'user' : 'bot');
        });
    }

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

        chatHistory.push({ role: "user", content: userText });
        localStorage.setItem('zad_chat_history', JSON.stringify(chatHistory));

        const messagesPayload = [
            { role: "system", content: SYSTEM_INSTRUCTION },
            ...chatHistory.slice(-10)
        ];

        try {
            // الاتصال بخادم Cloudflare الآمن (بدون أي مفتاح في الكود)
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
            const botResponse = data.choices[0].message.content;

            if (loadingDiv) loadingDiv.remove();
            appendBotMessage(botResponse, 'bot');

            chatHistory.push({ role: "assistant", content: botResponse });
            localStorage.setItem('zad_chat_history', JSON.stringify(chatHistory));

        } catch (error) {
            console.error('تفاصيل الخطأ كاملاً:', error);
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
            msgDiv.style.cssText = "background: #d6a85c; color: #1a1200; padding: 10px 14px; border-radius: 14px 14px 0 14px; align-self: flex-end; max-width: 85%; font-weight: bold; font-size: 0.9rem; line-height: 1.6;";
        } else {
            msgDiv.style.cssText = "background: rgba(255,255,255,0.06); color: #f3efe3; padding: 10px 14px; border-radius: 14px 14px 14px 0; align-self: flex-start; max-width: 85%; font-size: 0.9rem; line-height: 1.6;";
        }

        msgDiv.innerHTML = text.replace(/\n/g, '<br>');
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return msgDiv;
    }
});