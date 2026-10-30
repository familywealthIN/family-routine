# GroupMemberList

The members card: a header, the member rows (passed in through the default slot so each one can own its own read), the pending-invite rows, and the in-list "Invite someone" row that dims and relabels when the group is full.

- Level: Organism · on Groups · source `packages/ui/organisms/GroupMemberList/GroupMemberList.vue`
- Used by: `apps/web-app/src/containers/GroupInviteCancelContainer.vue`, `apps/web-app/src/containers/GroupMembersContainer.vue`, `apps/web-app/src/containers/GroupPendingInvitesContainer.vue`
- Stories shown: Default, With Pending Invites, Full

Rendered from Storybook by `packages/design/tools/build-canvases.js`; the screenshot is the shipped component. For the tokens it uses see `tokens.json`; for the rules of the core patterns see the hand-built components (`components/Button`, `GoalRow`, `ChatThread`, …).
