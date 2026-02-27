'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import styles from './community.module.css';

const TABS = [
    { id: 'challenge', label: '🏆 Challenge', },
    { id: 'friends', label: '👥 Friends' },
    { id: 'podcasts', label: '🎧 Podcasts' },
    { id: 'webinars', label: '📺 Webinars' },
];

export default function CommunityPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [tab, setTab] = useState('challenge');

    useEffect(() => { if (!loading && !user) router.push('/login'); }, [loading, user, router]);
    if (loading || !user) return null;

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <button onClick={() => router.push('/dashboard')} className={styles.backBtn}>← Dashboard</button>
                <h1 className={styles.title}>Community</h1>
            </header>

            <nav className={styles.tabs}>
                {TABS.map(t => (
                    <button key={t.id} className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`} onClick={() => setTab(t.id)}>
                        {t.label}
                    </button>
                ))}
            </nav>

            <div className={styles.content}>
                {tab === 'challenge' && <ChallengeTab />}
                {tab === 'friends' && <FriendsTab uid={user.uid} />}
                {tab === 'podcasts' && <PodcastsTab />}
                {tab === 'webinars' && <WebinarsTab />}
            </div>
        </div>
    );
}

// ── Challenge Tab ───────────────────────────────────────────────────────────
function ChallengeTab() {
    const [challenge, setChallenge] = useState(null);
    useEffect(() => {
        api.get('/v1/content/weekly-challenge').then(d => setChallenge(d)).catch(() => { });
    }, []);
    return (
        <div className={styles.challengeCard}>
            <h2>🏆 This Week&apos;s Challenge</h2>
            {challenge?.challenge ? (
                <>
                    <p className={styles.challengeText}>{challenge.challenge}</p>
                    {challenge.cornerstoneId && <span className={styles.badge}>{challenge.cornerstoneId}</span>}
                </>
            ) : (
                <p className={styles.emptyMsg}>No challenge set this week. Check back soon!</p>
            )}
        </div>
    );
}

// ── Friends Tab (with integrated chat) ──────────────────────────────────────
function FriendsTab({ uid }) {
    const [friends, setFriends] = useState({ incoming: [], outgoing: [] });
    const [groups, setGroups] = useState([]);
    const [friendEmail, setFriendEmail] = useState('');
    const [groupName, setGroupName] = useState('');
    const [groupDesc, setGroupDesc] = useState('');
    const [toast, setToast] = useState('');
    // Chat state — opens inline when clicking a friend or group
    const [chatOpen, setChatOpen] = useState(null); // { type: 'friend'|'group', id, name }
    const [messages, setMessages] = useState([]);
    const [msgText, setMsgText] = useState('');
    const bottomRef = useRef(null);

    const fetchAll = useCallback(async () => {
        const [f, g] = await Promise.all([
            api.get('/v1/community/friends').catch(() => ({ incoming: [], outgoing: [] })),
            api.get('/v1/community/groups').catch(() => ({ groups: [] })),
        ]);
        setFriends(f);
        setGroups(g.groups || []);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Fetch messages when chatOpen changes
    const fetchMessages = useCallback(async () => {
        if (!chatOpen) return;
        const param = chatOpen.type === 'group' ? `groupId=${chatOpen.id}` : `friendId=${chatOpen.id}`;
        try {
            const data = await api.get(`/v1/community/messages?${param}`);
            setMessages(data.messages || []);
        } catch { }
    }, [chatOpen]);

    useEffect(() => {
        fetchMessages();
        const i = setInterval(fetchMessages, 5000);
        return () => clearInterval(i);
    }, [fetchMessages]);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

    async function sendRequest() {
        if (!friendEmail) return;
        try {
            await api.post('/v1/community/friends/request', { toUserId: friendEmail });
            showToast('Friend request sent!');
            setFriendEmail('');
            fetchAll();
        } catch (err) { showToast('Error: ' + err.message); }
    }

    async function handleFriend(id, status) {
        try {
            if (status === 'remove') await api.delete(`/v1/community/friends/${id}`);
            else await api.patch(`/v1/community/friends/${id}`, { status });
            fetchAll();
        } catch (err) { showToast('Error: ' + err.message); }
    }

    async function createGroup() {
        if (!groupName) return;
        try {
            await api.post('/v1/community/groups', { name: groupName, description: groupDesc });
            showToast('Group created!');
            setGroupName(''); setGroupDesc('');
            fetchAll();
        } catch (err) { showToast('Error: ' + err.message); }
    }

    async function joinGroup(id) {
        try { await api.post(`/v1/community/groups/${id}/join`); showToast('Joined!'); fetchAll(); }
        catch (err) { showToast('Error: ' + err.message); }
    }

    async function leaveGroup(id) {
        try { await api.delete(`/v1/community/groups/${id}/leave`); showToast('Left group'); fetchAll(); }
        catch (err) { showToast('Error: ' + err.message); }
    }

    async function inviteFriend() {
        try {
            const { code } = await api.post('/v1/community/invite', { type: 'friend' });
            const url = `${window.location.origin}/invite?code=${code}`;
            if (navigator.share) {
                await navigator.share({ title: 'Join me on Feeling Fine!', url });
            } else {
                await navigator.clipboard.writeText(url);
                showToast('Invite link copied!');
            }
        } catch (err) {
            console.error('[community] inviteFriend error:', err);
            showToast('Error: ' + (err.message || 'Could not create invite'));
        }
    }

    async function inviteToGroup(groupId) {
        try {
            const { code } = await api.post('/v1/community/invite', { type: 'group', groupId });
            const url = `${window.location.origin}/invite?code=${code}`;
            if (navigator.share) {
                await navigator.share({ title: 'Join our group on Feeling Fine!', url });
            } else {
                await navigator.clipboard.writeText(url);
                showToast('Group invite link copied!');
            }
        } catch (err) { showToast('Error creating invite'); }
    }

    async function sendMessage() {
        if (!msgText.trim() || !chatOpen) return;
        const body = { text: msgText };
        if (chatOpen.type === 'group') body.recipientGroupId = chatOpen.id;
        else body.recipientUserId = chatOpen.id;
        try { await api.post('/v1/community/messages', body); setMsgText(''); fetchMessages(); }
        catch { }
    }

    const accepted = [...friends.incoming.filter(f => f.status === 'accepted'), ...friends.outgoing.filter(f => f.status === 'accepted')];
    const pending = friends.incoming.filter(f => f.status === 'pending');

    // If chat is open, show the chat panel instead
    if (chatOpen) {
        return (
            <div>
                <button className={styles.backBtn} onClick={() => { setChatOpen(null); setMessages([]); }}>
                    ← Back to Friends
                </button>
                <h3 style={{ margin: '0.75rem 0' }}>💬 {chatOpen.name}</h3>
                <div className={styles.chatBox}>
                    {messages.length === 0 ? <p className={styles.emptyMsg}>No messages yet. Say hello!</p> : messages.map(m => (
                        <div key={m.id} className={`${styles.chatBubble} ${m.sender?.uid === uid ? styles.chatBubbleMine : ''}`}>
                            <span className={styles.chatSender}>{m.sender?.displayName || 'User'}</span>
                            <p>{m.text}</p>
                            <span className={styles.chatTime}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    ))}
                    <div ref={bottomRef} />
                </div>
                <div className={styles.chatInput}>
                    <input value={msgText} onChange={e => setMsgText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." />
                    <button onClick={sendMessage} className={styles.sendBtn}>Send</button>
                </div>
            </div>
        );
    }

    return (
        <div>
            {toast && <div className={styles.toastInline}>{toast}</div>}

            {/* Invite a friend */}
            <div className={styles.sectionBox} style={{ marginBottom: '1rem' }}>
                <button onClick={inviteFriend} className={styles.inviteBtn}>
                    📩 Invite a Friend
                </button>
            </div>

            {/* Add friend by ID */}
            <div className={styles.friendSend}>
                <input value={friendEmail} onChange={e => setFriendEmail(e.target.value)} placeholder="Friend's user ID..." />
                <button onClick={sendRequest} className={styles.smallBtn}>Send Request</button>
            </div>

            {/* Pending requests */}
            {pending.length > 0 && (
                <div className={styles.sectionBox}>
                    <h3>Pending Requests</h3>
                    {pending.map(r => (
                        <div key={r.id} className={styles.friendRow}>
                            <span>{r.fromUser?.displayName || r.fromUserId}</span>
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                                <button className={styles.acceptBtn} onClick={() => handleFriend(r.id, 'accepted')}>Accept</button>
                                <button className={styles.rejectBtn} onClick={() => handleFriend(r.id, 'rejected')}>Decline</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Friends list — click to chat */}
            <div className={styles.sectionBox}>
                <h3>Friends ({accepted.length})</h3>
                {accepted.length === 0 ? <p className={styles.emptyMsg}>No friends yet. Invite someone!</p> : accepted.map(f => {
                    const friendUid = f.fromUserId === uid ? f.toUserId : f.fromUserId;
                    const friendName = f.fromUser?.displayName || f.toUser?.displayName || 'Friend';
                    return (
                        <div key={f.id} className={`${styles.friendRow} ${styles.friendRowClickable}`} onClick={() => setChatOpen({ type: 'friend', id: friendUid, name: friendName })}>
                            <span>{friendName}</span>
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                                <span className={styles.chatHint}>💬 Chat</span>
                                <button className={styles.rejectBtn} onClick={e => { e.stopPropagation(); handleFriend(f.id, 'remove'); }}>Remove</button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Groups — click to chat */}
            <div className={styles.sectionBox}>
                <h3>Groups ({groups.length})</h3>
                <div className={styles.friendSend} style={{ marginBottom: '0.75rem' }}>
                    <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Group name..." />
                    <button onClick={createGroup} className={styles.smallBtn}>Create</button>
                </div>
                {groups.map(g => (
                    <div key={g.id} className={`${styles.friendRow} ${styles.friendRowClickable}`} onClick={() => setChatOpen({ type: 'group', id: g.id, name: g.name })}>
                        <div><strong>{g.name}</strong> <span className={styles.badge}>{g.category}</span>{g.description && <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.2rem' }}>{g.description}</p>}</div>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <span className={styles.chatHint}>💬 Chat</span>
                            <button className={styles.smallBtn} onClick={e => { e.stopPropagation(); inviteToGroup(g.id); }}>Invite</button>
                            <button className={styles.acceptBtn} onClick={e => { e.stopPropagation(); joinGroup(g.id); }}>Join</button>
                            <button className={styles.rejectBtn} onClick={e => { e.stopPropagation(); leaveGroup(g.id); }}>Leave</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Podcasts Tab ────────────────────────────────────────────────────────────
function PodcastsTab() {
    const [podcasts, setPodcasts] = useState([]);
    const [filter, setFilter] = useState('');
    useEffect(() => {
        const url = filter ? `/v1/content/podcasts?category=${filter}` : '/v1/content/podcasts';
        api.get(url).then(d => setPodcasts(d.podcasts || [])).catch(() => { });
    }, [filter]);
    return (
        <div>
            <select value={filter} onChange={e => setFilter(e.target.value)} className={styles.filterSelect}>
                <option value="">All Categories</option>
                {['Nutrition', 'Movement', 'Sleep', 'Stress Management', 'Social Connection', 'Brain Health', 'Healthy Aging'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {podcasts.length === 0 ? <p className={styles.emptyMsg}>No podcasts available.</p> : podcasts.map(p => (
                <div key={p.id} className={styles.mediaCard}>
                    <div className={styles.mediaInfo}>
                        <h3>{p.title}</h3>
                        <p>{p.description}</p>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span className={styles.badge}>{p.category}</span>
                            {p.duration && <span style={{ fontSize: '0.8rem', color: '#888' }}>{p.duration}</span>}
                        </div>
                    </div>
                    {p.audioUrl && <audio controls src={p.audioUrl} className={styles.audioPlayer} />}
                </div>
            ))}
        </div>
    );
}

// ── Webinars Tab ────────────────────────────────────────────────────────────
function WebinarsTab() {
    const [webinars, setWebinars] = useState([]);
    useEffect(() => {
        api.get('/v1/content/webinars').then(d => setWebinars(d.webinars || [])).catch(() => { });
    }, []);

    const upcoming = webinars.filter(w => w.status === 'upcoming' || w.status === 'live');
    const past = webinars.filter(w => w.status === 'recorded');

    return (
        <div>
            {upcoming.length > 0 && (
                <div className={styles.sectionBox}>
                    <h3>Upcoming</h3>
                    {upcoming.map(w => (
                        <div key={w.id} className={styles.mediaCard}>
                            <div className={styles.mediaInfo}>
                                <h3>{w.title} {w.status === 'live' && <span className={styles.liveBadge}>● LIVE</span>}</h3>
                                <p>{w.description}</p>
                                <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                    {new Date(w.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                    {w.hostName && ` — Hosted by ${w.hostName}`}
                                </p>
                            </div>
                            {w.registrationUrl && <a href={w.registrationUrl} target="_blank" rel="noopener noreferrer" className={styles.registerBtn}>Register →</a>}
                        </div>
                    ))}
                </div>
            )}
            {past.length > 0 && (
                <div className={styles.sectionBox}>
                    <h3>Past Recordings</h3>
                    {past.map(w => (
                        <div key={w.id} className={styles.mediaCard}>
                            <div className={styles.mediaInfo}>
                                <h3>{w.title}</h3>
                                <p>{w.description}</p>
                                <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>{new Date(w.date).toLocaleDateString()}{w.hostName && ` — ${w.hostName}`}</p>
                            </div>
                            {w.recordingUrl && <a href={w.recordingUrl} target="_blank" rel="noopener noreferrer" className={styles.registerBtn}>Watch →</a>}
                        </div>
                    ))}
                </div>
            )}
            {webinars.length === 0 && <p className={styles.emptyMsg}>No webinars yet.</p>}
        </div>
    );
}
