/* * 文件名: ai-tutor.js
 * 作用: 注入 Coze 智能体悬浮窗（支持 ID 持久化、昵称自定义与移动端适配）
 */

// 1. 动态加载 Coze 官方 SDK 脚本
const script = document.createElement('script');
script.src = "https://lf-cdn.coze.cn/obj/unpkg/flow-platform/chat-app-sdk/1.2.0-beta.20/libs/cn/index.js";
// 新增：如果脚本加载失败（网络断开或被拦截），给用户弹窗或提示重试
script.onerror = () => {
    // 这里可以使用原生 alert，或者你在页面上写个好看的 Toast 提示
    const retry = confirm("🧬 AI 助教加载失败（可能是网络波动）。是否立即刷新重试？");
    if (retry) {
        window.location.reload();
    }
};
document.head.appendChild(script);

// 2. 脚本加载完后初始化
script.onload = () => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCozeChat);
    } else {
        initCozeChat();
    }
};

/**
 * 获取或创建持久化的用户 ID，确保刷新页面后聊天记录不丢失
 */
function getPersistentUserId() {
    const STORAGE_KEY = 'coze_ai_user_id';
    let userId = localStorage.getItem(STORAGE_KEY);
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        localStorage.setItem(STORAGE_KEY, userId);
    }
    return userId;
}

function initCozeChat() {
    // ⚠️ 确保这里的 BOT_ID 与你 Coze 后台一致
    const BOT_ID = '7607014136635408422'; 
    const API_TOKEN = 'pat_h0rjXU2Y5Ss7nVVwAVYg5mYwf55eWnMmHo5CQnDxeOpAFFSNo4Bhl2oEJ9mfgHzU'; 

    // 检测是否为移动端
    const isMobile = window.innerWidth < 600;

    new CozeWebSDK.WebChatClient({
        config: {
            type: 'bot',
            bot_id: BOT_ID,
            isIframe: false,
        },
        auth: {
            type: 'token',
            token: API_TOKEN,
            onRefreshToken: async () => API_TOKEN
        },
        userInfo: {
            id: getPersistentUserId(), // 使用 localStorage 存储的 ID
            url: 'https://lf-coze-web-cdn.coze.cn/obj/eden-cn/lm-lgvj/ljhwZthlaukjlkulzlp/coze/coze-logo.png',
            nickname: '同学', 
        },
        ui: {
            base: {
                icon: 'https://lf-coze-web-cdn.coze.cn/obj/eden-cn/lm-lgvj/ljhwZthlaukjlkulzlp/coze/chatsdk-logo.png',
                layout: isMobile ? 'mobile' : 'pc', 
                lang: 'zh-CN', 
                zIndex: 9999, 
            },
            header: {
                isShow: true,
                isNeedClose: true,
            },
            asstBtn: {
                isNeed: true
            },
            footer: {
                isShow: false, // 隐藏底部推广信息
                expressionText: '', // 按照最新 SDK 结构补充
            },
            chatBot: {
                title: '🧬 表观遗传 AI 助教',
                uploadable: true, 
                width: isMobile ? window.innerWidth : 390, 
            },
        },
    });
}