/**
 * Community routes — Friends, Groups, Chat.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query, mutate } from '../services/dataConnect.js';

const router = Router();

// ─── Friends ────────────────────────────────────────────────────────────────

// Send friend request
router.post('/friends/request', requireAuth, async (req, res, next) => {
    try {
        const { toUserId } = req.body;
        if (!toUserId) return res.status(400).json({ error: 'toUserId required' });
        const result = await mutate(
            `mutation($data: FriendRequest_Data!) { friendRequest_insert(data: $data) { id } }`,
            { data: { fromUserId: req.user.uid, toUserId, status: 'pending' } }
        );
        res.status(201).json(result);
    } catch (err) { next(err); }
});

// Get my friend requests (incoming + outgoing)
router.get('/friends', requireAuth, async (req, res, next) => {
    try {
        const uid = req.user.uid;
        const incoming = await query(
            `query($uid: String!) { friendRequests(where: { toUserId: { eq: $uid } }) { id fromUserId status createdAt fromUser { displayName email } } }`,
            { uid }
        );
        const outgoing = await query(
            `query($uid: String!) { friendRequests(where: { fromUserId: { eq: $uid } }) { id toUserId status createdAt toUser { displayName email } } }`,
            { uid }
        );
        res.json({
            incoming: incoming.friendRequests || [],
            outgoing: outgoing.friendRequests || [],
        });
    } catch (err) { next(err); }
});

// Accept/reject/remove friend
router.patch('/friends/:id', requireAuth, async (req, res, next) => {
    try {
        const { status } = req.body; // 'accepted' or 'rejected'
        await mutate(
            `mutation($id: UUID!, $data: FriendRequest_Data!) { friendRequest_update(id: $id, data: $data) { id } }`,
            { id: req.params.id, data: { status } }
        );
        res.json({ success: true });
    } catch (err) { next(err); }
});

router.delete('/friends/:id', requireAuth, async (req, res, next) => {
    try {
        await mutate(`mutation($id: UUID!) { friendRequest_delete(id: $id) }`, { id: req.params.id });
        res.status(204).end();
    } catch (err) { next(err); }
});

// ─── Groups ─────────────────────────────────────────────────────────────────

router.get('/groups', requireAuth, async (req, res, next) => {
    try {
        const data = await query(`query { communityGroups { id name description category createdAt createdBy { displayName } } }`);
        res.json({ groups: data.communityGroups || [] });
    } catch (err) { next(err); }
});

router.post('/groups', requireAuth, async (req, res, next) => {
    try {
        const { name, description, category } = req.body;
        const result = await mutate(
            `mutation($data: CommunityGroup_Data!) { communityGroup_insert(data: $data) { id } }`,
            { data: { name, description, category, createdById: req.user.uid } }
        );
        // Auto-join creator
        await mutate(
            `mutation($data: GroupMember_Data!) { groupMember_insert(data: $data) { id } }`,
            { data: { groupId: result.communityGroup_insert.id, userId: req.user.uid } }
        );
        res.status(201).json(result);
    } catch (err) { next(err); }
});

router.post('/groups/:id/join', requireAuth, async (req, res, next) => {
    try {
        await mutate(
            `mutation($data: GroupMember_Data!) { groupMember_insert(data: $data) { id } }`,
            { data: { groupId: req.params.id, userId: req.user.uid } }
        );
        res.json({ joined: true });
    } catch (err) { next(err); }
});

router.delete('/groups/:id/leave', requireAuth, async (req, res, next) => {
    try {
        const members = await query(
            `query($gid: UUID!, $uid: String!) { groupMembers(where: { groupId: { eq: $gid }, userId: { eq: $uid } }) { id } }`,
            { gid: req.params.id, uid: req.user.uid }
        );
        const memberId = members.groupMembers?.[0]?.id;
        if (memberId) await mutate(`mutation($id: UUID!) { groupMember_delete(id: $id) }`, { id: memberId });
        res.status(204).end();
    } catch (err) { next(err); }
});

// ─── Chat Messages ──────────────────────────────────────────────────────────

router.get('/messages', requireAuth, async (req, res, next) => {
    try {
        const { friendId, groupId } = req.query;
        const uid = req.user.uid;
        let messages = [];

        if (groupId) {
            const data = await query(
                `query($gid: UUID!) { chatMessages(where: { recipientGroupId: { eq: $gid } }, orderBy: [{ createdAt: ASC }]) {
                    id text createdAt sender { uid displayName }
                }}`,
                { gid: groupId }
            );
            messages = data.chatMessages || [];
        } else if (friendId) {
            // Messages between two users (both directions)
            const data = await query(
                `query($uid1: String!, $uid2: String!) { chatMessages(where: {
                    or: [
                        { senderId: { eq: $uid1 }, recipientUserId: { eq: $uid2 } },
                        { senderId: { eq: $uid2 }, recipientUserId: { eq: $uid1 } }
                    ]
                }, orderBy: [{ createdAt: ASC }]) {
                    id text createdAt sender { uid displayName }
                }}`,
                { uid1: uid, uid2: friendId }
            );
            messages = data.chatMessages || [];
        }
        res.json({ messages });
    } catch (err) { next(err); }
});

router.post('/messages', requireAuth, async (req, res, next) => {
    try {
        const { text, recipientUserId, recipientGroupId } = req.body;
        if (!text) return res.status(400).json({ error: 'text required' });
        const data = { senderId: req.user.uid, text };
        if (recipientUserId) data.recipientUserId = recipientUserId;
        if (recipientGroupId) data.recipientGroupId = recipientGroupId;
        const result = await mutate(
            `mutation($data: ChatMessage_Data!) { chatMessage_insert(data: $data) { id } }`,
            { data }
        );
        res.status(201).json(result);
    } catch (err) { next(err); }
});

export default router;
