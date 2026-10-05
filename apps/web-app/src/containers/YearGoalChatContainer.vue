<template>
  <routine-chat-thread
    :messages="displayMessages"
    :goal-items="threadItems"
    heading="CHAT WITH THIS GOAL"
    replace-added-proposals
    :typing="typing"
    :quick-replies="quickReplies"
    @quick-reply="onQuickReply"
    @add-proposals="onAddProposals"
    @toggle-item="$emit('toggle-item', $event)"
  />
</template>

<script>
/**
 * The year goal's conversation.
 *
 * It mounts the SAME organism Home mounts — `RoutineChatThread` — because the
 * thread has two hosts and only one implementation
 * (docs/redesign/chassis.md § "Chat has two hosts"). The only change the organism
 * needed to serve a year goal was a `heading` prop and a per-message
 * `addAllLabel`, both host-agnostic. What differs is entirely in here: the thread
 * key, the context handed to the model, and what a proposal becomes when
 * accepted (a WEEK goal under the focused month, not a day task).
 *
 * THE THREAD KEY, AND WHY ONE THREAD PER GOAL SURVIVES A SWITCH
 * ------------------------------------------------------------
 * `routineChat` is keyed `(email, date, taskRef)` server-side and there is no
 * goal-scoped chat query. `taskRef` is a plain String with no foreign key to
 * `RoutineItem`, so this host uses:
 *
 *     taskRef = the year goal item's id
 *     date    = the year goal's OWN date (31-12-YYYY), never today
 *
 * A year goal is not a property of a day, so pinning the thread to its own date
 * is what keeps it whole; keying on today would shard one conversation across 365
 * threads. Because the variables change with the goal, Apollo holds a separate
 * normalized result per goal and switching back restores the thread untouched.
 *
 * WHAT IS MISSING SERVER-SIDE (wired to what exists, not faked)
 * -------------------------------------------------------------
 * `chatApi.js`'s `SYSTEM_PROMPT` is a module constant that introduces the model
 * as "the voice of a single routine", and `describeContext` renders only
 * routine-shaped lines. There is no parameter to override either. So the model
 * answering here is the real model — no canned regex — but it is still wearing
 * the routine persona, and `ChatContextInput` has no field for a period, a
 * milestone tally or a threshold. The mapping below uses the fields that exist
 * and says what they mean, and the report lists the exact server change needed
 * (`context.kind`, goal fields on `ChatContextInput`, and `tasks` carrying a
 * period) to make the persona and the `break_down` shape right.
 */
import RoutineChatThread from '@routine-notes/ui/organisms/RoutineChatThread/RoutineChatThread.vue';
import {
  ROUTINE_CHAT_QUERY,
  SEND_ROUTINE_CHAT_MUTATION,
  POST_ROUTINE_CHAT_EVENT_MUTATION,
  MARK_ROUTINE_CHAT_ADDED_MUTATION,
} from '../composables/graphql/chatQueries';
import { TH, yearPercent } from '../utils/yearGoalModel';

/** Chips that open a sheet instead of going to the model. */
export const SHEET_CHIPS = {
  'Add a week goal': 'week',
  'Set month goal': 'month',
};

export default {
  name: 'YearGoalChatContainer',

  components: { RoutineChatThread },

  props: {
    /** `yearGoalModel.buildYearGoal()` output — the thread's host. */
    goal: { type: Object, default: null },
    /** The focused month, so the conversation is about what is on screen. */
    month: { type: Object, default: null },
  },

  data() {
    return {
      chatMessages: [], typing: false, sending: false, adding: {},
    };
  },

  apollo: {
    chatMessages: {
      query: ROUTINE_CHAT_QUERY,
      fetchPolicy: 'cache-and-network',
      variables() {
        return { date: this.threadDate, taskRef: this.threadRef };
      },
      skip() {
        return !this.$root.$data.email || !this.threadRef || !this.threadDate;
      },
      update(data) {
        return data.routineChat || [];
      },
      error(error) {
        console.error('[YearGoalChat] query error:', error);
      },
    },
  },

  computed: {
    threadRef() {
      return (this.goal && this.goal.id) || '';
    },
    threadDate() {
      return (this.goal && this.goal.date) || '';
    },
    monthName() {
      return (this.month && this.month.name) || 'this month';
    },
    /**
     * The focused month's week goals, so a reply that names one can render it as
     * a live checkbox row inside its bubble.
     */
    weekGoals() {
      if (!this.month) return [];
      return this.month.weeks.map((week) => ({
        id: week.id,
        body: week.body,
        isComplete: week.isComplete,
      }));
    },
    /**
     * Every week goal under this year goal, for resolving the ids a bubble
     * carries. Not just the focused month's: a reply that planned November's
     * weeks has to keep its checkboxes when the user is looking at October,
     * otherwise the bubble falls back to its proposal list after a reload.
     */
    threadItems() {
      const months = (this.goal && Array.isArray(this.goal.months)) ? this.goal.months : [];
      const all = [];
      months.forEach((month) => (month.weeks || []).forEach((week) => {
        all.push({ id: week.id, body: week.body, isComplete: week.isComplete });
      }));
      return all.length ? all : this.weekGoals;
    },
    /**
     * Synthesised, never stored: it restates live counts, so persisting it would
     * mean showing last month's numbers for the rest of the year.
     */
    greeting() {
      if (!this.goal) return null;
      const { month } = this;
      const where = month && month.goal
        ? `${month.name} (“${month.goal.body}”) has ${month.weeksDone} of ${TH.month} weeks.`
        : `${month ? month.name : 'This month'} has no goal yet.`;
      return {
        id: 'greeting',
        from: 'goal',
        kind: 'text',
        text: `${this.goal.monthsDone} of ${TH.year} months done. ${where} What should we plan?`,
        items: [],
        proposals: [],
      };
    },
    displayMessages() {
      const stored = Array.isArray(this.chatMessages) ? this.chatMessages : [];
      return [
        ...(this.greeting ? [this.greeting] : []),
        // A stored proposal bubble names what accepting it will create. The label
        // travels on the message so the shared thread stays host-agnostic.
        ...stored.map((message) => (message.proposals && message.proposals.length
          ? { ...message, addAllLabel: `Add ${message.proposals.length} week goals` }
          : message)),
      ];
    },
    quickReplies() {
      if (this.month && this.month.goal) {
        return ['Plan the weeks', 'How am I doing?', 'Add a week goal'];
      }
      return ['How am I doing?', 'Set month goal'];
    },
    /**
     * What the model is told. `ChatContextInput` has no goal shape, so the
     * routine-named fields are reused for what they are nearest to and the rest
     * are left unset rather than filled with plausible nonsense:
     *   routineName   → the year goal's title (the thread's subject)
     *   routineStatus → the period and the tally, in words
     *   doneCount / totalCount → months done out of the threshold
     *   items         → the focused month's week goals
     * `routineTime`, `routineEnd`, `stimulus`, `points` and `ticked` do not apply
     * to a year goal and are omitted.
     */
    chatContext() {
      if (!this.goal) return null;
      const { month } = this;
      const where = month && month.goal
        ? `${month.name}: “${month.goal.body}” · ${month.weeksDone} of ${TH.month} weeks done`
        : `${month ? month.name : 'this month'}: no month goal yet`;
      return {
        routineName: this.goal.body,
        routineStatus: `Year goal ${this.goal.monthsDone}/${TH.year} months`
          + ` (${yearPercent(this.goal.monthsDone)}%) · ${where}`,
        doneCount: this.goal.monthsDone,
        totalCount: TH.year,
        items: this.weekGoals.map((week) => ({
          id: String(week.id),
          body: week.body,
          isComplete: !!week.isComplete,
        })),
      };
    },
  },

  watch: {
    chatMessages() {
      this.scrollIntoView();
    },
    typing(active) {
      if (active) this.scrollIntoView();
    },
  },

  methods: {
    refetch() {
      if (this.$apollo.queries.chatMessages) {
        this.$apollo.queries.chatMessages.refetch().catch(() => {});
      }
    },

    scrollIntoView() {
      this.$nextTick(() => setTimeout(() => {
        let node = this.$el && this.$el.parentElement;
        while (node) {
          if (node.scrollHeight > node.clientHeight + 1) {
            node.scrollTop = node.scrollHeight;
            return;
          }
          node = node.parentElement;
        }
      }, 30));
    },

    /**
     * Log a system event into this goal's thread. The page calls it the moment a
     * tick's mutations land, once per threshold crossed, so the thread is a real
     * record of the cascade rather than a retelling of it.
     */
    postEvent({
      text, tone = 'green', icon = null, items = [],
    }) {
      if (!this.threadRef || !this.threadDate || !text) return Promise.resolve(null);
      return this.$apollo
        .mutate({
          mutation: POST_ROUTINE_CHAT_EVENT_MUTATION,
          variables: {
            date: this.threadDate, taskRef: this.threadRef, text, tone, icon, items,
          },
        })
        .then(() => this.refetch())
        .catch((error) => {
          console.error('[YearGoalChat] postEvent failed:', error);
        });
    },

    onQuickReply(chip) {
      const kind = SHEET_CHIPS[chip];
      // "Add a week goal" / "Set month goal" are not questions — they are the
      // create sheet, with the parent already locked. Sending them to a language
      // model to be paraphrased into a suggestion would be a worse answer.
      if (kind) {
        this.$emit('open-create', kind);
        return;
      }
      this.send(chip);
    },

    async send(text) {
      const body = String(text || '').trim();
      if (!body || !this.threadRef || this.sending) return;

      this.sending = true;
      this.typing = true;
      this.$emit('sent');

      try {
        const { data } = await this.$apollo.mutate({
          mutation: SEND_ROUTINE_CHAT_MUTATION,
          variables: {
            date: this.threadDate,
            taskRef: this.threadRef,
            text: body,
            context: this.chatContext,
          },
        });

        const result = data && data.sendRoutineChat;
        this.refetch();
        if (!result) return;

        // Same split as Home's routine chat. A `break_down` reply ("Plan the
        // weeks") is PROPOSALS ONLY: the server stores them on the reply and the
        // thread renders them with "Add N week goals" — nothing is created until
        // that is tapped (`onAddProposals`). An `add_tasks` reply is the user
        // explicitly asking to add, and the model's reply already says it was
        // added, so those are created now. Either way they are WEEK goals and
        // only the page knows which dates the focused month has left, so the
        // bodies are handed up, not created here.
        if (result.intent === 'add_tasks' && result.tasks && result.tasks.length) {
          const ids = await this.emitCreate(result.tasks);
          if (ids.length && result.replyMessage) {
            await this.attachItems(result.replyMessage.id, ids);
          }
        } else if (result.intent === 'complete_task' && result.completeItemId) {
          const week = this.month
            && this.month.weeks.find((w) => String(w.id) === String(result.completeItemId));
          if (week) {
            this.$emit('complete-week', week);
            if (result.replyMessage) await this.attachItems(result.replyMessage.id, [week.id]);
          }
        }

        if (result.error) this.$emit('model-error', result.error);
      } catch (error) {
        console.error('[YearGoalChat] send failed:', error);
        this.$notify({
          title: 'Chat unavailable',
          text: "Couldn't reach the goal chat. Check your connection and try again.",
          group: 'notify',
          type: 'error',
          duration: 4000,
        });
      } finally {
        this.typing = false;
        this.sending = false;
      }
    },

    /**
     * Ask the page to create these week goals and resolve with the ids it made.
     *
     * The page owns it because numbering consecutive weeks needs the focused
     * month's existing weeks, and because creating is a write container's job.
     * A page with no listener resolves empty immediately rather than hanging the
     * send behind a callback that will never arrive.
     */
    emitCreate(bodies) {
      if (!this.$listeners['create-weeks']) return Promise.resolve([]);
      return new Promise((resolve) => {
        this.$emit('create-weeks', {
          bodies,
          done: (ids) => resolve(Array.isArray(ids) ? ids : []),
        });
      });
    },

    /**
     * "Add N week goals". The page drops any week that no longer fits the month
     * (and says "{Month} is fully planned"), so only what was really made is
     * attached; attaching flips the message to `added` and the thread then shows
     * those weeks as checkboxes in place of the proposal list. A month with no
     * room makes nothing, so the button stays for a later try.
     */
    async onAddProposals(message) {
      if (!message || message.added || !message.proposals || !message.proposals.length) return;
      // A second tap while the first is still creating would file the weeks twice.
      if (this.adding[message.id]) return;
      this.adding = { ...this.adding, [message.id]: true };
      let ids = [];
      try {
        ids = await this.emitCreate(message.proposals);
        if (ids.length) await this.attachItems(message.id, ids);
      } finally {
        const { [message.id]: omit, ...rest } = this.adding;
        this.adding = rest;
      }
      if (!ids.length) return;
      await this.postEvent({
        text: `${ids.length} week goal${ids.length === 1 ? '' : 's'} added to ${this.monthName}`,
        tone: 'blue',
        icon: 'playlist_add_check',
      });
    },

    attachItems(messageId, items) {
      return this.$apollo
        .mutate({
          mutation: MARK_ROUTINE_CHAT_ADDED_MUTATION,
          variables: { id: messageId, items: items.map(String) },
        })
        .then(() => this.refetch())
        .catch((error) => {
          console.error('[YearGoalChat] attachItems failed:', error);
        });
    },
  },
};
</script>
