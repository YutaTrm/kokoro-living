// Supabase クライアント初期化
// 認証用（ANON_KEY）
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// データ取得用（SERVICE_ROLE_KEY、RLSをバイパス）
const supabaseAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

let currentUser = null;

// ページング用の変数
const PAGE_SIZE = 50;
let reportsPage = 1;
let postsPage = 1;
let usersPage = 1;

// ページ読み込み時の処理
window.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        // 管理者かどうか確認
        const { data: user } = await supabase
            .from('users')
            .select('is_admin')
            .eq('user_id', session.user.id)
            .single();

        if (user?.is_admin) {
            currentUser = session.user;
            showMainContent();
        } else {
            showLogin();
            alert('管理者権限がありません');
        }
    } else {
        showLogin();
    }
});

// ログイン
async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        // 管理者かどうか確認
        const { data: user } = await supabase
            .from('users')
            .select('is_admin')
            .eq('user_id', data.user.id)
            .single();

        if (!user?.is_admin) {
            await supabase.auth.signOut();
            errorDiv.textContent = '管理者権限がありません';
            errorDiv.classList.remove('hidden');
            return;
        }

        currentUser = data.user;
        showMainContent();
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('hidden');
    }
}

// ログアウト
async function logout() {
    await supabase.auth.signOut();
    currentUser = null;
    showLogin();
}

// ログイン画面表示
function showLogin() {
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('mainContent').classList.add('hidden');
}

// メインコンテンツ表示
function showMainContent() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('mainContent').classList.remove('hidden');
    document.getElementById('adminEmail').textContent = currentUser.email;
    loadReports();
}

// タブ切り替え
function showTab(tabName) {
    // タブボタンのスタイル更新
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('border-blue-500', 'text-blue-600');
        btn.classList.add('border-transparent', 'text-gray-500');
    });
    event.target.classList.remove('border-transparent', 'text-gray-500');
    event.target.classList.add('border-blue-500', 'text-blue-600');

    // タブコンテンツの表示切り替え
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });

    if (tabName === 'reports') {
        document.getElementById('reportsTab').classList.remove('hidden');
        loadReports();
    } else if (tabName === 'posts') {
        document.getElementById('postsTab').classList.remove('hidden');
        loadPosts();
    } else if (tabName === 'users') {
        document.getElementById('usersTab').classList.remove('hidden');
        loadUsers();
    }
}

// 通報一覧読み込み
async function loadReports() {
    const container = document.getElementById('reportsList');
    container.innerHTML = '<div class="text-center py-8 text-gray-500">読み込み中...</div>';

    try {
        const start = (reportsPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;

        // 通報データを取得
        const { data: reports, error: reportsError, count } = await supabaseAdmin
            .from('reports')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(start, end);

        if (reportsError) throw reportsError;

        // ページング情報を更新
        updatePagination('reports', reportsPage, count);

        if (reports.length === 0) {
            container.innerHTML = '<div class="text-center py-8 text-gray-500">通報はありません</div>';
            return;
        }

        // ユーザー情報を取得（アバター含む）
        const userIds = [...new Set(reports.map(r => r.reporter_id))];
        const { data: users } = await supabaseAdmin
            .from('users')
            .select('user_id, display_name, avatar_url')
            .in('user_id', userIds);

        const usersMap = new Map(users?.map(u => [u.user_id, u]) || []);

        // 投稿情報を取得
        const postIds = reports.map(r => r.post_id).filter(Boolean);
        const { data: posts } = await supabaseAdmin
            .from('posts')
            .select('id, content, created_at, user_id, is_hidden')
            .in('id', postIds);

        const postsMap = new Map(posts?.map(p => [p.id, p]) || []);

        // 投稿者の情報を取得（アバター含む）
        const postUserIds = [...new Set(posts?.map(p => p.user_id) || [])];
        const { data: postUsers } = await supabaseAdmin
            .from('users')
            .select('user_id, display_name, avatar_url')
            .in('user_id', postUserIds);

        const postUsersMap = new Map(postUsers?.map(u => [u.user_id, u]) || []);

        container.innerHTML = reports.map(report => {
            const reporter = usersMap.get(report.reporter_id);
            const post = postsMap.get(report.post_id);
            const postUser = post ? postUsersMap.get(post.user_id) : null;

            return `
            <div class="p-6 hover:bg-gray-50">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center gap-2">
                        ${reporter?.avatar_url ?
                            `<img src="${reporter.avatar_url}" class="w-8 h-8 rounded-full">` :
                            '<div class="w-8 h-8 rounded-full bg-gray-300"></div>'
                        }
                        <div>
                            <span class="text-sm font-semibold text-gray-700">通報者:</span>
                            <span class="text-sm text-gray-600">${reporter?.display_name || '削除済み'}</span>
                            <span class="text-xs text-gray-400 ml-2">${new Date(report.created_at).toLocaleString('ja-JP')}</span>
                        </div>
                    </div>
                    <span class="px-3 py-1 text-xs font-semibold rounded-full ${getReasonColor(report.reason)}">
                        ${getReasonText(report.reason)}
                    </span>
                </div>

                ${post ? `
                    <div class="mb-2 flex items-center gap-2">
                        ${postUser?.avatar_url ?
                            `<img src="${postUser.avatar_url}" class="w-8 h-8 rounded-full">` :
                            '<div class="w-8 h-8 rounded-full bg-gray-300"></div>'
                        }
                        <div>
                            <span class="text-sm font-semibold text-gray-700">通報対象ユーザー:</span>
                            <span class="text-sm text-gray-600">${postUser?.display_name || '削除済み'}</span>
                        </div>
                    </div>
                    <div class="mb-2">
                        <span class="text-sm font-semibold text-gray-700">投稿内容:</span>
                        <p class="text-sm text-gray-600 mt-1 p-3 bg-gray-100 rounded">${post.content}</p>
                    </div>
                ` : ''}

                ${report.description ? `
                    <div class="mb-3">
                        <span class="text-sm font-semibold text-gray-700">詳細:</span>
                        <p class="text-sm text-gray-600 mt-1">${report.description}</p>
                    </div>
                ` : ''}

                ${post ? `
                    <div class="flex gap-2 mt-3">
                        <button onclick="viewPost('${report.post_id}')"
                                class="text-sm text-blue-600 hover:text-blue-800">
                            投稿を確認
                        </button>
                        ${!post.is_hidden ? `
                            <button onclick="hidePost('${report.post_id}')"
                                    class="text-sm text-red-600 hover:text-red-800">
                                投稿を非表示にする
                            </button>
                        ` : `
                            <span class="text-sm text-gray-500">（投稿は非表示済み）</span>
                        `}
                    </div>
                ` : ''}
            </div>
        `;
        }).join('');
    } catch (error) {
        console.error('通報読み込みエラー:', error);
        container.innerHTML = '<div class="text-center py-8 text-red-500">エラーが発生しました</div>';
    }
}

// 投稿一覧読み込み
async function loadPosts() {
    const container = document.getElementById('postsList');
    const filter = document.getElementById('postFilter').value;
    container.innerHTML = '<div class="text-center py-8 text-gray-500">読み込み中...</div>';

    try {
        const start = (postsPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;

        let query = supabaseAdmin
            .from('posts')
            .select('*', { count: 'exact' })
            .is('parent_post_id', null)
            .order('created_at', { ascending: false })
            .range(start, end);

        if (filter === 'hidden') {
            query = query.eq('is_hidden', true);
        } else if (filter === 'visible') {
            query = query.eq('is_hidden', false);
        }

        const { data: posts, error, count } = await query;

        if (error) throw error;

        // ページング情報を更新
        updatePagination('posts', postsPage, count);

        if (posts.length === 0) {
            container.innerHTML = '<div class="text-center py-8 text-gray-500">投稿はありません</div>';
            return;
        }

        // ユーザー情報を取得（アバター含む）
        const userIds = [...new Set(posts.map(p => p.user_id))];
        const { data: users } = await supabaseAdmin
            .from('users')
            .select('user_id, display_name, avatar_url')
            .in('user_id', userIds);

        const usersMap = new Map(users?.map(u => [u.user_id, u]) || []);

        container.innerHTML = posts.map(post => {
            const user = usersMap.get(post.user_id);

            return `
            <div class="p-6 hover:bg-gray-50 ${post.is_hidden ? 'bg-red-50' : ''}">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center gap-2">
                        ${user?.avatar_url ?
                            `<img src="${user.avatar_url}" class="w-10 h-10 rounded-full">` :
                            '<div class="w-10 h-10 rounded-full bg-gray-300"></div>'
                        }
                        <div>
                            <span class="text-sm font-semibold text-gray-700">${user?.display_name || '削除済み'}</span>
                            <span class="text-xs text-gray-400 ml-2">${new Date(post.created_at).toLocaleString('ja-JP')}</span>
                        </div>
                    </div>
                    ${post.is_hidden ? '<span class="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">非表示</span>' : ''}
                </div>

                <p class="text-sm text-gray-800 mb-3">${post.content}</p>

                <div class="flex gap-2">
                    ${!post.is_hidden ? `
                        <button onclick="hidePost('${post.id}')"
                                class="text-sm text-red-600 hover:text-red-800">
                            非表示にする
                        </button>
                    ` : `
                        <button onclick="showPost('${post.id}')"
                                class="text-sm text-green-600 hover:text-green-800">
                            表示に戻す
                        </button>
                    `}
                </div>
            </div>
            `;
        }).join('');
    } catch (error) {
        console.error('投稿読み込みエラー:', error);
        container.innerHTML = '<div class="text-center py-8 text-red-500">エラーが発生しました</div>';
    }
}

// ユーザー一覧読み込み
async function loadUsers() {
    const container = document.getElementById('usersList');
    container.innerHTML = '<div class="text-center py-8 text-gray-500">読み込み中...</div>';

    try {
        const start = (usersPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;

        const { data: users, error, count } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(start, end);

        if (error) throw error;

        // ページング情報を更新
        updatePagination('users', usersPage, count);

        if (users.length === 0) {
            container.innerHTML = '<div class="text-center py-8 text-gray-500">ユーザーはいません</div>';
            return;
        }

        container.innerHTML = users.map(user => `
            <div class="p-6 hover:bg-gray-50">
                <div class="flex items-center gap-4">
                    ${user.avatar_url ?
                        `<img src="${user.avatar_url}" class="w-12 h-12 rounded-full">` :
                        '<div class="w-12 h-12 rounded-full bg-gray-300"></div>'
                    }
                    <div class="flex-1">
                        <div class="flex items-center gap-2">
                            <span class="font-semibold text-gray-800">${user.display_name}</span>
                            ${user.is_admin ? '<span class="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">管理者</span>' : ''}
                        </div>
                        <div class="text-sm text-gray-500 mt-1">
                            登録日: ${new Date(user.created_at).toLocaleDateString('ja-JP')}
                        </div>
                        ${user.bio ? `<p class="text-sm text-gray-600 mt-2">${user.bio}</p>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('ユーザー読み込みエラー:', error);
        container.innerHTML = '<div class="text-center py-8 text-red-500">エラーが発生しました</div>';
    }
}

// 投稿を非表示にする
async function hidePost(postId) {
    if (!confirm('この投稿を非表示にしますか？')) return;

    try {
        const { error } = await supabaseAdmin
            .from('posts')
            .update({ is_hidden: true })
            .eq('id', postId);

        if (error) throw error;

        alert('投稿を非表示にしました');

        // 現在のタブに応じて再読み込み
        const reportsTab = document.getElementById('reportsTab');
        if (!reportsTab.classList.contains('hidden')) {
            loadReports();
        } else {
            loadPosts();
        }
    } catch (error) {
        console.error('非表示エラー:', error);
        alert('エラーが発生しました');
    }
}

// 投稿を表示に戻す
async function showPost(postId) {
    if (!confirm('この投稿を表示に戻しますか？')) return;

    try {
        const { error } = await supabaseAdmin
            .from('posts')
            .update({ is_hidden: false })
            .eq('id', postId);

        if (error) throw error;

        alert('投稿を表示に戻しました');
        loadPosts();
    } catch (error) {
        console.error('表示エラー:', error);
        alert('エラーが発生しました');
    }
}

// 投稿を確認（別タブで開く想定）
function viewPost(postId) {
    alert(`投稿ID: ${postId}\n\n投稿詳細の表示機能は実装予定です`);
}

// 通報理由のテキスト取得
function getReasonText(reason) {
    const reasons = {
        'self_harm': '自傷・自殺の誘発',
        'harassment': 'ハラスメント・攻撃的な内容',
        'spam': 'スパム・宣伝',
        'privacy': '個人情報の漏洩',
        'other': 'その他'
    };
    return reasons[reason] || reason;
}

// 通報理由の色取得
function getReasonColor(reason) {
    const colors = {
        'self_harm': 'bg-red-100 text-red-800',
        'harassment': 'bg-orange-100 text-orange-800',
        'spam': 'bg-yellow-100 text-yellow-800',
        'privacy': 'bg-purple-100 text-purple-800',
        'other': 'bg-gray-100 text-gray-800'
    };
    return colors[reason] || 'bg-gray-100 text-gray-800';
}

// ページング情報を更新
function updatePagination(type, currentPage, totalCount) {
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    // ページ情報の表示を更新
    document.getElementById(`${type}PageInfo`).textContent =
        `ページ ${currentPage} / ${totalPages} (全${totalCount}件)`;

    // 前へボタンの有効/無効
    const prevButton = document.getElementById(`${type}Prev`);
    prevButton.disabled = currentPage === 1;

    // 次へボタンの有効/無効
    const nextButton = document.getElementById(`${type}Next`);
    nextButton.disabled = currentPage >= totalPages || totalCount === 0;
}

// 通報一覧のページング
function prevReportsPage() {
    if (reportsPage > 1) {
        reportsPage--;
        loadReports();
    }
}

function nextReportsPage() {
    reportsPage++;
    loadReports();
}

// 投稿一覧のページング
function prevPostsPage() {
    if (postsPage > 1) {
        postsPage--;
        loadPosts();
    }
}

function nextPostsPage() {
    postsPage++;
    loadPosts();
}

// ユーザー一覧のページング
function prevUsersPage() {
    if (usersPage > 1) {
        usersPage--;
        loadUsers();
    }
}

function nextUsersPage() {
    usersPage++;
    loadUsers();
}
