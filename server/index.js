import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const SECRET_KEY = 'Z_GEOSPATIAL_SUPER_SECRET_KEY'; // 在实际生产环境中应该使用环境变量

app.use(cors());
app.use(express.json());

// 确保数据库目录存在
const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)){
    fs.mkdirSync(dbDir);
}

// 初始化 SQLite 数据库
const dbPath = path.join(dbDir, 'database.sqlite');
const db = new (sqlite3.verbose()).Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initDb();
  }
});

// 初始化数据库表
function initDb() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      parent_id INTEGER,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(parent_id) REFERENCES comments(id)
    )`);
  });
}

// === 认证中间件 ===
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.status(401).json({ error: '请先登录' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: '登录已过期，请重新登录' });
    req.user = user;
    next();
  });
};

// === API 路由 ===

// 1. 用户注册
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  db.get('SELECT username FROM users WHERE username = ?', [username], async (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.status(400).json({ error: '用户名已存在' });

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: '注册成功', userId: this.lastID });
      });
    } catch (error) {
      res.status(500).json({ error: '加密密码失败' });
    }
  });
});

// 2. 用户登录
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  db.get('SELECT id, username, password FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(400).json({ error: '用户名或密码错误' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: '用户名或密码错误' });

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, username: user.username } });
  });
});

// 3. 获取特定话题的评论
app.get('/api/comments/:topic_id', (req, res) => {
  const { topic_id } = req.params;
  
  const query = `
    SELECT c.id, c.parent_id, c.content, c.created_at, u.username 
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.topic_id = ?
    ORDER BY c.created_at ASC
  `;

  db.all(query, [topic_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // 将扁平结构转换为嵌套树状结构
    const commentsMap = {};
    const rootComments = [];

    rows.forEach(row => {
      commentsMap[row.id] = { ...row, replies: [] };
    });

    rows.forEach(row => {
      if (row.parent_id) {
        if (commentsMap[row.parent_id]) {
          commentsMap[row.parent_id].replies.push(commentsMap[row.id]);
        } else {
            // 父评论被删除或未查到，降级为根评论
            rootComments.push(commentsMap[row.id]);
        }
      } else {
        rootComments.push(commentsMap[row.id]);
      }
    });

    res.json(rootComments);
  });
});

// 4. 发表评论/回复
app.post('/api/comments', authenticateToken, (req, res) => {
  const { topic_id, content, parent_id } = req.body;
  const user_id = req.user.id;

  if (!topic_id || !content) {
    return res.status(400).json({ error: '话题ID和内容不能为空' });
  }

  const query = 'INSERT INTO comments (topic_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)';
  db.run(query, [topic_id, user_id, parent_id || null, content], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, message: '评论发表成功' });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
