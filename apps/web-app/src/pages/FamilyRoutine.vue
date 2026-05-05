<script>
/* eslint-disable max-len */
</script>
<template>
  <container-box
    :isLoading="$apollo.queries.userItems.loading
      || $apollo.queries.userDetails.loading" >
    <atom-card
      dark
      flat
      class="image-card"
    >
      <atom-button
        absolute
        bottom
        color="info"
        right
        fab
        :disabled="userItems && userItems.length > 10"
        @click="sendInviteDialog = true"
      >
        <atom-icon>add</atom-icon>
      </atom-button>
      <atom-img
        src="https://cdn.vuetifyjs.com/images/cards/forest.jpg"
        gradient="to top, rgba(0,0,0,.44), rgba(0,0,0,.44)"
        class="image-card-img"
      >
        <atom-container fill-height>
          <atom-layout align-center>
            <strong class="display-4 font-weight-regular mr-4">{{(userItems && userItems.length) || 0}}</strong>
            <atom-layout column justify-end>
              <div class="headline font-weight-light">Members</div>
            </atom-layout>
          </atom-layout>
        </atom-container>
      </atom-img>
    </atom-card>
    <atom-card-text class="image-card-page py-0 px-0">
      <atom-dialog v-model="sendInviteDialog" persistent max-width="600px">
        <atom-card>
          <atom-card-title>
            <span class="headline">Invite User</span>
          </atom-card-title>
          <atom-card-text>
            <atom-container grid-list-md>
              <atom-layout wrap>
                <atom-flex xs12>
                  <atom-form
                    ref="sendInviteForm"
                    v-model="valid"
                    lazy-validation
                  >
                    <atom-text-field
                      label="Email"
                      v-model="invitedEmail"
                      :rules="emailRules"
                      required>
                    </atom-text-field>
                  </atom-form>
                </atom-flex>
              </atom-layout>
            </atom-container>
          </atom-card-text>
          <atom-card-actions>
            <atom-spacer></atom-spacer>
            <atom-button color="blue darken-1" flat @click="sendInviteDialog = false">Close</atom-button>
            <atom-button
              color="primary"
              :loading="buttonLoading"
              @click="sendInviteSubmit">
              Invite
            </atom-button>
          </atom-card-actions>
        </atom-card>
      </atom-dialog>
      <atom-list v-if="userItems && userItems.length" three-line>
        <atom-subheader>Members</atom-subheader>
        <template v-for="(userItem, index) in userItems">

          <atom-divider :key="userItem.id" v-if="index !== 0"></atom-divider>

          <atom-list-tile
            :key="userItem.id"
            avatar
            @click="groupDetailsClick(userItem.email)"
          >
            <atom-list-tile-avatar>
              <img v-bind:src="userItem.picture || './img/default-user.png'">
            </atom-list-tile-avatar>

            <atom-list-tile-content>
              <atom-list-tile-title v-html="userItem.name"></atom-list-tile-title>
              <atom-list-tile-sub-title>
                <span class="pt-2"
                  style="display: flex;align-items: center;justify-content: center;"
                >
                  <template
                    v-for="(score, index)
                    in getGroupUserSevenDayScore(userItem.email)"
                  >
                    <atom-avatar :key="String(userItem.email) + String(score.date)" size="24" :color="getButtonColor(score.count)">
                      <atom-icon color="white" size="16">{{getButtonIcon(score.count)}}</atom-icon>
                    </atom-avatar>
                    <atom-divider :key="String(userItem.email) + String(score.date)" v-if="index !== 6"></atom-divider>
                  </template>
                </span>
              </atom-list-tile-sub-title>
            </atom-list-tile-content>
          </atom-list-tile>
        </template>
      </atom-list>
      <p v-else class="pt-3 pb-3 text-xs-center">
        No Group Members have been added.
      </p>
      <atom-button
        v-if="groupId"
        color="primary"
        flat
        text
        @click="leaveGroup"
      >
        Leave Group
      </atom-button>
    </atom-card-text>
    <atom-dialog
      v-model="userInviteDialog"
      max-width="290"
    >
      <atom-card>
        <atom-card-title class="headline">Join Group</atom-card-title>

        <atom-card-text>
          User {{inviterEmail}} has invited you to join their group.
          Do you want to join?
        </atom-card-text>

        <atom-card-actions>
          <atom-spacer></atom-spacer>

          <atom-button
            color="primary"
            flat
            text
            @click="declineInviteSubmit"
          >
            Decline
          </atom-button>

          <atom-button
            color="primary"
            text
            :loading="buttonLoading"
            @click="acceptInviteSubmit"
          >
            Accept
          </atom-button>
        </atom-card-actions>
      </atom-card>
    </atom-dialog>
    <atom-dialog
      v-model="groupDetailsDialog"
      fullscreen
      hide-overlay
      transition="dialog-bottom-transition"
    >
      <atom-card>
        <atom-toolbar dark color="primary">
          <atom-button icon dark @click="groupDetailsDialog = false">
            <atom-icon>close</atom-icon>
          </atom-button>
          <atom-toolbar-title>{{ settingsName || 'Settings'}}</atom-toolbar-title>
          <atom-spacer></atom-spacer>
        </atom-toolbar>
        <family-user-history :routines="groupDetail" />
      </atom-card>
    </atom-dialog>
  </container-box>
</template>

<script>
import gql from 'graphql-tag';

import FamilyUserHistory from '@routine-notes/ui/organisms/FamilyUserHistory/FamilyUserHistory.vue';
import ContainerBox from '@routine-notes/ui/templates/ContainerBox/ContainerBox.vue';
import {
  AtomAvatar,
  AtomButton,
  AtomCard,
  AtomCardActions,
  AtomCardText,
  AtomCardTitle,
  AtomContainer,
  AtomDialog,
  AtomDivider,
  AtomFlex,
  AtomForm,
  AtomIcon,
  AtomImg,
  AtomLayout,
  AtomList,
  AtomListTile,
  AtomListTileAvatar,
  AtomListTileContent,
  AtomListTileSubTitle,
  AtomListTileTitle,
  AtomSpacer,
  AtomSubheader,
  AtomTextField,
  AtomToolbar,
  AtomToolbarTitle,
} from '@routine-notes/ui/atoms';

export default {
  components: {
    FamilyUserHistory,
    ContainerBox,
    AtomAvatar,
    AtomButton,
    AtomCard,
    AtomCardActions,
    AtomCardText,
    AtomCardTitle,
    AtomContainer,
    AtomDialog,
    AtomDivider,
    AtomFlex,
    AtomForm,
    AtomIcon,
    AtomImg,
    AtomLayout,
    AtomList,
    AtomListTile,
    AtomListTileAvatar,
    AtomListTileContent,
    AtomListTileSubTitle,
    AtomListTileTitle,
    AtomSpacer,
    AtomSubheader,
    AtomTextField,
    AtomToolbar,
    AtomToolbarTitle,
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
        this.$notify({
          title: 'Error',
          text: 'An unexpected error occured',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
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
            text: 'You joined your special group',
            group: 'notify',
            duration: 3000,
          });
          this.inviterEmail = '';
          this.triggerUserItems(acceptInvite.groupId);
        },
      }).catch((error) => {
        this.buttonLoading = false;
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
        this.$notify({
            title: 'Error',
            text: 'An unexpected error occured',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
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
          this.$notify({
            title: 'Error',
            text: 'An unexpected error occured',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
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

<style scoped>
  .image-card {
    border-radius: 16px;
  }

  .image-card-img {
    border-radius: 16px !important;
  }

  @media (max-width: 767px) {
    .image-card {
      border-radius: 0;
    }

    .image-card-img {
      border-radius: 0 !important;
    }
  }

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
