/**
 * Wipe all users and their related data from the database.
 * Usage: node scripts/wipe-users.js
 */
import '../src/services/firebase.js';
import { query, mutate } from '../src/services/dataConnect.js';

async function wipeAllUsers() {
    // 1. Get all users
    const data = await query(`query { users { id email displayName } }`);
    const users = data.users || [];

    if (users.length === 0) {
        console.log('No users found.');
        return;
    }

    console.log(`Found ${users.length} user(s) to delete:\n`);
    for (const u of users) {
        console.log(`  - ${u.id} (${u.email}, ${u.displayName})`);
    }

    // 2. Delete child records first, then users
    for (const u of users) {
        console.log(`\nDeleting data for ${u.email}...`);

        try { await mutate(`mutation($uid: String!) { trackingDay_deleteMany(where: { userId: { eq: $uid } }) }`, { uid: u.id }); } catch { }
        try { await mutate(`mutation($uid: String!) { completedDo_deleteMany(where: { userId: { eq: $uid } }) }`, { uid: u.id }); } catch { }
        try { await mutate(`mutation($uid: String!) { customDo_deleteMany(where: { userId: { eq: $uid } }) }`, { uid: u.id }); } catch { }
        try { await mutate(`mutation($uid: String!) { surveyResponse_deleteMany(where: { userId: { eq: $uid } }) }`, { uid: u.id }); } catch { }

        await mutate(`mutation($id: String!) { user_delete(id: $id) }`, { id: u.id });
        console.log(`  ✓ Deleted ${u.email}`);
    }

    console.log('\n✅ All users wiped from database.');
    console.log('⚠️  Remember to also delete them from Firebase Auth:');
    console.log('   Firebase Console → Authentication → Users → Delete each one');
}

wipeAllUsers().then(() => process.exit(0)).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
