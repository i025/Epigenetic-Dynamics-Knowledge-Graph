/* * 文件名: ai-tutor.js
 * 作用: 注入 Coze 智能体 (采用纯前端 OAuth PKCE 安全鉴权)
 */

// --- 配置区域 ---
const BOT_ID = '7607014136635408422'; 
// 🔥 已经替换为你提供的完整准确的 Client ID
const CLIENT_ID = '26718239802340396620616277975086.app.coze'; 
// 确保这个地址和你在 Coze 后台填写的重定向地址完全一致！
const REDIRECT_URI = window.location.href.split('?')[0]; 

// --- Coze API 地址 ---
const AUTH_URL = 'https://api.coze.cn/api/permission/oauth2/authorize';
const TOKEN_URL = 'https://api.coze.cn/api/permission/oauth2/token';

// 1. 加载 SDK
const script = document.createElement('script');
script.src = "https://lf-cdn.coze.cn/obj/unpkg/flow-platform/chat-app-sdk/1.2.0-beta.20/libs/cn/index.js";
document.head.appendChild(script);

script.onload = () => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAuthAndInit);
    } else {
        checkAuthAndInit();
    }
};

// --- PKCE 核心加密算法 ---
function generateRandomString(length) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('').substring(0, length);
}

async function generateCodeChallenge(codeVerifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// --- 授权与初始化流程 ---
async function checkAuthAndInit() {
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');
    let accessToken = sessionStorage.getItem('coze_access_token');

    // 场景 A：已经有 Token，直接启动聊天框
    if (accessToken) {
        initCozeChat(accessToken);
        // 清理网址上残留的 ?code=xxx
        if (authCode) window.history.replaceState({}, document.title, REDIRECT_URI);
        return;
    }

    // 场景 B：刚才跳走登录了，现在带着 code 跳回来了，去换取 Token
    if (authCode) {
        const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
        if (!codeVerifier) {
            alert('授权状态丢失，请重新登录');
            return;
        }

        try {
            const response = await fetch(TOKEN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: CLIENT_ID,
                    grant_type: 'authorization_code',
                    code: authCode,
                    redirect_uri: REDIRECT_URI,
                    code_verifier: codeVerifier
                })
            });

            const data = await response.json();
            if (data.access_token) {
                sessionStorage.setItem('coze_access_token', data.access_token);
                window.history.replaceState({}, document.title, REDIRECT_URI);
                initCozeChat(data.access_token);
            } else {
                console.error("Token 获取失败:", data);
                alert("换取 Token 失败，请检查控制台报错。");
            }
        } catch (error) {
            console.error("请求 Token 时出错:", error);
        }
        return;
    }

    // 场景 C：第一次打开，没有 Token 也没有 Code，生成登录按钮
    createLoginButton();
}

// --- 触发登录跳转 ---
async function startAuth() {
    const codeVerifier = generateRandomString(64);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    // 存下 verifier，等跳回来的时候要用
    sessionStorage.setItem('pkce_code_verifier', codeVerifier);

    const authUrl = `${AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=xyz&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    
    // 强行把页面跳走到 Coze 去授权
    window.location.href = authUrl;
}

// --- 创建一个临时的登录按钮 ---
function createLoginButton() {
    const btn = document.createElement('button');
    btn.innerText = "👉 点击验证学生身份以启动 AI 助教";
    btn.style.cssText = "position: fixed; bottom: 20px; right: 20px; padding: 12px 20px; background: #4e54c8; color: white; border: none; border-radius: 8px; z-index: 9999; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2);";
    btn.onclick = () => {
        btn.innerText = "正在跳转安全验证...";
        startAuth();
    };
    document.body.appendChild(btn);
}

// --- 最终用拿到的合法 Token 启动聊天框 ---
function initCozeChat(validToken) {
    const isMobile = window.innerWidth < 600;

    new CozeWebSDK.WebChatClient({
        config: {
            type: 'bot',
            bot_id: BOT_ID,
            isIframe: false,
        },
        auth: {
            type: 'token',
            token: validToken, // 使用我们辛苦换来的安全 Token
            onRefreshToken: async () => validToken
        },
        userInfo: {
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
            header: { isShow: true, isNeedClose: true },
            asstBtn: { isNeed: true },
            footer: { isShow: false, expressionText: '' },
            chatBot: {
                title: '🧬 表观遗传 AI 助教',
                uploadable: true, 
                width: isMobile ? window.innerWidth : 390, 
            },
        },
    });
}
