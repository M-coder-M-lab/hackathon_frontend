// MUIバージョンに変換したApp.js
import React, { useEffect, useState } from 'react';
import {
  Container,
  TextField,
  Button,
  Typography,
  Card,
  CardContent,
  CardActions,
  Box,
  CircularProgress,
  Divider,
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import FavoriteIcon from '@mui/icons-material/Favorite';
import SendIcon from '@mui/icons-material/Send';
import SummarizeIcon from '@mui/icons-material/Summarize';
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
    } catch (error) {
      console.error('認証エラー:', error);
      setErrorMessage('認証に失敗しました。');
    }
  };

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/posts`);
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      setPosts([]);
    } finally {
      setIsLoading(false);
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
      fetchPosts();
    } catch (e) {
      alert('投稿失敗');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    localStorage.removeItem('user');
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: user.uid, post_id: postId, content }),
    });
    setReplyContent((prev) => ({ ...prev, [postId]: '' }));
    fetchPosts();
  };

  const handleSummary = async (postId) => {
    const post = posts.find((p) => p.id === postId);
    if (!post?.replies?.length) {
      setSummary((prev) => ({ ...prev, [postId]: 'リプライがありません。' }));
      return;
    }
    const res = await fetch(`${API_BASE}/summary/${postId}`);
    const data = await res.json();
    setSummary((prev) => ({ ...prev, [postId]: data.summary }));
  };

  if (!user) {
    return (
      <Container maxWidth="xs" sx={{ mt: 5 }}>
        <Typography variant="h5" gutterBottom>{isRegistering ? '新規登録' : 'ログイン'}</Typography>
        <Box component="form" onSubmit={handleAuth} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {isRegistering && <Typography variant="body2">※ パスワードは6文字以上必要です</Typography>}
          <TextField label="メールアドレス" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <TextField label="パスワード" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button type="submit" variant="contained">{isRegistering ? '登録' : 'ログイン'}</Button>
        </Box>
        <Button onClick={() => setIsRegistering(!isRegistering)} sx={{ mt: 2 }}>
          {isRegistering ? 'ログイン画面へ' : '新規登録画面へ'}
        </Button>
        {errorMessage && <Typography color="error">{errorMessage}</Typography>}
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Welcome, {user.username}</Typography>
          <IconButton color="inherit" onClick={handleLogout}><LogoutIcon /></IconButton>
        </Toolbar>
      </AppBar>
      <Box sx={{ mt: 2 }}>
        <TextField
          multiline
          fullWidth
          label="新しい投稿"
          value={postContent}
          onChange={(e) => setPostContent(e.target.value)}
        />
        <Button onClick={handlePost} variant="contained" fullWidth sx={{ mt: 1 }}>投稿</Button>
      </Box>
      <Divider sx={{ my: 2 }} />
      {isLoading ? <CircularProgress /> : (
        posts.map((post) => (
          <Card key={post.id} sx={{ mb: 2 }}>
            <CardContent>
              <Typography>{post.content}</Typography>
              <Typography variant="body2" color="text.secondary">いいね: {post.likes}</Typography>
              <CardActions>
                <Button onClick={() => handleLike(post.id)} startIcon={<FavoriteIcon />}>いいね</Button>
              </CardActions>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2">リプライ:</Typography>
              {(post.replies || []).map(reply => (
                <Typography key={reply.id} variant="body2">- {reply.content}</Typography>
              ))}
              <TextField
                fullWidth
                label="リプライ"
                value={replyContent[post.id] || ''}
                onChange={(e) => setReplyContent({ ...replyContent, [post.id]: e.target.value })}
                sx={{ mt: 1 }}
              />
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Button variant="outlined" onClick={() => handleReply(post.id)} startIcon={<SendIcon />}>送信</Button>
                <Button variant="outlined" onClick={() => handleSummary(post.id)} startIcon={<SummarizeIcon />}>要約</Button>
              </Box>
              {summary[post.id] && <Typography sx={{ mt: 1 }}><strong>要約:</strong> {summary[post.id]}</Typography>}
            </CardContent>
          </Card>
        ))
      )}
    </Container>
  );
}

export default App;
