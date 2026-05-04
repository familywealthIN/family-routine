<template>
  <PendingList
    :pending="pending"
    :loading="loading"
    :buttonLoading="buttonLoading"
    @add-pending-item="addPendingItem"
    @delete-pending-item="deletePendingItem"
    @goal-entry-added="handleGoalEntryAdded"
  />
</template>

<script>
import gql from 'graphql-tag';
import PendingList from '@family-routine/ui/organisms/PendingList/PendingList.vue';

export default {
  name: 'PendingListContainer',
  components: {
    PendingList,
  },
  data() {
    return {
      pending: [],
      loading: true,
      buttonLoading: false,
    };
  },
  apollo: {
    pending: {
      query: gql`
        query motto {
          motto {
            id
            mottoItem
          }
        }
      `,
      skip() {
        return !this.$root.$data.email;
      },
      update(data) {
        this.loading = false;
        return data.motto !== null ? data.motto : [];
      },
      error() {
        this.loading = false;
      },
    },
  },
  watch: {
    '$root.$data.email': function watchUserEmail(newEmail, oldEmail) {
      if ((!oldEmail && newEmail) || (oldEmail && newEmail && oldEmail !== newEmail)) {
        this.refreshApolloQueries();
      }
    },
  },
  methods: {
    refreshApolloQueries() {
      try {
        if (this.$apollo.queries.pending) {
          this.$apollo.queries.pending.refetch();
        }
      } catch (error) {
        console.warn('PendingListContainer: Error refreshing Apollo queries:', error);
      }
    },
    addPendingItem(mottoItem) {
      if (!mottoItem || !mottoItem.trim()) {
        return;
      }

      this.buttonLoading = true;

      this.$apollo.mutate({
        mutation: gql`
          mutation addMottoItem($mottoItem: String!) {
            addMottoItem(mottoItem: $mottoItem) {
              id
              mottoItem
            }
          }
        `,
        variables: {
          mottoItem,
        },
        update: (scope, { data: { addMottoItem } }) => {
          this.pending.push({
            id: addMottoItem.id,
            mottoItem,
          });
          this.buttonLoading = false;
        },
      }).catch(() => {
        this.buttonLoading = false;
        this.$notify({
          title: 'Error',
          text: 'An unexpected error occurred',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      });
    },
    deletePendingItem(index) {
      const { id } = this.pending[index];
      this.pending.splice(index, 1);

      this.$apollo.mutate({
        mutation: gql`
          mutation deleteMottoItem($id: ID!) {
            deleteMottoItem(id: $id) {
              id
            }
          }
        `,
        variables: {
          id,
        },
      }).catch(() => {
        this.$notify({
          title: 'Error',
          text: 'An unexpected error occurred',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      });
    },
    handleGoalEntryAdded(index) {
      this.deletePendingItem(index);
    },
  },
};
</script>
