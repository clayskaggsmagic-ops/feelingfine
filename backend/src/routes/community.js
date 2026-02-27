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
// ─── Invitations (shareable links) ──────────────────────────────────────────

function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

// Create an invite link
router.post('/invite', requireAuth, async (req, res, next) => {
    try {
        const { type, groupId } = req.body; // type: 'friend' | 'group'
        if (!type || !['friend', 'group'].includes(type)) {
            return res.status(400).json({ error: 'type must be "friend" or "group"' });
        }
        if (type === 'group' && !groupId) {
            return res.status(400).json({ error: 'groupId required for group invites' });
        }

        const code = generateCode();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

        const data = { code, type, createdById: req.user.uid, expiresAt };
        if (groupId) data.groupId = groupId;

        await mutate(
            `mutation($data: Invitation_Data!) { invitation_insert(data: $data) { id } }`,
            { data }
        );

        console.log(`[invite] Created ${type} invite: ${code} by ${req.user.uid}`);
        res.status(201).json({ code, type });
    } catch (err) { next(err); }
});

// Look up an invite (public — no auth required)
router.get('/invite/:code', async (req, res, next) => {
    try {
        const result = await query(
            `query($code: String!) { invitations(where: { code: { eq: $code } }) { id code type groupId expiresAt createdBy { displayName photoURL } } }`,
            { code: req.params.code }
        );
        const invite = result.invitations?.[0];
        if (!invite) return res.status(404).json({ error: 'Invite not found' });

        // Check expiration
        if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
            return res.status(410).json({ error: 'This invite has expired' });
        }

        const response = {
            code: invite.code,
            type: invite.type,
            creatorName: invite.createdBy?.displayName || 'Someone',
            creatorPhoto: invite.createdBy?.photoURL || null,
        };

        // If group invite, fetch group name
        if (invite.type === 'group' && invite.groupId) {
            const groupResult = await query(
                `query($id: UUID!) { communityGroup(id: $id) { name description } }`,
                { id: invite.groupId }
            );
            response.groupName = groupResult.communityGroup?.name || 'a group';
            response.groupDescription = groupResult.communityGroup?.description || '';
        }

        res.json(response);
    } catch (err) { next(err); }
});

// Accept an invite
router.post('/invite/:code/accept', requireAuth, async (req, res, next) => {
    try {
        const uid = req.user.uid;
        const result = await query(
            `query($code: String!) { invitations(where: { code: { eq: $code } }) { id code type groupId createdById expiresAt } }`,
            { code: req.params.code }
        );
        const invite = result.invitations?.[0];
        if (!invite) return res.status(404).json({ error: 'Invite not found' });

        if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
            return res.status(410).json({ error: 'This invite has expired' });
        }

        // Don't let users accept their own invite
        if (invite.createdById === uid) {
            return res.status(400).json({ error: 'Cannot accept your own invite' });
        }

        if (invite.type === 'friend') {
            // Create accepted friend request (skip pending)
            await mutate(
                `mutation($data: FriendRequest_Data!) { friendRequest_insert(data: $data) { id } }`,
                { data: { fromUserId: invite.createdById, toUserId: uid, status: 'accepted' } }
            );
            console.log(`[invite] Friend invite ${invite.code} accepted by ${uid}`);
            res.json({ success: true, type: 'friend', message: 'Friend added!' });
        } else if (invite.type === 'group') {
            await mutate(
                `mutation($data: GroupMember_Data!) { groupMember_insert(data: $data) { id } }`,
                { data: { groupId: invite.groupId, userId: uid } }
            );
            console.log(`[invite] Group invite ${invite.code} accepted by ${uid}`);
            res.json({ success: true, type: 'group', message: 'Joined the group!' });
        }
    } catch (err) { next(err); }
});

export default router;
