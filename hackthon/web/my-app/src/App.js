import React, { useEffect, useState } from 'react';
import './App.css';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const API_BASE = process.env.REACT_APP_API_BASE;

function App() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [postContent, setPostContent] = useState('');
  const [replyContent, setReplyContent] = useState({});
  const [summary, setSummary] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // フォーム切り替えと入力状態
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      localStorage.removeItem('user');
    } catch (error) {
      console.error('ログアウト失敗:', error);
    }
  };

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (storedUser) {
      setUser(storedUser);
      fetchPosts();
    }
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (isRegistering && password.length < 6) {
      setErrorMessage('パスワードは6文字以上で入力してください。');
      return;
    }

    try {
      const authFunc = isRegistering
        ? createUserWithEmailAndPassword
        : signInWithEmailAndPassword;

      const result = await authFunc(auth, email, password);
      const { uid } = result.user;
      const username = email;

      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, email, username }),
      });
      const data = await res.json();
      const newUser = { id: data.user_id, uid, email, username };
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
      fetchPosts();
    } catch (error) {
      console.error('認証エラー:', error);
      setErrorMessage('認証に失敗しました。メールアドレスやパスワードを確認してください。');
    }
  };

  const fetchPosts = async () => {
    setIsLoading(true); // 読み込み開始
    try {
      const res = await fetch(`${API_BASE}/posts`);
      if (!res.ok) throw new Error('投稿取得エラー');
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error('投稿取得失敗:', err);
      setPosts([]);
    } finally {
      setIsLoading(false); // 読み込み終了
    }
  };

  const handleLike = async (postId) => {
    try {
      await fetch(`${API_BASE}/likes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, post_id: postId }),
      });
      await fetchPosts();
    } catch (err) {
      console.error('いいねエラー:', err);
      alert('いいねに失敗しました');//new!!
    }
  };

  const handlePost = async () => {
    if (!postContent.trim()) return;

    try {
      await fetch(`${API_BASE}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, content: postContent }),
      });
      setPostContent('');
      await fetchPosts();
    } catch (error) {
      console.error('投稿エラー:', error);
      alert('投稿に失敗しました');//new!!
    }
  };

  const handleReply = async (postId) => {
    const content = (replyContent[postId] || '').trim();
    if (!content) {
      alert('リプライ内容を入力してください');
      return;
    }
  
    try {
      await fetch(`${API_BASE}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, post_id: postId, content }),
      });
      setReplyContent((prev) => ({ ...prev, [postId]: '' }));
      await fetchPosts();
    } catch (error) {
      console.error('リプライ送信エラー:', error);
      alert('リプライ送信に失敗しました');
    }
  };

  const handleSummary = async (postId) => {
    const post = posts.find((p) => p.id === postId);
    if (!post || !post.replies || post.replies.length === 0) {
      setSummary((prev) => ({ ...prev, [postId]: 'リプライがありません。' }));
      return;
    }
  
    try {
      const res = await fetch(`${API_BASE}/summary/${postId}`);
      if (!res.ok) throw new Error('要約取得失敗');
      const data = await res.json();
      setSummary((prev) => ({ ...prev, [postId]: data.summary }));
    } catch (error) {
      console.error('要約取得エラー:', error);
      alert('要約取得に失敗しました');
    }
  };

  if (!user) {
    return (
      <div className="App">
        <h2>{isRegistering ? '新規登録' : 'ログイン'}</h2>
        <form onSubmit={handleAuth}>
          {isRegistering && <p>※ パスワードは6文字以上が必要です</p>}
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          /><br />
          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          /><br />
          <button type="submit">{isRegistering ? '登録' : 'ログイン'}</button>
        </form>
        <button onClick={() => setIsRegistering(!isRegistering)}>
          {isRegistering ? 'ログイン画面へ' : '新規登録画面へ'}
        </button>
        {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
      </div>
    );
  }

  return (
    <div className="App">
      <h1>ようこそ, {user.username}さん</h1>
      <button onClick={handleLogout}>ログアウト</button>
      <div>
        <textarea
          value={postContent}
          onChange={(e) => setPostContent(e.target.value)}
          placeholder="新しい投稿"
        ></textarea>
        <button onClick={handlePost}>投稿</button>
      </div>


        <div>
        {isLoading ? (
          <p>POST取得中...</p>
        ) : (
          (posts || []).map((post) => (
            <div key={post.id} className="post-card">
              <p>{post.content}</p>
              <p>いいね: {post.likes}</p>
              <button onClick={() => handleLike(post.id)}>いいね</button>
              <div>
                <strong>リプライ:</strong>
                {(post.replies || []).map((reply) => (
                  <p key={reply.id} className="reply">- {reply.content}</p>
                ))}
              </div>
              <textarea
                value={replyContent[post.id] || ''}
                onChange={(e) => setReplyContent({ ...replyContent, [post.id]: e.target.value })}
                placeholder="リプライ..."
              />
              <button onClick={() => handleReply(post.id)}>リプライ送信</button>
              <button onClick={() => handleSummary(post.id)}>要約取得</button>
              {summary[post.id] && <p className="summary"><strong>要約:</strong> {summary[post.id]}</p>}
            </div>
          ))
        )}
      </div>
  );
}

export default App;
