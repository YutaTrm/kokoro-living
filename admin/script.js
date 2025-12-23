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
let checkinsPage = 1;
let reflectionsPage = 1;

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
    } else if (tabName === 'checkins') {
        document.getElementById('checkinsTab').classList.remove('hidden');
        loadCheckins();
    } else if (tabName === 'reflections') {
        document.getElementById('reflectionsTab').classList.remove('hidden');
        loadReflections();
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

        const rows = reports.map(report => {
            const reporter = usersMap.get(report.reporter_id);
            const post = postsMap.get(report.post_id);
            const postUser = post ? postUsersMap.get(post.user_id) : null;

            return `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                        ${reporter?.avatar_url ?
                            `<img src="${reporter.avatar_url}" class="w-8 h-8 rounded-full">` :
                            '<div class="w-8 h-8 rounded-full bg-gray-300"></div>'
                        }
                        <span class="text-sm text-gray-800">${reporter?.display_name || '削除済み'}</span>
                    </div>
                </td>
                <td class="px-6 py-4">
                    ${post ? `
                        <div class="flex items-center gap-2">
                            ${postUser?.avatar_url ?
                                `<img src="${postUser.avatar_url}" class="w-8 h-8 rounded-full">` :
                                '<div class="w-8 h-8 rounded-full bg-gray-300"></div>'
                            }
                            <span class="text-sm text-gray-800">${postUser?.display_name || '削除済み'}</span>
                        </div>
                    ` : '<span class="text-gray-400">-</span>'}
                </td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${getReasonColor(report.reason)}">
                        ${getReasonText(report.reason)}
                    </span>
                </td>
                <td class="px-6 py-4 max-w-md">
                    ${post ? `<p class="text-sm text-gray-600 truncate">${post.content}</p>` : '<span class="text-gray-400">-</span>'}
                    ${report.description ? `<p class="text-xs text-gray-500 mt-1">${report.description}</p>` : ''}
                </td>
                <td class="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                    ${new Date(report.created_at).toLocaleString('ja-JP', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </td>
                <td class="px-6 py-4">
                    ${post ? `
                        <div class="flex flex-col gap-1">
                            ${!post.is_hidden ? `
                                <button onclick="hidePost('${report.post_id}')"
                                        class="text-xs text-red-600 hover:text-red-800 whitespace-nowrap">
                                    非表示にする
                                </button>
                            ` : `
                                <span class="text-xs text-gray-500">非表示済み</span>
                            `}
                        </div>
                    ` : ''}
                </td>
            </tr>
            `;
        }).join('');

        container.innerHTML = `
            <table class="w-full">
                <thead class="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">通報者</th>
                        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">対象ユーザー</th>
                        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">理由</th>
                        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">内容</th>
                        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">日時</th>
                        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${rows}
                </tbody>
            </table>
        `;
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

        // 親投稿の情報を取得
        const parentPostIds = posts.map(p => p.parent_post_id).filter(Boolean);
        let parentPostsMap = new Map();
        if (parentPostIds.length > 0) {
            const { data: parentPosts } = await supabaseAdmin
                .from('posts')
                .select('id, content')
                .in('id', parentPostIds);
            parentPostsMap = new Map(parentPosts?.map(p => [p.id, p]) || []);
        }

        const rows = posts.map(post => {
            const user = usersMap.get(post.user_id);
            const parentPost = post.parent_post_id ? parentPostsMap.get(post.parent_post_id) : null;

            return `
            <tr class="hover:bg-gray-50 ${post.is_hidden ? 'bg-red-50' : ''}">
                <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                        ${user?.avatar_url ?
                            `<img src="${user.avatar_url}" class="w-10 h-10 rounded-full">` :
                            '<div class="w-10 h-10 rounded-full bg-gray-300"></div>'
                        }
                        <span class="text-sm font-semibold text-gray-700">${user?.display_name || '削除済み'}</span>
                    </div>
                </td>
                <td class="px-6 py-4 max-w-md">
                    ${parentPost ? `<p class="text-xs text-gray-400 mb-1 truncate">↩ ${parentPost.content}</p>` : ''}
                    <p class="text-sm text-gray-800">${post.content}</p>
                </td>
                <td class="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                    ${new Date(post.created_at).toLocaleString('ja-JP', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </td>
                <td class="px-6 py-4">
                    ${post.is_hidden ? '<span class="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">非表示</span>' : '<span class="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">表示中</span>'}
                </td>
                <td class="px-6 py-4">
                    ${!post.is_hidden ? `
                        <button onclick="hidePost('${post.id}')"
                                class="text-xs text-red-600 hover:text-red-800 whitespace-nowrap">
                            非表示にする
                        </button>
                    ` : `
                        <button onclick="showPost('${post.id}')"
                                class="text-xs text-green-600 hover:text-green-800 whitespace-nowrap">
                            表示に戻す
                        </button>
                    `}
                </td>
            </tr>
            `;
        }).join('');

        container.innerHTML = `
            <table class="w-full">
                <thead class="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ユーザー</th>
                        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">内容</th>
                        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">日時</th>
                        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ステータス</th>
                        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${rows}
                </tbody>
            </table>
        `;
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

        // auth.users から認証情報を取得
        const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
        const authUsersMap = new Map(authUsers?.users?.map(u => [u.id, u]) || []);

        // ユーザーIDリスト
        const userIds = users.map(u => u.user_id);

        // 各ユーザーの診断名・服薬・治療・ステータス・フォロー情報を並列取得
        const [diagnosesData, medicationsData, treatmentsData, statusesData, followingData, followersData] = await Promise.all([
            supabaseAdmin
                .from('user_diagnoses')
                .select('user_id, diagnoses(name)')
                .in('user_id', userIds),
            supabaseAdmin
                .from('user_medications')
                .select('user_id, ingredients(name)')
                .in('user_id', userIds),
            supabaseAdmin
                .from('user_treatments')
                .select('user_id, treatments(name)')
                .in('user_id', userIds),
            supabaseAdmin
                .from('user_statuses')
                .select('user_id, statuses(name)')
                .in('user_id', userIds),
            supabaseAdmin
                .from('follows')
                .select('follower_id')
                .in('follower_id', userIds),
            supabaseAdmin
                .from('follows')
                .select('following_id')
                .in('following_id', userIds)
        ]);

        // フォロー数・フォロワー数をカウント
        const followingCountMap = new Map();
        const followersCountMap = new Map();
        userIds.forEach(userId => {
            followingCountMap.set(userId, 0);
            followersCountMap.set(userId, 0);
        });
        followingData.data?.forEach(f => {
            followingCountMap.set(f.follower_id, (followingCountMap.get(f.follower_id) || 0) + 1);
        });
        followersData.data?.forEach(f => {
            followersCountMap.set(f.following_id, (followersCountMap.get(f.following_id) || 0) + 1);
        });

        // ユーザーIDごとにタグをグループ化
        const userTagsMap = new Map();
        userIds.forEach(userId => {
            userTagsMap.set(userId, {
                diagnoses: [],
                medications: [],
                treatments: [],
                statuses: []
            });
        });

        // 診断名
        diagnosesData.data?.forEach(d => {
            if (d.diagnoses?.name) {
                userTagsMap.get(d.user_id).diagnoses.push(d.diagnoses.name);
            }
        });

        // 服薬（成分名で重複削除）
        const medicationsByUser = new Map();
        medicationsData.data?.forEach(m => {
            if (m.ingredients?.name) {
                if (!medicationsByUser.has(m.user_id)) {
                    medicationsByUser.set(m.user_id, new Set());
                }
                medicationsByUser.get(m.user_id).add(m.ingredients.name);
            }
        });
        medicationsByUser.forEach((names, userId) => {
            userTagsMap.get(userId).medications = Array.from(names);
        });

        // 治療
        treatmentsData.data?.forEach(t => {
            if (t.treatments?.name) {
                userTagsMap.get(t.user_id).treatments.push(t.treatments.name);
            }
        });

        // ステータス
        statusesData.data?.forEach(s => {
            if (s.statuses?.name) {
                userTagsMap.get(s.user_id).statuses.push(s.statuses.name);
            }
        });

        const rows = users.map(user => {
            const authUser = authUsersMap.get(user.user_id);
            const provider = authUser?.app_metadata?.provider || authUser?.identities?.[0]?.provider || '不明';
            const authDisplayName = authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || '';
            const twitterUsername = provider === 'twitter' ? (authUser?.user_metadata?.user_name || authUser?.user_metadata?.preferred_username || '') : '';
            const tags = userTagsMap.get(user.user_id) || { diagnoses: [], medications: [], treatments: [], statuses: [] };
            const followingCount = followingCountMap.get(user.user_id) || 0;
            const followersCount = followersCountMap.get(user.user_id) || 0;

            // タグHTML生成
            const tagsHtml = [
                ...tags.diagnoses.map(name => `<span class="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">${name}</span>`),
                ...tags.medications.map(name => `<span class="px-2 py-1 text-xs font-semibold rounded bg-purple-100 text-purple-800">${name}</span>`),
                ...tags.treatments.map(name => `<span class="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">${name}</span>`),
                ...tags.statuses.map(name => `<span class="px-2 py-1 text-xs font-semibold rounded bg-orange-100 text-orange-800">${name}</span>`)
            ].join(' ');

            return `
            <tr class="hover:bg-gray-50 cursor-pointer" onclick="showUserDetail('${user.user_id}')">
                <td class="px-6 py-4">
                    <div class="flex flex-col items-center gap-1">
                        ${user.avatar_url ?
                            `<img src="${user.avatar_url}" class="w-12 h-12 rounded-full">` :
                            '<div class="w-12 h-12 rounded-full bg-gray-300"></div>'
                        }
                        <span class="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">${provider}</span>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex flex-col gap-1">
                        <div class="flex items-center gap-2">
                            <span class="font-semibold text-gray-800">${user.display_name}</span>
                            ${user.is_admin ? '<span class="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">管理者</span>' : ''}
                        </div>
                        ${authDisplayName ? `<span class="text-xs text-gray-500">Auth: ${authDisplayName}</span>` : ''}
                        ${twitterUsername ? `<a href="https://x.com/${twitterUsername}" target="_blank" rel="noopener noreferrer" class="text-xs text-blue-500 hover:text-blue-700 hover:underline" onclick="event.stopPropagation()">@${twitterUsername}</a>` : ''}
                    </div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                    [${followingCount},${followersCount}]
                </td>
                <td class="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    ${user.bio || '-'}
                </td>
                <td class="px-6 py-4 max-w-md">
                    <div class="flex flex-wrap gap-1">
                        ${tagsHtml || '<span class="text-gray-400 text-xs">なし</span>'}
                    </div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                    ${new Date(user.created_at).toLocaleDateString('ja-JP')}
                </td>
                <td class="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                    ${user.updated_at ? new Date(user.updated_at).toLocaleString('ja-JP', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    }) : '-'}
                </td>
            </tr>
            `;
        }).join('');

        container.innerHTML = `
            <table class="w-full">
                <thead class="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">アバター</th>
                        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ユーザー名</th>
                        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">FF</th>
                        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Bio</th>
                        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">タグ</th>
                        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">登録日</th>
                        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">更新日</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${rows}
                </tbody>
            </table>
        `;
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

// チェックイン一覧のページング
function prevCheckinsPage() {
    if (checkinsPage > 1) {
        checkinsPage--;
        loadCheckins();
    }
}

function nextCheckinsPage() {
    checkinsPage++;
    loadCheckins();
}

// チェックイン一覧読み込み
async function loadCheckins() {
    const container = document.getElementById('checkinsList');
    container.innerHTML = '<div class="text-center py-8 text-gray-500">読み込み中...</div>';

    try {
        const start = (checkinsPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;

        // チェックインデータを取得
        const { data: checkins, error: checkinsError, count } = await supabaseAdmin
            .from('mood_checkins')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(start, end);

        if (checkinsError) throw checkinsError;

        // ページング情報を更新
        updatePagination('checkins', checkinsPage, count);

        if (checkins.length === 0) {
            container.innerHTML = '<div class="text-center py-8 text-gray-500">チェックインはありません</div>';
            return;
        }

        // ユーザー情報を取得
        const userIds = [...new Set(checkins.map(c => c.user_id))];
        const { data: users } = await supabaseAdmin
            .from('users')
            .select('user_id, display_name, avatar_url')
            .in('user_id', userIds);

        const usersMap = new Map(users?.map(u => [u.user_id, u]) || []);

        // 気分の絵文字マッピング
        const MOOD_EMOJIS = {
            1: '😞',
            2: '😔',
            3: '😐',
            4: '🙂',
            5: '😊',
        };

        const MOOD_LABELS = {
            1: 'とても良くない',
            2: '良くない',
            3: '普通',
            4: '良い',
            5: 'とても良い',
        };

        const rows = checkins.map(checkin => {
            const user = usersMap.get(checkin.user_id);

            return `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4">
                    ${user?.avatar_url ?
                        `<img src="${user.avatar_url}" class="w-10 h-10 rounded-full">` :
                        '<div class="w-10 h-10 rounded-full bg-gray-300"></div>'
                    }
                </td>
                <td class="px-6 py-4 font-semibold text-gray-800">${user?.display_name || '削除済み'}</td>
                <td class="px-6 py-4 text-center text-3xl">${MOOD_EMOJIS[checkin.mood]}</td>
                <td class="px-6 py-4 text-gray-600">${MOOD_LABELS[checkin.mood]}</td>
                <td class="px-6 py-4 text-gray-500 whitespace-nowrap">
                    ${new Date(checkin.created_at).toLocaleString('ja-JP', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </td>
            </tr>
            `;
        }).join('');

        container.innerHTML = `
            <table class="w-full">
                <thead class="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">アバター</th>
                        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ユーザー名</th>
                        <th class="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">気分</th>
                        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ラベル</th>
                        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">日時</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${rows}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('チェックイン読み込みエラー:', error);
        container.innerHTML = '<div class="text-center py-8 text-red-500">エラーが発生しました</div>';
    }
}

// 振り返り一覧読み込み
async function loadReflections() {
    const container = document.getElementById('reflectionsList');
    container.innerHTML = '<div class="text-center py-8 text-gray-500">読み込み中...</div>';

    try {
        const start = (reflectionsPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;

        // 振り返りデータを取得
        const { data: reflections, error: reflectionsError, count } = await supabaseAdmin
            .from('ai_reflections')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(start, end);

        if (reflectionsError) throw reflectionsError;

        // ページング情報を更新
        updatePagination('reflections', reflectionsPage, count);

        if (reflections.length === 0) {
            container.innerHTML = '<div class="text-center py-8 text-gray-500">振り返りはありません</div>';
            return;
        }

        // ユーザー情報を取得
        const userIds = [...new Set(reflections.map(r => r.user_id))];
        const { data: users } = await supabaseAdmin
            .from('users')
            .select('user_id, display_name, avatar_url')
            .in('user_id', userIds);

        const usersMap = new Map(users?.map(u => [u.user_id, u]) || []);

        const rows = reflections.map(reflection => {
            const user = usersMap.get(reflection.user_id);
            // 内容を100文字に制限
            const truncatedContent = reflection.content.length > 100
                ? reflection.content.substring(0, 100) + '...'
                : reflection.content;

            return `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                        ${user?.avatar_url ?
                            `<img src="${user.avatar_url}" class="w-10 h-10 rounded-full">` :
                            '<div class="w-10 h-10 rounded-full bg-gray-300"></div>'
                        }
                        <span class="font-semibold text-gray-800">${user?.display_name || '削除済み'}</span>
                    </div>
                </td>
                <td class="px-6 py-4 max-w-md">
                    <p class="text-sm text-gray-600">${truncatedContent}</p>
                    <button onclick="showReflectionDetail('${reflection.id}')" class="text-xs text-blue-500 hover:text-blue-700 mt-1">
                        全文を表示
                    </button>
                </td>
                <td class="px-6 py-4 text-center">
                    ${reflection.is_free ?
                        '<span class="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">無料</span>' :
                        '<span class="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">チケット</span>'
                    }
                </td>
                <td class="px-6 py-4 text-sm text-gray-500 text-center">
                    ${reflection.tokens_used || '-'}
                </td>
                <td class="px-6 py-4 text-gray-500 whitespace-nowrap">
                    ${new Date(reflection.created_at).toLocaleString('ja-JP', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </td>
            </tr>
            `;
        }).join('');

        container.innerHTML = `
            <table class="w-full">
                <thead class="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ユーザー</th>
                        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">内容</th>
                        <th class="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">種別</th>
                        <th class="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">トークン</th>
                        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">日時</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${rows}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('振り返り読み込みエラー:', error);
        container.innerHTML = '<div class="text-center py-8 text-red-500">エラーが発生しました</div>';
    }
}

// 振り返り詳細を表示
async function showReflectionDetail(reflectionId) {
    try {
        const { data: reflection, error } = await supabaseAdmin
            .from('ai_reflections')
            .select('*')
            .eq('id', reflectionId)
            .single();

        if (error) throw error;

        // ユーザー情報を取得
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('display_name, avatar_url')
            .eq('user_id', reflection.user_id)
            .single();

        const content = reflection.content.replace(/\n/g, '<br>');
        const date = new Date(reflection.created_at).toLocaleString('ja-JP');

        // モーダル表示
        const modal = document.createElement('div');
        modal.id = 'reflectionModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        ${user?.avatar_url ?
                            `<img src="${user.avatar_url}" class="w-10 h-10 rounded-full">` :
                            '<div class="w-10 h-10 rounded-full bg-gray-300"></div>'
                        }
                        <div>
                            <h3 class="font-semibold text-gray-800">${user?.display_name || '削除済み'}</h3>
                            <p class="text-xs text-gray-500">${date}</p>
                        </div>
                    </div>
                    <button onclick="closeReflectionModal()" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                </div>
                <div class="px-6 py-4 overflow-y-auto max-h-[60vh]">
                    <p class="text-gray-700 leading-relaxed">${content}</p>
                </div>
                <div class="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-between text-sm text-gray-500">
                    <span>${reflection.is_free ? '無料枠' : 'チケット利用'}</span>
                    <span>使用トークン: ${reflection.tokens_used || '-'}</span>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // モーダル外クリックで閉じる
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeReflectionModal();
            }
        });
    } catch (error) {
        console.error('振り返り詳細読み込みエラー:', error);
        alert('エラーが発生しました');
    }
}

// 振り返りモーダルを閉じる
function closeReflectionModal() {
    const modal = document.getElementById('reflectionModal');
    if (modal) {
        modal.remove();
    }
}

// 振り返り一覧のページング
function prevReflectionsPage() {
    if (reflectionsPage > 1) {
        reflectionsPage--;
        loadReflections();
    }
}

function nextReflectionsPage() {
    reflectionsPage++;
    loadReflections();
}

// ユーザー詳細を表示
async function showUserDetail(userId) {
    try {
        // ユーザー情報を取得
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (userError) throw userError;

        // 投稿、いいね、チェックインを並列取得
        const [postsResult, likesResult, checkinsResult] = await Promise.all([
            supabaseAdmin
                .from('posts')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(20),
            supabaseAdmin
                .from('likes')
                .select('post_id, created_at')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(20),
            supabaseAdmin
                .from('mood_checkins')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(20)
        ]);

        const posts = postsResult.data || [];
        const likes = likesResult.data || [];
        const checkins = checkinsResult.data || [];

        // いいねした投稿の詳細を取得
        let likedPosts = [];
        if (likes.length > 0) {
            const postIds = likes.map(l => l.post_id);
            const { data: likedPostsData } = await supabaseAdmin
                .from('posts')
                .select('id, content, user_id, created_at')
                .in('id', postIds);

            // いいねした投稿の作者情報を取得
            if (likedPostsData && likedPostsData.length > 0) {
                const authorIds = [...new Set(likedPostsData.map(p => p.user_id))];
                const { data: authors } = await supabaseAdmin
                    .from('users')
                    .select('user_id, display_name, avatar_url')
                    .in('user_id', authorIds);
                const authorsMap = new Map(authors?.map(u => [u.user_id, u]) || []);

                // いいねした順序を保持するためにMapで管理
                const postsMap = new Map(likedPostsData.map(p => [p.id, {
                    ...p,
                    author: authorsMap.get(p.user_id)
                }]));

                // likesの順序（いいねした順）で並べ替え
                likedPosts = likes
                    .map(l => postsMap.get(l.post_id))
                    .filter(Boolean);
            }
        }

        // 気分の絵文字マッピング
        const MOOD_EMOJIS = { 1: '😞', 2: '😔', 3: '😐', 4: '🙂', 5: '😊' };

        // 投稿リストHTML
        const postsHtml = posts.length > 0 ? posts.map(post => `
            <div class="p-3 border-b border-gray-100 ${post.is_hidden ? 'bg-red-50' : ''}">
                <p class="text-sm text-gray-700">${post.content}</p>
                <div class="flex justify-between items-center mt-2">
                    <span class="text-xs text-gray-400">${new Date(post.created_at).toLocaleString('ja-JP')}</span>
                    ${post.is_hidden ? '<span class="text-xs text-red-500">非表示</span>' : ''}
                </div>
            </div>
        `).join('') : '<p class="text-gray-400 text-center py-4">投稿はありません</p>';

        // いいねリストHTML
        const likesHtml = likedPosts.length > 0 ? likedPosts.map(post => `
            <div class="p-3 border-b border-gray-100">
                <div class="flex items-center gap-2 mb-1">
                    ${post.author?.avatar_url ?
                        `<img src="${post.author.avatar_url}" class="w-6 h-6 rounded-full">` :
                        '<div class="w-6 h-6 rounded-full bg-gray-300"></div>'
                    }
                    <span class="text-xs font-semibold text-gray-600">${post.author?.display_name || '削除済み'}</span>
                </div>
                <p class="text-sm text-gray-700">${post.content}</p>
                <span class="text-xs text-gray-400">${new Date(post.created_at).toLocaleString('ja-JP')}</span>
            </div>
        `).join('') : '<p class="text-gray-400 text-center py-4">いいねはありません</p>';

        // チェックインリストHTML
        const checkinsHtml = checkins.length > 0 ? checkins.map(checkin => `
            <div class="p-3 border-b border-gray-100 flex items-center gap-3">
                <span class="text-2xl">${MOOD_EMOJIS[checkin.mood]}</span>
                <span class="text-xs text-gray-400">${new Date(checkin.created_at).toLocaleString('ja-JP')}</span>
            </div>
        `).join('') : '<p class="text-gray-400 text-center py-4">チェックインはありません</p>';

        // モーダル表示
        const modal = document.createElement('div');
        modal.id = 'userDetailModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        ${user.avatar_url ?
                            `<img src="${user.avatar_url}" class="w-12 h-12 rounded-full">` :
                            '<div class="w-12 h-12 rounded-full bg-gray-300"></div>'
                        }
                        <div>
                            <h3 class="font-semibold text-gray-800">${user.display_name}</h3>
                            <p class="text-xs text-gray-500">登録: ${new Date(user.created_at).toLocaleDateString('ja-JP')}</p>
                        </div>
                    </div>
                    <button onclick="closeUserDetailModal()" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                </div>
                <div class="px-6 py-4 overflow-y-auto max-h-[75vh]">
                    <div class="grid grid-cols-3 gap-4">
                        <!-- 投稿 -->
                        <div class="border border-gray-200 rounded-lg overflow-hidden">
                            <div class="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                <h4 class="font-semibold text-gray-700">投稿 (${posts.length})</h4>
                            </div>
                            <div class="max-h-96 overflow-y-auto">
                                ${postsHtml}
                            </div>
                        </div>
                        <!-- いいね -->
                        <div class="border border-gray-200 rounded-lg overflow-hidden">
                            <div class="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                <h4 class="font-semibold text-gray-700">いいね (${likedPosts.length})</h4>
                            </div>
                            <div class="max-h-96 overflow-y-auto">
                                ${likesHtml}
                            </div>
                        </div>
                        <!-- チェックイン -->
                        <div class="border border-gray-200 rounded-lg overflow-hidden">
                            <div class="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                <h4 class="font-semibold text-gray-700">チェックイン (${checkins.length})</h4>
                            </div>
                            <div class="max-h-96 overflow-y-auto">
                                ${checkinsHtml}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // モーダル外クリックで閉じる
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeUserDetailModal();
            }
        });
    } catch (error) {
        console.error('ユーザー詳細読み込みエラー:', error);
        alert('エラーが発生しました');
    }
}

// ユーザー詳細モーダルを閉じる
function closeUserDetailModal() {
    const modal = document.getElementById('userDetailModal');
    if (modal) {
        modal.remove();
    }
}

// グローバルに関数を公開（type="module"対応）
window.login = login;
window.logout = logout;
window.showTab = showTab;
window.loadReports = loadReports;
window.loadPosts = loadPosts;
window.loadUsers = loadUsers;
window.loadCheckins = loadCheckins;
window.loadReflections = loadReflections;
window.hidePost = hidePost;
window.showPost = showPost;
window.viewPost = viewPost;
window.prevReportsPage = prevReportsPage;
window.nextReportsPage = nextReportsPage;
window.prevPostsPage = prevPostsPage;
window.nextPostsPage = nextPostsPage;
window.prevUsersPage = prevUsersPage;
window.nextUsersPage = nextUsersPage;
window.prevCheckinsPage = prevCheckinsPage;
window.nextCheckinsPage = nextCheckinsPage;
window.prevReflectionsPage = prevReflectionsPage;
window.nextReflectionsPage = nextReflectionsPage;
window.showReflectionDetail = showReflectionDetail;
window.closeReflectionModal = closeReflectionModal;
window.showUserDetail = showUserDetail;
window.closeUserDetailModal = closeUserDetailModal;
