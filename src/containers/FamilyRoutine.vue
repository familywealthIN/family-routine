<script>
/* eslint-disable max-len */
</script>
<template>
  <container-box
    :isLoading="$apollo.queries.userItems.loading
      || $apollo.queries.userDetails.loading" >
    <v-card
      dark
      flat
      class="image-card"
    >
      <v-btn
        absolute
        bottom
        color="info"
        right
        fab
        :disabled="userItems && userItems.length > 10"
        @click="sendInviteDialog = true"
      >
        <v-icon>add</v-icon>
      </v-btn>
      <v-img
        src="https://cdn.vuetifyjs.com/images/cards/forest.jpg"
        gradient="to top, rgba(0,0,0,.44), rgba(0,0,0,.44)"
      >
        <v-container fill-height>
          <v-layout align-center>
            <strong class="display-4 font-weight-regular mr-4">{{(userItems && userItems.length) || 0}}</strong>
            <v-layout column justify-end>
              <div class="headline font-weight-light">Members</div>
            </v-layout>
          </v-layout>
        </v-container>
      </v-img>
    </v-card>
    <v-card-text class="image-card-page py-0 px-0">
      <v-dialog v-model="sendInviteDialog" persistent max-width="600px">
        <v-card>
          <v-card-title>
            <span class="headline">Invite User</span>
          </v-card-title>
          <v-card-text>
            <v-container grid-list-md>
              <v-layout wrap>
                <v-flex xs12>
                  <v-form
                    ref="sendInviteForm"
                    v-model="valid"
                    lazy-validation
                  >
                    <v-text-field
                      label="Email"
                      v-model="invitedEmail"
                      :rules="emailRules"
                      required>
                    </v-text-field>
                  </v-form>
                </v-flex>
              </v-layout>
            </v-container>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue darken-1" flat @click="sendInviteDialog = false">Close</v-btn>
            <v-btn
              color="primary"
              :loading="buttonLoading"
              :disabled="buttonLoading"
              @click="sendInviteSubmit">
              Invite
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-list v-if="userItems && userItems.length" three-line>
        <v-subheader>Members</v-subheader>
        <template v-for="(userItem, index) in userItems">

          <v-divider :key="userItem.id" v-if="index !== 0"></v-divider>

          <v-list-tile
            :key="userItem.id"
            avatar
            @click="groupDetailsClick(userItem.email)"
          >
            <v-list-tile-avatar>
              <img v-bind:src="userItem.picture || './img/default-user.png'">
            </v-list-tile-avatar>

            <v-list-tile-content>
              <v-list-tile-title v-html="userItem.name"></v-list-tile-title>
              <v-list-tile-sub-title>
                <span class="pt-2"
                  style="display: flex;align-items: center;justify-content: center;"
                >
                  <template
                    v-for="(score, index)
                    in getGroupUserSevenDayScore(userItem.email)"
                  >
                    <v-avatar :key="String(userItem.email) + String(score.date)" size="24" :color="getButtonColor(score.count)">
                      <v-icon color="white" size="16">{{getButtonIcon(score.count)}}</v-icon>
                    </v-avatar>
                    <v-divider :key="String(userItem.email) + String(score.date)" v-if="index !== 6"></v-divider>
                  </template>
                </span>
              </v-list-tile-sub-title>
            </v-list-tile-content>
          </v-list-tile>
        </template>
      </v-list>
      <p v-else class="pt-3 pb-3 text-xs-center">
        No Family Members have been added.
      </p>
      <v-btn
        v-if="groupId"
        color="primary"
        flat
        text
        @click="leaveGroup"
      >
        Leave Group
      </v-btn>
    </v-card-text>
    <v-dialog
      v-model="userInviteDialog"
      max-width="290"
    >
      <v-card>
        <v-card-title class="headline">Join Group</v-card-title>

        <v-card-text>
          User {{inviterEmail}} has invited you to join their group.
          Do you want to join?
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>

          <v-btn
            color="primary"
            flat
            text
            @click="declineInviteSubmit"
          >
            Decline
          </v-btn>

          <v-btn
            color="primary"
            text
            :loading="buttonLoading"
            :disabled="buttonLoading"
            @click="acceptInviteSubmit"
          >
            Accept
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
      v-model="groupDetailsDialog"
      fullscreen
      hide-overlay
      transition="dialog-bottom-transition"
    >
      <v-card>
        <v-toolbar dark color="primary">
          <v-btn icon dark @click="groupDetailsDialog = false">
            <v-icon>close</v-icon>
          </v-btn>
          <v-toolbar-title>{{ settingsName || 'Settings'}}</v-toolbar-title>
          <v-spacer></v-spacer>
        </v-toolbar>
        <family-user-history :routines="groupDetail" />
      </v-card>
    </v-dialog>
  </container-box>
</template>

<script>
import gql from 'graphql-tag';

import redirectOnError from '../utils/redirectOnError';

import FamilyUserHistory from '../components/FamilyUserHistory.vue';
import ContainerBox from '../components/ContainerBox.vue';

export default {
  components: {
    FamilyUserHistory,
    ContainerBox,
  },
  apollo: {
    userItems: {
      query: gql`
        query getUsersByGroupId($groupId: String!) {
          getUsersByGroupId(groupId: $groupId) {
            name
            email
            picture
          }
        }
      `,
      variables() {
        return {
          groupId: this.groupId,
        };
      },
      update({ getUsersByGroupId }) {
        this.groupDetails = [];
        if(Array.isArray(getUsersByGroupId)) {
          getUsersByGroupId.forEach((userItem) => this.getGroupDetails(userItem.email));
        }
        return getUsersByGroupId || [];
      },
      skip() {
        return this.skipQuery;
      },
      error(error) {
        redirectOnError(this.$router, error);
      },
    },
    userDetails: {
      query: gql`
        query showInvite {
          showInvite {
            name
            picture
            groupId
            inviterEmail
          }
        }
      `,
      update({ showInvite }) {
        if (showInvite && showInvite.groupId) {
          this.triggerUserItems(showInvite.groupId);
        }
        if (showInvite && showInvite.inviterEmail) {
          this.showUserInviteDialog(showInvite.inviterEmail);
        }
      },
      error(error) {
        redirectOnError(this.$router, error);
      },
    },
  },
  data: () => ({
    valid: true,
    skipQuery: true,
    sendInviteDialog: false,
    groupDetailsDialog: false,
    userInviteDialog: false,
    buttonLoading: false,
    invitedEmail: '',
    inviterEmail: '',
    settingsName: '',
    groupId: '',
    emailRules: [
      (v) => !!v || 'E-mail is required',
      (v) => /.+@.+/.test(v) || 'E-mail must be valid',
    ],
    groupDetail: [],
    groupDetails: [],
  }),
  methods: {
    triggerUserItems(groupId) {
      this.groupId = groupId;
      this.$apollo.queries.userItems.skip = false;
      this.$apollo.queries.userItems.refetch();
    },
    showUserInviteDialog(inviterEmail) {
      this.inviterEmail = inviterEmail;
      this.userInviteDialog = true;
    },
    groupDetailsClick(email) {
      this.settingsName = this.getNameByEmail(email);
      this.groupDetail = this.groupDetails.find((userDetail) => userDetail[0].email === email);
      this.groupDetailsDialog = true;
    },
    getNameByEmail(email) {
      const currentUserItem = this.userItems.find((userItem) => userItem.email === email);
      return currentUserItem.name;
    },
    sendInviteSubmit() {
      if (this.$refs.sendInviteForm.validate()) {
        this.buttonLoading = true;
        this.sendInvite();
      }
    },
    acceptInviteSubmit() {
      this.buttonLoading = true;
      this.acceptInvite();
    },
    declineInviteSubmit() {
      this.declineInvite();
      this.userInviteDialog = false;
    },
    sendInvite() {
      this.$apollo.mutate({
        mutation: gql`
          mutation sendInvite(
            $invitedEmail: String!
          ) {
            sendInvite(
              invitedEmail: $invitedEmail
            ) {
              email
            }
          }
        `,
        variables: {
          invitedEmail: this.invitedEmail,
        },
        update: () => {
          this.buttonLoading = false;
          this.sendInviteDialog = false;
          this.$notify({
            title: 'Success',
            text: `Invitation sent to ${this.invitedEmail}`,
            group: 'notify',
            duration: 3000,
          });
          this.invitedEmail = '';
        },
      }).catch((error) => {
        this.buttonLoading = false;
        redirectOnError(this.$router, error);
        this.$notify({
          title: 'Error',
          text: 'Unable to find the User',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      });
    },
    acceptInvite() {
      this.$apollo.mutate({
        mutation: gql`
          mutation acceptInvite(
            $inviterEmail: String!
          ) {
            acceptInvite(
              inviterEmail: $inviterEmail
            ) {
              email
              groupId
            }
          }
        `,
        variables: {
          inviterEmail: this.inviterEmail,
        },
        update: (store, { data: { acceptInvite } }) => {
          this.buttonLoading = false;
          this.userInviteDialog = false;
          this.$notify({
            title: 'Success',
            text: 'You joined your family group',
            group: 'notify',
            duration: 3000,
          });
          this.inviterEmail = '';
          this.triggerUserItems(acceptInvite.groupId);
        },
      }).catch((error) => {
        this.buttonLoading = false;
        redirectOnError(this.$router, error);
        this.$notify({
          title: 'Error',
          text: 'Unable to Join the Group',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      });
    },
    declineInvite() {
      return this.$apollo.mutate({
        mutation: gql`
          mutation declineInvite {
            declineInvite {
              email
              groupId
            }
          }
        `,
        update: () => {
          this.inviterEmail = '';
        },
      }).catch((error) => {
        redirectOnError(this.$router, error);
      });
    },
    leaveGroup() {
      if (confirm('Do you want to leave the Group?')) {
        return this.$apollo.mutate({
          mutation: gql`
            mutation leaveGroup {
              leaveGroup {
                email
                groupId
              }
            }
          `,
          update: () => {
            this.inviterEmail = '';
            this.groupId = '';
            this.userItems = [];
          },
        }).catch((error) => {
          redirectOnError(this.$router, error);
        });
      }
    },
    getGroupDetails(email) {
      this.$apollo.addSmartQuery('groupDetail', {
        query: gql`
        query routinesByGroupEmail($groupId: String!, $email: String!) {
          routinesByGroupEmail(groupId: $groupId, email: $email) {
            id
            date
            email
            tasklist {
              id
              name
              time
              points
              ticked
              passed
              wait
            }
          }
        }
      `,
        variables() {
          return {
            groupId: this.groupId,
            email,
          };
        },
        update({ routinesByGroupEmail }) {
          this.groupDetails.push(routinesByGroupEmail);
          return routinesByGroupEmail;
        },
        error(error) {
          redirectOnError(this.$router, error);
        },
      });
    },
    getButtonIcon(score) {
      if (score >= 70) {
        return 'check';
      } if (score > 33 && score < 70) {
        return 'warning';
      } if (score <= 33) {
        return 'close';
      }
      return 'check';
    },
    getButtonColor(score) {
      if (score >= 70) {
        return 'success';
      } if (score > 33 && score < 70) {
        return 'warning';
      } if (score <= 33) {
        return 'error';
      }
      return 'success';
    },
    getGroupUserSevenDayScore(email) {
      const scores = [];
      // eslint-disable-next-line max-len
      const currentGroupUserDays = this.groupDetails.find((userDetail) => userDetail[0] && userDetail[0].email === email);

      if(Array.isArray(currentGroupUserDays)) {
        currentGroupUserDays.forEach((currentGroupUserDay) => {
          scores.push({
            date: currentGroupUserDay.date,
            count: this.countTotal(currentGroupUserDay.tasklist)
          });
        });
      }

      return scores;
    },
    countTotal(tasklist) {
      return tasklist.reduce((total, num) => {
        if (num.ticked) {
          return total + num.points;
        }
        return total;
      }, 0);
    },
  },
};
</script>

<style>
  .custom-loader {
    animation: loader 1s infinite;
    display: flex;
  }
  @-moz-keyframes loader {
    from {
      transform: rotate(0);
    }
    to {
      transform: rotate(360deg);
    }
  }
  @-webkit-keyframes loader {
    from {
      transform: rotate(0);
    }
    to {
      transform: rotate(360deg);
    }
  }
  @-o-keyframes loader {
    from {
      transform: rotate(0);
    }
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes loader {
    from {
      transform: rotate(0);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
