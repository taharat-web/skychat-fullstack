/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Password123!';

async function upsertUser({ username, email }) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      username,
      email,
      passwordHash,
      isEmailVerified: true,
      bio: `Hi, I'm ${username}! Using SkyChat.`,
    },
  });
}

async function main() {
  console.log('Seeding SkyChat demo data...');

  const alice = await upsertUser({ username: 'alice', email: 'alice@skychat.dev' });
  const bob = await upsertUser({ username: 'bob', email: 'bob@skychat.dev' });
  const carol = await upsertUser({ username: 'carol', email: 'carol@skychat.dev' });

  // --- Friendship: alice <-> bob -------------------------------------------
  const [a, b] = [alice.id, bob.id].sort();
  await prisma.friendship.upsert({
    where: { userAId_userBId: { userAId: a, userBId: b } },
    update: {},
    create: { userAId: a, userBId: b },
  });

  // --- Pending friend request: carol -> alice ------------------------------
  const existingRequest = await prisma.friendRequest.findUnique({
    where: { senderId_receiverId: { senderId: carol.id, receiverId: alice.id } },
  }).catch(() => null);
  if (!existingRequest) {
    await prisma.friendRequest.create({
      data: { senderId: carol.id, receiverId: alice.id, status: 'PENDING' },
    });
    await prisma.notification.create({
      data: {
        userId: alice.id,
        type: 'FRIEND_REQUEST_RECEIVED',
        payload: { fromUser: { id: carol.id, username: carol.username } },
      },
    });
  }

  // --- Direct conversation: alice <-> bob ----------------------------------
  let directConvo = await prisma.conversation.findFirst({
    where: {
      type: 'DIRECT',
      AND: [{ participants: { some: { userId: alice.id } } }, { participants: { some: { userId: bob.id } } }],
    },
  });

  if (!directConvo) {
    directConvo = await prisma.conversation.create({
      data: {
        type: 'DIRECT',
        participants: { create: [{ userId: alice.id }, { userId: bob.id }] },
      },
    });

    const messages = [
      { senderId: alice.id, content: 'Hey Bob! Welcome to SkyChat 👋' },
      { senderId: bob.id, content: 'Hey Alice! This is pretty slick.' },
      { senderId: alice.id, content: 'Try editing a message or checking the group chat.' },
    ];

    for (const m of messages) {
      const created = await prisma.message.create({
        data: { conversationId: directConvo.id, ...m },
      });
      const recipientId = m.senderId === alice.id ? bob.id : alice.id;
      await prisma.messageStatus.create({
        data: { messageId: created.id, userId: recipientId, status: 'SEEN' },
      });
    }

    await prisma.conversation.update({
      where: { id: directConvo.id },
      data: { lastMessageAt: new Date() },
    });
  }

  // --- Group: SkyChat Team (alice=ADMIN, bob=MODERATOR, carol=MEMBER) -----
  let group = await prisma.conversation.findFirst({
    where: { type: 'GROUP', group: { name: 'SkyChat Team' } },
  });

  if (!group) {
    group = await prisma.conversation.create({
      data: {
        type: 'GROUP',
        participants: {
          create: [
            { userId: alice.id, role: 'ADMIN' },
            { userId: bob.id, role: 'MODERATOR' },
            { userId: carol.id, role: 'MEMBER' },
          ],
        },
        group: {
          create: {
            name: 'SkyChat Team',
            description: 'Demo group seeded for local testing',
            createdById: alice.id,
          },
        },
      },
    });

    const groupMessages = [
      { senderId: alice.id, content: 'Welcome to the team group!' },
      { senderId: bob.id, content: "Thanks for adding me, I'll help moderate." },
      { senderId: carol.id, content: 'Excited to be here 🎉' },
    ];

    for (const m of groupMessages) {
      await prisma.message.create({ data: { conversationId: group.id, ...m } });
    }

    await prisma.conversation.update({ where: { id: group.id }, data: { lastMessageAt: new Date() } });
  }

  console.log('\nSeed complete. Demo accounts (all use the same password):');
  console.log(`  alice@skychat.dev / ${DEMO_PASSWORD}  (group admin)`);
  console.log(`  bob@skychat.dev   / ${DEMO_PASSWORD}  (group moderator)`);
  console.log(`  carol@skychat.dev / ${DEMO_PASSWORD}  (group member, has a pending friend request to alice)`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
