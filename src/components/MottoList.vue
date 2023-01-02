<template>
  <v-layout row wrap>
    <v-flex xs12>
      <v-card class="pt-3">
        <v-list subheader>
          <v-spacer></v-spacer>
          <v-subheader
            class="subheading"
            v-if="motto && motto.length == 0"
          >
            You have 0 Life Motto. Add some.
          </v-subheader>
          <v-list-tile
            v-for="(mott, i) in motto"
            :key="mott.id"
          >
            <v-list-tile-content>
              <v-list-tile-title v-text="mott.mottoItem"></v-list-tile-title>
            </v-list-tile-content>
            <v-list-tile-action>
              <v-btn
                flat
                icon
                @click="deleteMottoItem(i)"
              >
                <v-icon>delete</v-icon>
              </v-btn>
            </v-list-tile-action>
          </v-list-tile>
        </v-list>
      </v-card>
    </v-flex>
    <v-flex xs12 d-flex>
      <div class="pl-3 pr-3 formMotto mt-3 mb-2">
        <v-text-field
          clearable
          v-model="newMottoItem.mottoItem"
          id="newMottoItemmottoItem"
          name="newMottoItemmottoItem"
          label="Type your Motto"
          class="inputMotto"
          @keyup.enter="addMottoItem"
        >
        </v-text-field>
        <v-btn
          icon
          color="success"
          fab
          class="ml-3 mr-0"
          :loading="buttonLoading"
          @click="addMottoItem(newMottoItem)"
        >
          <v-icon dark>send</v-icon>
        </v-btn>
      </div>
    </v-flex>
  </v-layout>
</template>
<script>
import gql from 'graphql-tag';

export default {
  props: [],
  apollo: {
    motto: {
      query: gql`
        query motto{
          motto {
            id
            mottoItem
          }
        }
      `,
      update(data) {
        this.loading = false;
        return data.motto !== null
          ? data.motto
          : [];
      },
      error() {
        this.loading = false;
      },
    },
  },
  data() {
    return {
      show: true,
      buttonLoading: false,
      newMottoItem: {
        mottoItem: '',
      },
      defaultMottoItem: {
        mottoItem: '',
      },
    };
  },
  methods: {
    addMottoItem() {
      const value = this.newMottoItem.mottoItem && this.newMottoItem.mottoItem.trim();

      if (!value) {
        return;
      }

      this.buttonLoading = true;

      this.$apollo.mutate({
        mutation: gql`
          mutation addMottoItem(
            $mottoItem: String!
          ) {
            addMottoItem(
              mottoItem: $mottoItem
            ) {
              id
              mottoItem
            }
          }
        `,
        variables: {
          mottoItem: this.newMottoItem.mottoItem,
        },
        update: (scope, { data: { addMottoItem } }) => {
          this.motto.push({
            id: addMottoItem.id,
            mottoItem: this.newMottoItem.mottoItem,
          });
          this.newMottoItem = { ...this.defaultMottoItem };
          this.buttonLoading = false;
        },
      }).catch(() => {
        this.$notify({
          title: 'Error',
          text: 'An unexpected error occured',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      });
    },
    deleteMottoItem(index) {
      const { id } = this.motto[index];
      this.motto.splice(index, 1);

      this.$apollo.mutate({
        mutation: gql`
          mutation deleteMottoItem(
            $id: ID!
          ) {
            deleteMottoItem(
              id: $id
            ) {
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
          text: 'An unexpected error occured',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      });
    },
  },
};
</script>

<style lang="stylus" scoped>
  .completed {
    text-decoration: line-through;
  }

  .formMotto {
    display: flex;
    grid-column: 2;
    width: 100%;
  }

  .inputMotto {
    display:inline-block;
    flex-shrink: 0;
    flex-grow: 1;
  }
</style>
