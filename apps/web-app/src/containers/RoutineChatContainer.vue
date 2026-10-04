<template>
  <div class="routine-chat-container">
    <routine-chat-thread
      ref="thread"
      :messages="displayMessages"
      :goal-items="goalItems"
      :routine-name="routineName"
      :typing="typing"
      :quick-replies="quickReplies"
      @toggle-item="$emit('toggle-item', $event)"
      @add-proposals="addProposals"
      @quick-reply="send"
      @toggle-brief="toggleBrief"
      @add-brief-step="addBriefStep"
    />
  </div>
</template>

<script>
import RoutineChatThread from '@routine-notes/ui/organisms/RoutineChatThread/RoutineChatThread.vue';
import { getCachedDashboard, filterAreaProjectTags, isCacheValid } from '../utils/dashboardCache';
import { ensureTagContext } from '../composables/useDashboardCaching';
import {
  buildBriefBlocks,
  briefSubline,
  briefQuickReplyIntent,
  buildRecapReply,
  buildPlanReply,
} from '../utils/routineBrief';
import {
  ROUTINE_CHAT_QUERY,
  SEND_ROUTINE_CHAT_MUTATION,
  POST_ROUTINE_CHAT_EVENT_MUTATION,
  MARK_ROUTINE_CHAT_ADDED_MUTATION,
} from '../composables/graphql/chatQueries';

/** Client-only messages (the brief, a brief quick reply) are never persisted. */
const LOCAL_PREFIX = 'local-';
const isLocal = (id) => String(id || '').indexOf(LOCAL_PREFIX) === 0;

/**
 * Routine chat data layer.
 *
 * Owns the thread for ONE routine on ONE day, the model call (server-side, on
 * OpenRouter's free tier) and the goal-item writes a reply asks for. The page
 * above it owns the routine itself — it hands down the focused routine and its
 * checklist and calls `postEvent()` when something happens worth logging in
 * the thread (routine ticked, item checked, agent started).
 *
 * Goal-item CRUD lives here rather than in the page because the intents that
 * trigger it are a property of the conversation: an "add …" turn has to attach
 * the ids it created back onto its own reply bubble so that bubble can render
 * them as live checkboxes.
 *
 * It also owns the "Before you start" brief (design handoff § "Areas and
 * projects live in chat"): one block per `area:`/`project:` tag on the focused
 * routine, read out of the `DASHBOARD_CACHE:<tag>` entries that
 * `composables/useDashboardCaching` fills in once a day. The brief is pinned as
 * the thread's first message (`kind: 'brief'`), and its two quick replies —
 * "What did I do last time?" and "Plan from next steps" — are answered from
 * that same cache instead of being sent to the model.
 *
 * That daily sweep only covers routines the user opted into AI Search, so on
 * its own it leaves most tagged routines with no card — narrower than the
 * Areas/Projects pages the card replaced. So when a routine becomes the focused
 * one and a tag of its has no fresh entry, this container asks for that tag's
 * context THEN, via `ensureTagContext` — on demand, once per tag per session,
 * into the same store with the same 24h TTL. The sweep is untouched; this is
 * the fallback for everything it does not reach.
 */
export default {
  name: 'RoutineChatContainer',
  components: { RoutineChatThread },
  props: {
    /** DD-MM-YYYY */
    date: { type: String, required: true },
    /** The focused routine: { id, name, time, points, stimulus, ticked, passed, isCurrent } */
    routine: { type: Object, default: null },
    endTime: { type: String, default: '' },
    statusLabel: { type: String, default: '' },
    leftLabel: { type: String, default: '' },
    /** This routine's day goal items. */
    goalItems: { type: Array, default: () => [] },
    /** { D, K, G } percentages. */
    scores: { type: Object, default: () => ({ D: 0, K: 0, G: 0 }) },
    /**
     * The viewed day is behind today. The brief does not render on a past day —
     * nothing can be added to a past checklist, so an Add pill there is a lie.
     */
    isPastDay: { type: Boolean, default: false },
    /**
     * The thread sits in the same scroller as the focus card's checklist (the
     * phone). Opening a routine there must show its checklist, not the bottom
     * of its chat.
     */
    sharedScroller: { type: Boolean, default: false },
  },
  data() {
    return {
      /** `${date}|${taskRef}` + length of the last thread load, to tell a new message from a switch. */
      loadedThread: { key: '', count: 0 },
      /**
       * Set only by a chat action the USER took (sending, or accepting
       * proposals), and cleared by the next thread load.
       *
       * On the phone the thread shares one scroller with the checklist, so
       * scrolling the newest message into view scrolls the checklist off screen.
       * That is right after you type something and wrong after you tick a task —
       * ticking posts a system event, which is a new message too, and it was
       * yanking the user from the checklist down into the chat mid-list.
       */
      userScrollIntent: false,
      chatMessages: [],
      typing: false,
      sending: false,
      /** taskRef -> collapsed. Absent means open, which is the default state. */
      briefCollapsed: {},
      /**
       * `${taskRef}|${exact step text}` for steps added in this session. The
       * checklist itself is the other half of the answer (see `isStepAdded`) —
       * this half covers the window before the goals query catches up.
       */
      addedSteps: {},
      /** Brief quick-reply turns. Client-only: there is no mutation for them. */
      localMessages: [],
      /**
       * tag -> `'pending'` while its on-demand context run is in flight,
       * `'settled'` once it has finished either way.
       *
       * Two jobs. It is the per-tag "already asked" ledger, kept across routine
       * switches so two routines sharing `area:health` cost one run. And
       * because localStorage is not reactive, touching it is what makes
       * `briefBlocks` recompute when a run writes its entry.
       */
      contextRuns: {},
    };
  },
  apollo: {
    chatMessages: {
      query: ROUTINE_CHAT_QUERY,
      fetchPolicy: 'cache-and-network',
      variables() {
        return { date: this.date, taskRef: this.taskRef };
      },
      skip() {
        return !this.$root.$data.email || !this.taskRef;
      },
      update(data) {
        return data.routineChat || [];
      },
      error(error) {
        console.error('[RoutineChat] query error:', error);
      },
    },
  },
  computed: {
    taskRef() {
      return (this.routine && this.routine.id) || '';
    },
    routineName() {
      return (this.routine && this.routine.name) || 'this routine';
    },
    doneCount() {
      return this.goalItems.filter((item) => item && item.isComplete).length;
    },
    openItems() {
      return this.goalItems.filter((item) => item && !item.isComplete);
    },
    /**
     * The opening line is synthesised, not stored: it restates the routine's
     * live state, so persisting it would mean showing yesterday's numbers.
     */
    greeting() {
      if (!this.routine) return null;
      const open = this.openItems[0];
      const tail = open ? ` Want me to break down “${open.body}”?` : '';
      return {
        id: 'greeting',
        from: 'routine',
        kind: 'text',
        text: `${this.routineName} · ${this.routine.time} – ${this.endTime}. `
          + `${this.doneCount} of ${this.goalItems.length} done${this.leftLabel ? ` — ${this.leftLabel}` : ''}.${tail}`,
        items: [],
        proposals: [],
      };
    },

    // --- "Before you start" ------------------------------------------------
    /** The focused routine's `area:`/`project:` tags, in the order it lists them. */
    contextTags() {
      const tags = (this.routine && this.routine.tags) || [];
      return [...new Set(filterAreaProjectTags(tags))];
    },
    /**
     * One block per tag that has something cached, plus a head-only block for
     * any tag whose on-demand run is still out. Reading localStorage is the
     * container's job: the organism takes the finished blocks as props.
     */
    briefBlocks() {
      if (this.isPastDay || !this.contextTags.length) return [];
      const runs = this.contextRuns;
      const entries = this.contextTags.map((tag) => {
        const cached = getCachedDashboard(tag);
        // `pending: false` with nothing cached is dropped by buildBriefBlocks —
        // so a settled-with-nothing tag and a failed one both render no block.
        return cached ? { tag, ...cached } : { tag, pending: runs[tag] === 'pending' };
      });
      return buildBriefBlocks(entries, { isAdded: this.isStepAdded });
    },
    /**
     * The blocks that actually carry context. A pending block has a breadcrumb
     * and nothing else, so it must not make the two data-backed quick replies
     * offer to read something that is not there yet.
     */
    briefDataBlocks() {
      return this.briefBlocks.filter((block) => !block.pending);
    },
    briefMessage() {
      if (!this.briefBlocks.length) return null;
      return {
        id: `${LOCAL_PREFIX}brief`,
        from: 'routine',
        kind: 'brief',
        blocks: this.briefBlocks,
        subline: briefSubline(this.briefBlocks),
        open: !this.briefCollapsed[this.taskRef],
      };
    },

    displayMessages() {
      const stored = Array.isArray(this.chatMessages) ? this.chatMessages : [];
      return [
        ...(this.briefMessage ? [this.briefMessage] : []),
        ...(this.greeting ? [this.greeting] : []),
        ...stored,
        ...this.localMessages,
      ];
    },
    quickReplies() {
      const chips = [];
      if (this.openItems.length) chips.push('Break it down');
      if (this.briefDataBlocks.length) {
        chips.push('What did I do last time?');
        chips.push('Plan from next steps');
      }
      chips.push('How am I doing?');
      chips.push('Add a task');
      return chips;
    },
    /** What the model is told about the routine the user is looking at. */
    chatContext() {
      if (!this.routine) return null;
      return {
        routineName: this.routineName,
        routineTime: this.routine.time || '',
        routineEnd: this.endTime,
        routineStatus: this.statusLabel,
        stimulus: this.routine.stimulus || 'D',
        points: Math.round(this.routine.points || 0),
        ticked: !!this.routine.ticked,
        doneCount: this.doneCount,
        totalCount: this.goalItems.length,
        scoreD: Math.round(this.scores.D || 0),
        scoreK: Math.round(this.scores.K || 0),
        scoreG: Math.round(this.scores.G || 0),
        items: this.goalItems.map((item) => ({
          id: String(item.id),
          body: item.body,
          isComplete: !!item.isComplete,
        })),
      };
    },
  },
  watch: {
    // A new message must land in view. On the phone the thread shares the focus
    // card's scroller (the card handles it); in the tablet/desktop chat pane the
    // scroller is this container's own ancestor, so find it and pin it down.
    chatMessages(messages) {
      this.onMessagesLoaded(messages);
    },
    typing(active) {
      if (active) this.scrollIntoView();
    },
    // A brief quick-reply turn is client-only, so it belongs to the thread it
    // was asked in. Switching routine or day must not carry it across.
    taskRef() {
      this.localMessages = [];
    },
    date() {
      this.localMessages = [];
    },
    // A routine becoming the focused one is what buys its tags' context. The
    // ledger is NOT reset here: the point of keeping it is that focusing a
    // second routine with the same tag costs nothing.
    contextTags: {
      handler() {
        this.ensureBriefContext();
      },
      immediate: true,
    },
    // Coming back from a past day, where the brief deliberately does not render.
    isPastDay(past) {
      if (!past) this.ensureBriefContext();
    },
  },
  methods: {
    refetch() {
      if (this.$apollo.queries.chatMessages) {
        this.$apollo.queries.chatMessages.refetch();
      }
    },

    /**
     * Decide what a (re)load of `chatMessages` does to the scroller.
     *
     * A new message in the open thread lands in view. A thread switch (another
     * routine or day, or the first load) is not a new message: in the chat pane
     * it opens at the latest message, but in a scroller shared with the
     * checklist it opens at the top, where the checklist is. A cache-and-network
     * re-read of the same thread with nothing new does not move anything.
     */
    onMessagesLoaded(messages) {
      const key = `${this.date}|${this.taskRef}`;
      const count = (messages || []).length;
      const previous = this.loadedThread;
      const intended = this.userScrollIntent;
      this.loadedThread = { key, count };
      this.userScrollIntent = false;
      if (key !== previous.key) {
        this.scrollIntoView(this.sharedScroller ? 'top' : 'bottom');
      } else if (count > previous.count && (!this.sharedScroller || intended)) {
        // A new message only pulls a SHARED scroller down when the user was the
        // one talking. Ticking a task posts an event, and following that event
        // would scroll the checklist they are still working through off screen.
        this.scrollIntoView();
      }
    },

    scrollIntoView(edge = 'bottom') {
      this.$nextTick(() => setTimeout(() => {
        let node = this.$el && this.$el.parentElement;
        while (node) {
          if (node.scrollHeight > node.clientHeight + 1) {
            node.scrollTop = edge === 'top' ? 0 : node.scrollHeight;
            return;
          }
          node = node.parentElement;
        }
      }, 30));
    },

    /**
     * Log a system event into the thread. Called by the page the moment the
     * underlying mutation succeeds, so the thread is a real record of the day.
     */
    postEvent({
      text, tone = 'green', icon = null, items = [], taskRef = null,
    }) {
      const ref = taskRef || this.taskRef;
      if (!ref || !text) return Promise.resolve(null);
      return this.$apollo
        .mutate({
          mutation: POST_ROUTINE_CHAT_EVENT_MUTATION,
          variables: {
            date: this.date, taskRef: ref, text, tone, icon, items,
          },
        })
        .then(() => {
          // Only the visible thread needs re-reading; an event posted against
          // another routine is picked up when that routine is focused.
          if (ref === this.taskRef) this.refetch();
        })
        .catch((error) => {
          console.error('[RoutineChat] postEvent failed:', error);
        });
    },

    async send(text) {
      const body = String(text || '').trim();
      if (!body || !this.taskRef || this.sending) return;

      // The two brief quick replies are answered from the cache the card
      // already renders. Sending them to the model would spend a round trip
      // paraphrasing data that is on the client.
      if (this.answerFromBrief(body)) return;

      this.sending = true;
      this.typing = true;
      this.userScrollIntent = true;
      this.$emit('sent');

      try {
        const { data } = await this.$apollo.mutate({
          mutation: SEND_ROUTINE_CHAT_MUTATION,
          variables: {
            date: this.date,
            taskRef: this.taskRef,
            text: body,
            context: this.chatContext,
          },
        });

        const result = data && data.sendRoutineChat;
        this.refetch();
        if (!result) return;

        if (result.intent === 'add_tasks' && result.tasks && result.tasks.length) {
          const ids = await this.createItems(result.tasks);
          if (ids.length && result.replyMessage) {
            await this.attachItems(result.replyMessage.id, ids);
          }
        } else if (result.intent === 'complete_task' && result.completeItemId) {
          const item = this.goalItems.find((g) => String(g.id) === String(result.completeItemId));
          if (item) {
            this.$emit('complete-item', item);
            if (result.replyMessage) await this.attachItems(result.replyMessage.id, [item.id]);
          }
        }

        if (result.error) {
          this.$emit('model-error', result.error);
        }
      } catch (error) {
        console.error('[RoutineChat] send failed:', error);
        this.$notify({
          title: 'Chat unavailable',
          text: "Couldn't reach the routine chat. Check your connection and try again.",
          group: 'notify',
          type: 'error',
          duration: 4000,
        });
      } finally {
        this.typing = false;
        this.sending = false;
      }
    },

    // =====================================================================
    // "Before you start"
    // =====================================================================
    /**
     * Build the focused routine's missing area/project context, now.
     *
     * Three guards before a single network call: a past day renders no brief at
     * all, a signed-out user has no goals to summarise, and a tag already
     * asked for — by this thread, by the routine focused before it, or by the
     * daily sweep inside the TTL — is skipped. `ensureTagContext` guards the
     * rest: it joins an in-flight run rather than starting a second, and
     * refuses a tag it has already spent a run on this session.
     *
     * Nothing here awaits anything or touches the scroller: the pending block
     * appears on the next render, the body arrives when it arrives.
     */
    ensureBriefContext() {
      if (this.isPastDay || !this.contextTags.length) return;
      if (!this.$root.$data.email) return;

      this.contextTags.forEach((tag) => {
        if (this.contextRuns[tag] || isCacheValid(tag)) return;
        this.markContextRun(tag, 'pending');
        ensureTagContext(this, tag)
          .then(() => this.markContextRun(tag, 'settled'))
          // `ensureTagContext` resolves false rather than throwing, so this is
          // belt-and-braces. Either way the thread is left as it was: the
          // placeholder goes, no card, no error bubble.
          .catch(() => this.markContextRun(tag, 'settled'));
      });
    },

    markContextRun(tag, state) {
      if (this._isDestroyed) return;
      // Vue 2 cannot see a new key on a plain object; replace the map.
      this.contextRuns = { ...this.contextRuns, [tag]: state };
    },

    /**
     * Whether this exact step is already on today's checklist.
     *
     * Two sources, deliberately: the local record of what this session added,
     * and the checklist itself. The checklist is the authoritative one — it
     * survives a reload and also catches a step added through AI Search — while
     * the local record covers the gap before the goals query re-reads.
     */
    isStepAdded(text) {
      const value = String(text || '').trim();
      if (!value) return false;
      if (this.addedSteps[`${this.taskRef}|${value}`]) return true;
      return this.goalItems.some((item) => item
        && String(item.body || '').trim() === value);
    },

    rememberStep(text) {
      const value = String(text || '').trim();
      if (!value) return;
      // Vue 2 cannot see a new key on a plain object; replace the map.
      this.addedSteps = { ...this.addedSteps, [`${this.taskRef}|${value}`]: true };
    },

    toggleBrief() {
      this.briefCollapsed = {
        ...this.briefCollapsed,
        [this.taskRef]: !this.briefCollapsed[this.taskRef],
      };
    },

    /** The composer taking focus collapses the brief. Called by the page. */
    collapseBrief() {
      if (!this.taskRef || this.briefCollapsed[this.taskRef]) return;
      this.briefCollapsed = { ...this.briefCollapsed, [this.taskRef]: true };
    },

    /**
     * An Add pill. The step string is appended to the checklist **verbatim** —
     * it was generated as a task fragment precisely so it could be.
     */
    async addBriefStep(payload) {
      const text = payload && String(payload.text || '').trim();
      if (!text || this.isPastDay || this.isStepAdded(text)) return;

      // Flip the pill before the round trip, and keep it flipped: the guard
      // against adding twice is this record, not a disabled control.
      this.rememberStep(text);
      const ids = await this.createItems([text]);
      if (!ids.length) return;
      await this.postEvent({
        text: `Added “${text}” to the checklist`,
        tone: 'blue',
        icon: 'playlist_add_check',
        items: ids.map(String),
      });
    },

    /**
     * Answer a brief quick reply locally. Returns true when it handled the
     * message, so `send` knows not to call the model.
     */
    answerFromBrief(text) {
      const blocks = this.briefDataBlocks || [];
      const intent = blocks.length ? briefQuickReplyIntent(text) : null;
      if (!intent) return false;

      const reply = intent === 'recap'
        ? { text: buildRecapReply(blocks), proposals: [] }
        : buildPlanReply(blocks);

      const stamp = Date.now();
      this.localMessages = [
        ...this.localMessages,
        {
          id: `${LOCAL_PREFIX}q${stamp}`, from: 'me', kind: 'text', text, items: [], proposals: [],
        },
        {
          id: `${LOCAL_PREFIX}a${stamp}`,
          from: 'routine',
          kind: 'text',
          text: reply.text,
          items: [],
          proposals: reply.proposals,
          added: false,
        },
      ];
      this.$emit('sent');
      this.scrollIntoView();
      return true;
    },

    /** Mark a client-only proposal bubble accepted — there is no row to mutate. */
    markLocalAdded(messageId) {
      this.localMessages = this.localMessages.map((message) => (
        message.id === messageId ? { ...message, added: true } : message
      ));
    },

    /** Accept a break-down turn's three proposals as real checklist items. */
    async addProposals(message) {
      if (!message || !message.proposals || !message.proposals.length) return;
      const ids = await this.createItems(message.proposals);
      if (!ids.length) return;
      // Pressed inside a chat bubble, so following its confirmation keeps the
      // user where they already were. Adding a brief step does NOT set this: the
      // brief is pinned at the TOP of the thread, so jumping to the bottom would
      // be the same yank as ticking a task.
      this.userScrollIntent = true;
      if (isLocal(message.id)) {
        // "Plan from next steps" — its proposals ARE the brief's steps, so the
        // pills have to flip too or the same step could be added again.
        message.proposals.forEach((step) => this.rememberStep(step));
        this.markLocalAdded(message.id);
      } else {
        await this.attachItems(message.id, ids);
      }
      await this.postEvent({
        text: `${ids.length} task${ids.length === 1 ? '' : 's'} added to the checklist`,
        tone: 'blue',
        icon: 'playlist_add_check',
      });
    },

    /**
     * Create day goal items under the focused routine. `goalRef` copies the
     * routine's existing week-goal link so an item the chat creates rolls up
     * the same way one created through AI Search does.
     */
    async createItems(bodies) {
      const ids = [];
      const goalRef = this.inheritedGoalRef();
      // Sequential: addGoalItem's optimistic cache write reads the day goal it
      // just wrote to, so concurrent creates race each other's reads.
      for (let i = 0; i < bodies.length; i += 1) {
        const body = String(bodies[i] || '').trim();
        if (body) {
          try {
            // eslint-disable-next-line no-await-in-loop
            const created = await this.$goals.addGoalItem({
              body,
              period: 'day',
              date: this.date,
              taskRef: this.taskRef,
              goalRef: goalRef || undefined,
              isComplete: false,
              isMilestone: false,
            });
            if (created && created.id) ids.push(created.id);
          } catch (error) {
            console.error('[RoutineChat] createItems failed:', error);
          }
        }
      }
      if (ids.length) this.$emit('items-created', ids);
      return ids;
    },

    inheritedGoalRef() {
      const linked = this.goalItems.find((item) => item && item.goalRef);
      return linked ? linked.goalRef : '';
    },

    attachItems(messageId, items) {
      return this.$apollo
        .mutate({
          mutation: MARK_ROUTINE_CHAT_ADDED_MUTATION,
          variables: { id: messageId, items: items.map(String) },
        })
        .then(() => this.refetch())
        .catch((error) => {
          console.error('[RoutineChat] attachItems failed:', error);
        });
    },
  },
};
</script>

<style>
.routine-chat-container {
  min-width: 0;
}
</style>
