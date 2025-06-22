import React, { useEffect, useState } from 'react';
import './App.css';
import { TextField, Button, Avatar, AppBar, Toolbar, Typography, Container, Card, CardContent, Box } from '@mui/material';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
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
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (storedUser) {
      setUser(storedUser);
      fetchPosts();
      fetchProfile(storedUser.uid);
    }
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    localStorage.removeItem('user');
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (isRegistering && password.length < 6) {
      setErrorMessage('パスワードは6文字以上で入力してください');
      return;
    }

    try {
      const authFunc = isRegistering ? createUserWithEmailAndPassword : signInWithEmailAndPassword;
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
    } catch {
      setErrorMessage('認証に失敗しました');
    }
  };

  const fetchPosts = async () => {
    setIsLoading(true);
    const res = await fetch(`${API_BASE}/posts`);
    const data = await res.json();
    setPosts(data);
    setIsLoading(false);
  };

  const fetchProfile = async (uid) => {
    const res = await fetch(`${API_BASE}/profile?uid=${uid}`);
    const data = await res.json();
    setName(data.username);
    setImageUrl(data.profile_image_url || '');
  };

  const handleProfileUpdate = async () => {
    await fetch(`${API_BASE}/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: user.uid, name, image_url: imageUrl }),
    });
    alert('プロフィール更新完了');
  };

  const handlePost = async () => {
    if (!postContent.trim()) return;
    await fetch(`${API_BASE}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: user.uid, content: postContent }),
    });
    setPostContent('');
    fetchPosts();
  };

  const handleLike = async (postId) => {
    await fetch(`${API_BASE}/likes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: user.uid, post_id: postId }),
    });
    fetchPosts();
  };

  const handleReply = async (postId) => {
    const content = (replyContent[postId] || '').trim();
    if (!content) return;
    await fetch(`${API_BASE}/replies`, {
      method: ' 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: user.uid, post_id: postId, content }),
    });
    setReplyContent(prev => ({ ...prev, [postId]: '' }));
    fetchPosts();
  };

  const handleSummary = async (postId) => {
    const res = await fetch(`${API_BASE}/summary/${postId}`);
    const data = await res.json();
    setSummary(prev => ({ ...prev, [postId]: data.summary }));
  };

  if (!user) {
    return (
      <Container maxWidth="sm">
        <Typography variant="h5">{isRegistering ? '新規登録' : 'ログイン'}</Typography>
        <form onSubmit={handleAuth}>
          <TextField fullWidth label="メール" value={email} onChange={(e) => setEmail(e.target.value)} /><br />
          <TextField fullWidth type="password" label="パスワード" value={password} onChange={(e) => setPassword(e.target.value)} /><br />
          <Button type="submit" variant="contained">{isRegistering ? '登録' : 'ログイン'}</Button>
        </form>
        <Button onClick={() => setIsRegistering(!isRegistering)}>
          {isRegistering ? 'ログイン画面へ' : '新規登録画面へ'}
        </Button>
        {errorMessage && <Typography color="error">{errorMessage}</Typography>}
      </Container>
    );
  }

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Avatar src={imageUrl} />
          <Typography variant="h6" sx={{ flexGrow: 1, marginLeft: 2 }}>{name}</Typography>
          <Button color="inherit" onClick={handleLogout}>ログアウト</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ mt: 2 }}>
        <Typography variant="h6">プロフィール更新</Typography>
        <TextField fullWidth label="名前" value={name} onChange={(e) => setName(e.target.value)} /><br />
        <TextField fullWidth label="画像URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} /><br />
        <Button onClick={handleProfileUpdate}>更新</Button>

        <TextField fullWidth label="新しい投稿" value={postContent} onChange={(e) => setPostContent(e.target.value)} multiline /><br />
        <Button variant="contained" onClick={handlePost}>投稿</Button>

        {isLoading ? <p>読み込み中...</p> : posts.map(post => (
          <Card key={post.id} sx={{ mt: 2 }}>
            <CardContent>
              <Typography>{post.content}</Typography>
              <Typography variant="caption">いいね: {post.likes}</Typography><br />
              <Button onClick={() => handleLike(post.id)}>いいね</Button>
              <Box>
                {(post.replies || []).map(reply => (
                  <Typography key={reply.id} sx={{ ml: 2 }}>- {reply.content}</Typography>
                ))}
              </Box>
              <TextField fullWidth label="リプライ" value={replyContent[post.id] || ''} onChange={(e) => setReplyContent({ ...replyContent, [post.id]: e.target.value })} /><br />
              <Button onClick={() => handleReply(post.id)}>送信</Button>
              <Button onClick={() => handleSummary(post.id)}>要約</Button>
              {summary[post.id] && <Typography variant="body2">要約: {summary[post.id]}</Typography>}
            </CardContent>
          </Card>
        ))}
      </Container>
    </Box>
  );
}

export default App;