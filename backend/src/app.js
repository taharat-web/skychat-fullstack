const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');
const env = require('./config/env');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');
const { globalLimiter } = require('./middleware/rateLimit.middleware');

const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/user.routes');
const friendRoutes = require('./modules/friends/friend.routes');
const conversationRoutes = require('./modules/conversations/conversation.routes');
const messageRoutes = require('./modules/messages/message.routes');
const groupRoutes = require('./modules/groups/group.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const backupRoutes = require('./modules/backup/backup.routes');

const app = express();

// Behind a reverse proxy (Nginx/Docker), trust the first hop so req.ip and
// secure-cookie detection reflect the real client rather than the proxy.
app.set('trust proxy', 1);

app.use(
  helmet({
    // We serve images cross-origin (frontend origin loads /uploads/* from
    // the API origin in the split dev setup), so relax COEP/CORP for that
    // one case while keeping every other Helmet protection on.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(globalLimiter);

// Uploaded avatars. Filenames are server-generated UUIDs (see
// utils/imageStorage.js) so there is nothing sensitive or executable to
// protect against beyond standard static-file serving.
app.use('/uploads', express.static(path.join(process.cwd(), env.UPLOAD_DIR)));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/backup', backupRoutes);

app.use('/api', notFoundHandler);
app.use(errorHandler);

module.exports = app;
