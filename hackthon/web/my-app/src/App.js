import React, { useEffect, useState } from 'react';
import './App.css';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword , signOut } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
// 追加でインポート

const firebaseConfig = {
  apiKey: "AIzaSyBQ4L3nC0GJtsy1SllH4x3I5yInEfpMyc0",
  authDomain: "hackathon-b05e3.firebaseapp.com",
  projectId: "hackathon-b05e3",
  storageBucket: "hackathon-b05e3.appspot.com",
  messagingSenderId: "293078170583",
  appId: "1:293078170583:web:21275a789ba589f5d62992",
  measurementId: "G-7GCR8BHD46"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const API_BASE = 'https://hackthon-467321075767.europe-west1.run.app/api';

function App() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [postContent, setPostContent] = useState('');
  const [replyContent, setReplyContent] = useState({});
  const [summary, setSummary] = useState({});

  // ログアウト関数をAppコンポーネント内へ移動
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      localStorage.removeItem('user');
    } catch (error) {
      console.error("ログアウト失敗:", error);
    }
  };

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (storedUser) {
      setUser(storedUser);
      fetchPosts();
    }
  }, []);

  const handleLogin = async () => {
    const email = prompt('メールアドレスを入力');
    const password = prompt('パスワードを入力');
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const { uid, displayName } = result.user;
      const username = displayName || email;

      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, email, username })
      });
      const data = await res.json();
      const newUser = { id: data.user_id, uid, email, username };
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
      fetchPosts();
    } catch (error) {
      console.error('ログイン失敗:', error);
      alert('ログインに失敗しました。');
    }
  };

  const handleRegister = async () => {
    const email = prompt('登録するメールアドレスを入力');
    const password = prompt('登録するパスワードを入力');
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const { uid } = result.user;
      const username = email;

      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, email, username })
      });
      const data = await res.json();
      const newUser = { id: data.user_id, uid, email, username };
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
      fetchPosts();
    } catch (error) {
      console.error('ユーザー登録失敗:', error);
      alert('ユーザー登録に失敗しました。');
    }
  };

  const fetchPosts = async () => {
  try {
    const res = await fetch(`${API_BASE}/posts`);
    console.log(res)
    if (!res.ok) throw new Error('投稿取得エラー');
    const data = await res.json();
    setPosts(data);
  } catch (err) {
    console.error('投稿取得失敗:', err);
    setPosts([]); // fallback（またはそのままにする）
  }
};


const handlePost = async () => {
  if (!postContent.trim()) return;

  try {
    const res = await fetch(`https://hackthon-467321075767.europe-west1.run.app/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: user.uid, content: postContent })
    });

    if (!res.ok) throw new Error('投稿に失敗しました');

    setPostContent(res.content);
    await fetchPosts(); // ← 忘れず「await」する
  } catch (error) {
    console.error('投稿エラー:', error);
    alert('投稿に失敗しました');
  }
};



const handleReply = async (postId) => {
  await fetch(`https://hackthon-467321075767.europe-west1.run.app/api/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: user.uid, post_id: postId, content: replyContent[postId] })
  });
  setReplyContent((prev) => ({ ...prev, [postId]: '' }));
  fetchPosts();
};


  const handleSummary = async (postId) => {
    const res = await fetch(`${API_BASE}/summary/${postId}`);
    const data = await res.json();
    setSummary((prev) => ({ ...prev, [postId]: data.summary }));
  };

  if (!user) return (
    <div>
      <h2>ログイン / 新規登録</h2>
      <button onClick={handleLogin}>ログイン</button>
      <button onClick={handleRegister}>新規登録</button>
    </div>
  );

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
        {(posts || []).map((post) => (
          <div key={post.id} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}>
            <p>{post.content}</p>
            <p>いいね: {post.likes}</p>
            <div> {/* このdivが「リプライ」セクションを正しく囲んでいます */}
              <strong>リプライ:</strong>
              {(post.replies || []).map((reply) => (
              <p key={reply.id} style={{ marginLeft: '1em' }}>- {reply.content}</p>
              ))}
            </div> 
            <textarea
              value={replyContent[post.id] || ''}
              onChange={(e) => setReplyContent({ ...replyContent, [post.id]: e.target.value })}
              placeholder="リプライ..."
            ></textarea>
            <button onClick={() => handleReply(post.id)}>リプライ送信</button>
            <button onClick={() => handleSummary(post.id)}>要約取得</button>
            {summary[post.id] && <p><strong>要約:</strong> {summary[post.id]}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
