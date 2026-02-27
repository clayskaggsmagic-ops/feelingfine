# Feeling Fine — Future To-Do List

## Production Readiness
- [ ] Re-enable API rate limiters in `backend/src/index.js` (currently disabled for dev)
- [ ] Deploy latest schema to production: `firebase deploy --only dataconnect`
- [ ] Deploy backend + frontend to Firebase App Hosting
- [ ] Verify DNS propagation for `feelingfine.org`

## Polish & Bugs
- [ ] Test walkthrough end-to-end on mobile (iOS Safari, Android Chrome)
- [ ] Test invite flow end-to-end (create → share → signup → auto-accept)
- [ ] Verify "Other Cornerstones" daily dos load and toggle correctly

## Future Features
- [ ] Push notifications for friend requests and group invites
- [ ] Email notifications (daily dose reminders)
- [ ] Profile photo upload
- [ ] Achievement badges / streak rewards
- [ ] Group chat read receipts
