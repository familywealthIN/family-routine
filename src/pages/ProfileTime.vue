<script>
/* eslint-disable max-len */
</script>
<template>
  <container-box>
    <atom-card-text class="px-0">
    <atom-alert
      :value="true"
      type="warning"
    >
      This settings are READ ONLY. These are the profile settings to suit you scheduling.
    </atom-alert>
    <atom-list
        subheader
        three-line
    >
        <atom-subheader>Time</atom-subheader>
        <atom-list-tile>
        <atom-list-tile-content>
            <atom-list-tile-title>Start of the week</atom-list-tile-title>
            <atom-list-tile-sub-title>
                Select the day to start week
            </atom-list-tile-sub-title>
        </atom-list-tile-content>
        <atom-list-tile-action>
            <atom-btn-toggle disabled v-model="startOfWeek">
              <atom-button
                v-for="option in weekStartOptions"
                :key="option.value"
                flat
                :value="option.value"
              >
                {{ option.label }}
              </atom-button>
            </atom-btn-toggle>
        </atom-list-tile-action>
        </atom-list-tile>
        <atom-list-tile>
        <atom-list-tile-content>
            <atom-list-tile-title>Time zone</atom-list-tile-title>
            <atom-list-tile-sub-title>
                Current time zone for app.
            </atom-list-tile-sub-title>
        </atom-list-tile-content>
        <atom-list-tile-action>
            <select
              name="timezone_offset"
              disabled
              id="timezone-offset"
              style="width: 110px; border: 1px solid #000; padding: 5px 10px; border-radius:3px;"
              :value="profileSettings.defaultTimezone"
            >
              <option
                v-for="timezone in timezoneOptions"
                :key="timezone.value"
                :value="timezone.value"
                :selected="timezone.value === profileSettings.defaultTimezone"
              >
                {{ timezone.label }}
              </option>
            </select>
        </atom-list-tile-action>
        </atom-list-tile>
        <atom-list-tile>
        <atom-list-tile-content>
            <atom-list-tile-title>Time Format</atom-list-tile-title>
            <atom-list-tile-sub-title>
                Choose between 12-hour (AM/PM) or 24-hour time format for dashboard display.
            </atom-list-tile-sub-title>
        </atom-list-tile-content>
        <atom-list-tile-action>
            <atom-btn-toggle v-model="timeFormat" @change="saveTimeFormat">
              <atom-button
                flat
                value="12"
              >
                12
              </atom-button>
              <atom-button
                flat
                value="24"
              >
                24
              </atom-button>
            </atom-btn-toggle>
        </atom-list-tile-action>
        </atom-list-tile>
    </atom-list>
    <atom-divider></atom-divider>
    <atom-list
        subheader
        three-line
    >
        <atom-subheader>Rate</atom-subheader>
        <atom-list-tile>
            <atom-list-tile-content>
                <atom-list-tile-title>Routine Discipline</atom-list-tile-title>
                <atom-list-tile-sub-title>
                    Maximum time of a routine item.
                </atom-list-tile-sub-title>
            </atom-list-tile-content>
            <atom-list-tile-action>
                <atom-text-field
                    label="Outline"
                    single-line
                    outline
                    readonly
                    :value="profileSettings.routineDiscipline"
                ></atom-text-field>
            </atom-list-tile-action>
        </atom-list-tile>
        <atom-list-tile>
            <atom-list-tile-content>
                <atom-list-tile-title>Task Kinetics</atom-list-tile-title>
                <atom-list-tile-sub-title>
                    The rate at which task can be performed. The unit is in hours.
                </atom-list-tile-sub-title>
            </atom-list-tile-content>
            <atom-list-tile-action>
                <atom-text-field
                    label="Outline"
                    single-line
                    outline
                    readonly
                    :value="profileSettings.taskKinetics"
                ></atom-text-field>
            </atom-list-tile-action>
        </atom-list-tile>
        <atom-list-tile>
            <atom-list-tile-content>
                <atom-list-tile-title>Goal Geniuses</atom-list-tile-title>
                <atom-list-tile-sub-title>
                    Percent allocation of a period to award points.
                </atom-list-tile-sub-title>
            </atom-list-tile-content>
            <atom-list-tile-action>
                <atom-text-field
                    label="Outline"
                    single-line
                    outline
                    readonly
                    :value="profileSettings.goalGeniuses"
                ></atom-text-field>
            </atom-list-tile-action>
        </atom-list-tile>
    </atom-list>
    <atom-divider></atom-divider>
    <atom-list
        subheader
        three-line
    >
        <atom-subheader>Goal Auto Check Threshold</atom-subheader>
        <atom-list-tile>
            <atom-list-tile-content>
                <atom-list-tile-title>Month</atom-list-tile-title>
                <atom-list-tile-sub-title>
                    Number of months to be completed to auto check year goal.
                </atom-list-tile-sub-title>
            </atom-list-tile-content>
            <atom-list-tile-action>
                <atom-text-field
                    label="Outline"
                    single-line
                    outline
                    readonly
                    :value="profileSettings.autoCheckThreshold.month"
                ></atom-text-field>
            </atom-list-tile-action>
        </atom-list-tile>
        <atom-list-tile>
            <atom-list-tile-content>
                <atom-list-tile-title>Week</atom-list-tile-title>
                <atom-list-tile-sub-title>
                    Number of weeks to be completed to auto check month goal.
                </atom-list-tile-sub-title>
            </atom-list-tile-content>
            <atom-list-tile-action>
                <atom-text-field
                    label="Outline"
                    single-line
                    outline
                    readonly
                    :value="profileSettings.autoCheckThreshold.week"
                ></atom-text-field>
            </atom-list-tile-action>
        </atom-list-tile>
        <atom-list-tile>
            <atom-list-tile-content>
                <atom-list-tile-title>Day</atom-list-tile-title>
                <atom-list-tile-sub-title>
                    Number of days to be completed to auto check week goal.
                </atom-list-tile-sub-title>
            </atom-list-tile-content>
            <atom-list-tile-action>
                <atom-text-field
                    label="Outline"
                    single-line
                    outline
                    readonly
                    :value="profileSettings.autoCheckThreshold.day"
                ></atom-text-field>
            </atom-list-tile-action>
        </atom-list-tile>
    </atom-list>

    <!-- API Integration Section -->
    <atom-divider class="my-4"></atom-divider>

    <atom-alert
      :value="true"
      type="info"
      class="my-4"
    >
      <strong>API Integration</strong> - Use these credentials to access the Routine Notes API via MCP
    </atom-alert>

    <!-- OAuth Credentials Section -->
    <atom-list
        subheader
        three-line
    >
        <atom-subheader>
          OAuth Credentials
          <atom-chip v-if="oauthConnected" color="success" text-color="white" small class="ml-2">
            <atom-icon left small>check_circle</atom-icon>
            Connected
          </atom-chip>
        </atom-subheader>

        <atom-list-tile>
          <atom-list-tile-content>
              <atom-list-tile-title>Server URL</atom-list-tile-title>
              <atom-list-tile-sub-title>
                  Use this URL with any MCP client to access the Routine Notes API
              </atom-list-tile-sub-title>
          </atom-list-tile-content>
          <atom-list-tile-action class="oauth-field-action">
              <atom-text-field
                  label="Server URL"
                  readonly
                  :value="mcpServerUrl"
                  append-icon="content_copy"
                  @click:append="copyToClipboard(mcpServerUrl)"
              ></atom-text-field>
          </atom-list-tile-action>
        </atom-list-tile>

        <atom-list-tile>
          <atom-list-tile-content>
              <atom-list-tile-title>OAuth Client ID</atom-list-tile-title>
              <atom-list-tile-sub-title>
                  Use this Client ID for all platform integrations
              </atom-list-tile-sub-title>
          </atom-list-tile-content>
          <atom-list-tile-action class="oauth-field-action">
              <atom-text-field
                  label="Client ID"
                  readonly
                  value="routine-notes-mcp"
                  append-icon="content_copy"
                  @click:append="copyToClipboard('routine-notes-mcp')"
              ></atom-text-field>
          </atom-list-tile-action>
        </atom-list-tile>

        <atom-list-tile>
          <atom-list-tile-content>
              <atom-list-tile-title>OAuth Client Secret</atom-list-tile-title>
              <atom-list-tile-sub-title>
                  Keep this secret secure. You'll need it to configure integrations.
              </atom-list-tile-sub-title>
          </atom-list-tile-content>
          <atom-list-tile-action class="oauth-field-action">
              <atom-text-field
                  label="Client Secret"
                  readonly
                  :value="oauthClientSecret"
                  :type="showOAuthSecret ? 'text' : 'password'"
              >
                <template v-slot:append>
                  <atom-button
                    icon
                    @click="showOAuthSecret = !showOAuthSecret"
                    title="Toggle visibility"
                    class="mr-1"
                  >
                    <atom-icon>{{ showOAuthSecret ? 'visibility_off' : 'visibility' }}</atom-icon>
                  </atom-button>
                  <atom-button
                    icon
                    @click="copyToClipboard(oauthClientSecret)"
                    title="Copy to clipboard"
                  >
                    <atom-icon>content_copy</atom-icon>
                  </atom-button>
                </template>
              </atom-text-field>
          </atom-list-tile-action>
        </atom-list-tile>
    </atom-list>

    <atom-divider></atom-divider>

    <!-- Platform Setup Guides Tabs -->
    <atom-list
        subheader
        three-line
    >
        <atom-subheader>Platform Integration Guides</atom-subheader>
    </atom-list>

    <!-- Tabs Section (outside list for proper rendering) -->
    <atom-card flat class="platform-tabs-card no-shadow">
      <atom-tabs v-model="oauthPlatformTab">
        <atom-tab>
          <atom-icon left>chat</atom-icon>
          ChatGPT
        </atom-tab>
        <atom-tab>
          <atom-icon left>settings_input_component</atom-icon>
          n8n
        </atom-tab>
        <atom-tab>
          <atom-icon left>stars</atom-icon>
          Gemini
        </atom-tab>
        <atom-tab>
          <atom-icon left>search</atom-icon>
          Perplexity
        </atom-tab>
      </atom-tabs>

                <atom-tabs-items v-model="oauthPlatformTab">
                  <!-- ChatGPT Tab -->
                  <atom-tab-item>
                    <atom-card flat class="no-shadow">
                      <atom-card-text class="no-shadow">
                        <atom-alert type="info" outlined dense class="mb-3">
                          <strong>ChatGPT MCP Integration</strong>
                        </atom-alert>

                        <div class="mb-3">
                          <strong>Prerequisites:</strong>
                          <ul style="margin-left: 20px;">
                            <li>ChatGPT Plus or Team subscription</li>
                            <li>Access to Beta features</li>
                          </ul>
                        </div>

                        <div>
                          <strong>Setup Steps:</strong>
                          <ol style="margin-left: 20px; margin-top: 8px;">
                            <li>Open <strong>ChatGPT</strong></li>
                            <li>Click your profile → <strong>Settings</strong></li>
                            <li>Navigate to <strong>Beta Features</strong></li>
                            <li>Find <strong>MCP Servers</strong> section</li>
                            <li>Click <strong>Add MCP Server</strong></li>
                            <li>Enter the <strong>Server URL</strong> from above</li>
                            <li>Enter <strong>Client ID</strong>: <code>routine-notes-mcp</code></li>
                            <li>Enter <strong>Client Secret</strong> from above</li>
                            <li>Click <strong>Authorize</strong></li>
                            <li>You'll be redirected to this app - click <strong>Authorize</strong> again</li>
                            <li>✅ Connection complete!</li>
                          </ol>
                        </div>

                        <atom-divider class="my-3"></atom-divider>

                        <div class="caption grey--text">
                          <atom-icon small left>info</atom-icon>
                          After setup, you can ask ChatGPT to access your routines, goals, and tasks.
                        </div>
                      </atom-card-text>
                    </atom-card>
                  </atom-tab-item>

                  <!-- n8n Tab -->
                  <atom-tab-item>
                    <atom-card flat class="no-shadow">
                      <atom-card-text>
                        <atom-alert type="info" outlined dense class="mb-3">
                          <strong>n8n Workflow Automation</strong>
                        </atom-alert>

                        <div class="mb-3">
                          <strong>Prerequisites:</strong>
                          <ul style="margin-left: 20px;">
                            <li>n8n instance (cloud or self-hosted)</li>
                            <li>OAuth2 credentials node support</li>
                          </ul>
                        </div>

                        <div>
                          <strong>Setup Steps:</strong>
                          <ol style="margin-left: 20px; margin-top: 8px;">
                            <li>Open your <strong>n8n</strong> instance</li>
                            <li>Go to <strong>Credentials</strong> section</li>
                            <li>Click <strong>New Credential</strong></li>
                            <li>Select <strong>OAuth2 API</strong></li>
                            <li>Configure the credential:
                              <ul style="margin-left: 20px; margin-top: 4px;">
                                <li><strong>Grant Type:</strong> Authorization Code</li>
                                <li><strong>Authorization URL:</strong> <code>{{ mcpServerUrl }}/oauth/authorize</code></li>
                                <li><strong>Access Token URL:</strong> <code>{{ mcpServerUrl }}/oauth/token</code></li>
                                <li><strong>Client ID:</strong> <code>routine-notes-mcp</code></li>
                                <li><strong>Client Secret:</strong> (paste from above)</li>
                                <li><strong>Scope:</strong> <code>read write</code></li>
                              </ul>
                            </li>
                            <li>Click <strong>Connect my account</strong></li>
                            <li>Authorize when redirected to this app</li>
                            <li>Use <strong>HTTP Request</strong> node with this credential</li>
                            <li>Make requests to: <code>{{ mcpServerUrl }}/call</code></li>
                          </ol>
                        </div>

                        <atom-divider class="my-3"></atom-divider>

                        <div class="caption grey--text">
                          <atom-icon small left>info</atom-icon>
                          Use the HTTP Request node to query your routines via GraphQL or call MCP tools.
                        </div>
                      </atom-card-text>
                    </atom-card>
                  </atom-tab-item>

                  <!-- Gemini Tab -->
                  <atom-tab-item>
                    <atom-card flat class="no-shadow">
                      <atom-card-text>
                        <atom-alert type="info" outlined dense class="mb-3">
                          <strong>Google Gemini Integration</strong>
                        </atom-alert>

                        <div class="mb-3">
                          <strong>Prerequisites:</strong>
                          <ul style="margin-left: 20px;">
                            <li>Google Gemini account</li>
                            <li>Access to Extensions/Integrations (when available)</li>
                          </ul>
                        </div>

                        <div>
                          <strong>Setup Steps:</strong>
                          <ol style="margin-left: 20px; margin-top: 8px;">
                            <li>Open <strong>Google Gemini</strong></li>
                            <li>Navigate to <strong>Settings</strong></li>
                            <li>Find <strong>Extensions</strong> or <strong>Connected Apps</strong></li>
                            <li>Click <strong>Add Extension</strong> or <strong>Connect App</strong></li>
                            <li>Select <strong>Custom OAuth App</strong> or <strong>MCP Server</strong></li>
                            <li>Enter configuration:
                              <ul style="margin-left: 20px; margin-top: 4px;">
                                <li><strong>Server URL:</strong> (paste from above)</li>
                                <li><strong>Client ID:</strong> <code>routine-notes-mcp</code></li>
                                <li><strong>Client Secret:</strong> (paste from above)</li>
                              </ul>
                            </li>
                            <li>Click <strong>Connect</strong></li>
                            <li>Authorize when prompted</li>
                            <li>✅ Integration active!</li>
                          </ol>
                        </div>

                        <atom-divider class="my-3"></atom-divider>

                        <div class="caption grey--text">
                          <atom-icon small left>info</atom-icon>
                          Note: Gemini's MCP support may vary. Check Google's documentation for latest features.
                        </div>
                      </atom-card-text>
                    </atom-card>
                  </atom-tab-item>

                  <!-- Perplexity Tab -->
                  <atom-tab-item>
                    <atom-card flat class="no-shadow">
                      <atom-card-text>
                        <atom-alert type="info" outlined dense class="mb-3">
                          <strong>Perplexity AI Integration</strong>
                        </atom-alert>

                        <div class="mb-3">
                          <strong>Prerequisites:</strong>
                          <ul style="margin-left: 20px;">
                            <li>Perplexity Pro subscription</li>
                            <li>Access to API or MCP features</li>
                          </ul>
                        </div>

                        <div>
                          <strong>Setup Steps:</strong>
                          <ol style="margin-left: 20px; margin-top: 8px;">
                            <li>Open <strong>Perplexity</strong></li>
                            <li>Go to <strong>Settings</strong> → <strong>Integrations</strong></li>
                            <li>Look for <strong>Custom Integrations</strong> or <strong>API Connections</strong></li>
                            <li>Click <strong>Add Integration</strong></li>
                            <li>Choose <strong>OAuth 2.0</strong> authentication</li>
                            <li>Enter credentials:
                              <ul style="margin-left: 20px; margin-top: 4px;">
                                <li><strong>Name:</strong> Routine Notes</li>
                                <li><strong>Server URL:</strong> (paste from above)</li>
                                <li><strong>Client ID:</strong> <code>routine-notes-mcp</code></li>
                                <li><strong>Client Secret:</strong> (paste from above)</li>
                              </ul>
                            </li>
                            <li>Click <strong>Connect</strong></li>
                            <li>Complete OAuth authorization flow</li>
                            <li>✅ Ready to use!</li>
                          </ol>
                        </div>

                        <atom-divider class="my-3"></atom-divider>

                        <div class="caption grey--text">
                          <atom-icon small left>info</atom-icon>
                          Ask Perplexity to access your routine data for personalized insights and planning.
                        </div>
                      </atom-card-text>
                    </atom-card>
                  </atom-tab-item>
                </atom-tabs-items>
    </atom-card>

    <atom-divider></atom-divider>

    <!-- Legacy API Key Section -->
    <atom-divider class="my-4"></atom-divider>
    <atom-list
        subheader
        three-line
    >
        <atom-subheader>Legacy API Key (Optional)</atom-subheader>
        <atom-list-tile>
          <atom-list-tile-content>
              <atom-list-tile-title>API Key</atom-list-tile-title>
              <atom-list-tile-sub-title>
                  For backward compatibility. OAuth is recommended for new integrations.
              </atom-list-tile-sub-title>
          </atom-list-tile-content>
          <atom-list-tile-action class="oauth-field-action">
              <atom-text-field
                  label="API Key"
                  readonly
                  :value="userApiKey || 'No API key generated'"
                  :type="showApiKey ? 'text' : 'password'"
              >
                <template v-slot:append>
                  <atom-button
                    icon
                    @click="showApiKey = !showApiKey"
                    title="Toggle visibility"
                    class="mr-1"
                  >
                    <atom-icon>{{ showApiKey ? 'visibility_off' : 'visibility' }}</atom-icon>
                  </atom-button>
                  <atom-button
                    icon
                    @click="copyToClipboard(userApiKey)"
                    title="Copy to clipboard"
                    :disabled="!userApiKey"
                  >
                    <atom-icon>content_copy</atom-icon>
                  </atom-button>
                </template>
              </atom-text-field>
          </atom-list-tile-action>
        </atom-list-tile>

        <atom-list-tile>
          <atom-list-tile-content>
              <atom-list-tile-title>API Key Actions</atom-list-tile-title>
          </atom-list-tile-content>
          <atom-list-tile-action class="api-actions-buttons">
              <div class="d-flex align-center">
                <atom-button
                  color="primary"
                  :loading="generatingApiKey"
                  @click="generateApiKey"
                  class="mr-2"
                  small
                >
                  {{ userApiKey ? 'Regenerate' : 'Generate' }}
                </atom-button>
                <atom-button
                  color="secondary"
                  :disabled="!userApiKey"
                  @click="copyToClipboard(userApiKey)"
                  small
                >
                  Copy
                </atom-button>
              </div>
          </atom-list-tile-action>
        </atom-list-tile>
    </atom-list>

    <!-- Account Deletion Section -->
    <atom-divider></atom-divider>
    <atom-alert
      :value="true"
      type="error"
      style="margin-top: 20px;"
    >
      Danger Zone - Account Deletion
    </atom-alert>

    <atom-list
        subheader
        three-line
    >
        <atom-subheader>Delete Account</atom-subheader>
        <atom-list-tile>
          <atom-list-tile-content>
              <atom-list-tile-title>Permanently Delete Your Account</atom-list-tile-title>
              <atom-list-tile-sub-title>
                  Warning: This action cannot be undone. All your data including routines, goals, progress, and settings will be permanently deleted.
              </atom-list-tile-sub-title>
          </atom-list-tile-content>
          <atom-list-tile-action class="delete-account-action">
              <atom-button
                color="error"
                @click="showDeleteConfirmation = true"
                outlined
              >
                Delete Account
              </atom-button>
          </atom-list-tile-action>
        </atom-list-tile>
    </atom-list>

    <!-- Delete Confirmation Dialog -->
    <atom-dialog v-model="showDeleteConfirmation" max-width="500">
      <atom-card>
        <atom-card-title class="headline error white--text">
          Confirm Account Deletion
        </atom-card-title>
        <atom-card-text class="pt-4">
          <p class="mb-3">
            <strong>Are you absolutely sure you want to delete your account?</strong>
          </p>
          <p class="mb-3">
            This action will permanently delete:
          </p>
          <ul class="mb-3">
            <li>All your routines and tasks</li>
            <li>All your goals and milestones</li>
            <li>All your progress and history</li>
            <li>Your profile and settings</li>
            <li>Any API keys and integrations</li>
          </ul>
          <p class="mb-3">
            <strong>This action cannot be undone.</strong>
          </p>
          <atom-text-field
            v-model="deleteConfirmationText"
            label="Type DELETE to confirm"
            outlined
            :error="deleteConfirmationError"
            :error-messages="deleteConfirmationError ? 'Please type DELETE to confirm' : ''"
          ></atom-text-field>
        </atom-card-text>
        <atom-card-actions>
          <atom-spacer></atom-spacer>
          <atom-button
            text
            @click="cancelDeleteAccount"
          >
            Cancel
          </atom-button>
          <atom-button
            color="error"
            :loading="deletingAccount"
            :disabled="deleteConfirmationText !== 'DELETE'"
            @click="deleteAccount"
          >
            Delete My Account
          </atom-button>
        </atom-card-actions>
      </atom-card>
    </atom-dialog>
    </atom-card-text>
  </container-box>
</template>

<script>
import gql from 'graphql-tag';
import ContainerBox from '../components/templates/ContainerBox/ContainerBox.vue';
import { PROFILE_SETTINGS, WEEK_START_OPTIONS, TIMEZONE_OPTIONS } from '../constants/settings';
import {
  AtomAlert,
  AtomBtnToggle,
  AtomButton,
  AtomCard,
  AtomCardActions,
  AtomCardText,
  AtomCardTitle,
  AtomChip,
  AtomDialog,
  AtomDivider,
  AtomIcon,
  AtomList,
  AtomListTile,
  AtomListTileAction,
  AtomListTileContent,
  AtomListTileSubTitle,
  AtomListTileTitle,
  AtomSpacer,
  AtomSubheader,
  AtomTab,
  AtomTabItem,
  AtomTabs,
  AtomTabsItems,
  AtomTextField,
} from '../components/atoms';

export default {
  components: {
    ContainerBox,
    AtomAlert,
    AtomBtnToggle,
    AtomButton,
    AtomCard,
    AtomCardActions,
    AtomCardText,
    AtomCardTitle,
    AtomChip,
    AtomDialog,
    AtomDivider,
    AtomIcon,
    AtomList,
    AtomListTile,
    AtomListTileAction,
    AtomListTileContent,
    AtomListTileSubTitle,
    AtomListTileTitle,
    AtomSpacer,
    AtomSubheader,
    AtomTab,
    AtomTabItem,
    AtomTabs,
    AtomTabsItems,
    AtomTextField,
  },
  data() {
    return {
      startOfWeek: PROFILE_SETTINGS.startOfWeek,
      profileSettings: PROFILE_SETTINGS,
      weekStartOptions: WEEK_START_OPTIONS,
      timezoneOptions: TIMEZONE_OPTIONS,
      userApiKey: null,
      showApiKey: false,
      generatingApiKey: false,
      oauthConnected: false,
      showOAuthSecret: false,
      oauthPlatformTab: 0,
      oauthClientSecret: 'frt_secret_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      timeFormat: localStorage.getItem('timeFormat') || '24', // Default to 24-hour format
      mcpServerUrl: process.env.NODE_ENV === 'production'
        ? 'https://your-api-domain.com/dev/mcp'
        : 'http://localhost:4000/mcp',
      showDeleteConfirmation: false,
      deleteConfirmationText: '',
      deleteConfirmationError: false,
      deletingAccount: false,
    };
  },
  apollo: {
    userTags: {
      query: gql`
        query getUserTags {
          getUserTags {
            name
            email
            apiKey
            oauthConnected
          }
        }
      `,
      result({ data }) {
        if (data && data.getUserTags) {
          if (data.getUserTags.apiKey) {
            this.userApiKey = data.getUserTags.apiKey;
          }
          this.oauthConnected = data.getUserTags.oauthConnected || false;
        }
      },
      error(error) {
        console.error('Error fetching user data:', error);
      },
    },
  },
  methods: {
    async generateApiKey() {
      this.generatingApiKey = true;
      try {
        const result = await this.$apollo.mutate({
          mutation: gql`
            mutation generateApiKey {
              generateApiKey {
                apiKey
              }
            }
          `,
        });

        if (result.data && result.data.generateApiKey && result.data.generateApiKey.apiKey) {
          this.userApiKey = result.data.generateApiKey.apiKey;
          // Show success message
          console.log('API Key generated successfully!');
          alert('API Key generated successfully!');
        }
      } catch (error) {
        console.error('Error generating API key:', error);
        alert('Failed to generate API key. Please try again.');
      } finally {
        this.generatingApiKey = false;
      }
    },

    async copyToClipboard(text) {
      if (!text) {
        alert('Nothing to copy');
        return;
      }

      try {
        await navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
      } catch (error) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Copied to clipboard!');
      }
    },

    saveTimeFormat() {
      // Save time format preference to localStorage
      localStorage.setItem('timeFormat', this.timeFormat);

      // Notify user of the change
      this.$notify({
        title: 'Time Format Updated',
        text: `Time format set to ${this.timeFormat}-hour format`,
        group: 'notify',
        type: 'success',
        duration: 3000,
      });

      // Trigger a global event to update time display across the app
      this.$root.$emit('timeFormatChanged', this.timeFormat);
    },

    cancelDeleteAccount() {
      this.showDeleteConfirmation = false;
      this.deleteConfirmationText = '';
      this.deleteConfirmationError = false;
    },

    async deleteAccount() {
      if (this.deleteConfirmationText !== 'DELETE') {
        this.deleteConfirmationError = true;
        return;
      }

      this.deletingAccount = true;

      try {
        const result = await this.$apollo.mutate({
          mutation: gql`
            mutation deleteAccount {
              deleteAccount {
                success
                message
              }
            }
          `,
        });

        if (result.data && result.data.deleteAccount && result.data.deleteAccount.success === 'true') {
          // Show success message
          this.$notify({
            title: 'Account Deleted',
            text: result.data.deleteAccount.message,
            group: 'notify',
            type: 'success',
            duration: 5000,
          });

          // Clear local storage
          localStorage.clear();

          // Sign out and redirect to login/home page
          // Wait a bit for the notification to show
          setTimeout(() => {
            // Clear Apollo cache
            this.$apollo.provider.defaultClient.clearStore();

            // Redirect to home/login page
            window.location.href = '/';
          }, 2000);
        }
      } catch (error) {
        console.error('Error deleting account:', error);
        this.$notify({
          title: 'Error',
          text: 'Failed to delete account. Please try again or contact support.',
          group: 'notify',
          type: 'error',
          duration: 5000,
        });
      } finally {
        this.deletingAccount = false;
        this.showDeleteConfirmation = false;
        this.deleteConfirmationText = '';
        this.deleteConfirmationError = false;
      }
    },
  },
};
</script>

<style>
.elevation-1 {
  width: 100%;
}
/* .profile .v-input {
    width: 30px;
} */
.profile .v-input__slot {
    margin-bottom: 0;
}
.v-text-field__details {
    display: none;
}

/* Fix button alignment in list tiles */

.api-actions-buttons {
  min-width: 400px;
}

.api-actions-buttons .d-flex {
  gap: 8px;
}

/* Ensure buttons don't wrap and have proper padding */
.v-list__tile__action .v-btn {
  margin: 4px 0;
  padding: 0 16px !important;
}

/* Mobile responsive button widths */
@media (max-width: 768px) {
  /* Single button in row - full width */
  .delete-account-action {
    width: 100%;
  }

  .delete-account-action .v-btn {
    width: 100%;
  }

  /* Two buttons in row - 50% each */
  .api-actions-buttons .d-flex {
    width: 100%;
    flex-wrap: nowrap;
  }

  .api-actions-buttons .d-flex .v-btn {
    flex: 1;
    min-width: 0;
    margin: 0;
  }

  .api-actions-buttons .d-flex .v-btn:first-child {
    margin-right: 8px;
  }

  .api-actions-buttons {
    min-width: 100%;
    width: 100%;
  }
}

/* Platform tabs styling - remove border radius and box shadow */
.platform-tabs-card {
  border-radius: 0 !important;
  box-shadow: none !important;
}

/* OAuth credentials and API key field responsiveness */
.oauth-field-action {
  width: 350px;
}

@media (max-width: 768px) {
  .oauth-field-action {
    width: 100% !important;
    max-width: 100% !important;
  }

  /* Make OAuth and API key list tiles stack vertically on mobile */
  .v-list__tile:has(.oauth-field-action) {
    flex-direction: column !important;
    align-items: flex-start !important;
    height: auto !important;
    padding-bottom: 16px !important;
  }

  .v-list__tile:has(.oauth-field-action) .v-list__tile__content {
    width: 100% !important;
    margin-bottom: 8px;
  }

  .v-list__tile:has(.oauth-field-action) .v-list__tile__action {
    width: 100% !important;
    align-self: stretch !important;
    margin-bottom: 8px;
  }

  /* Add spacing after last input field before next section */
  .v-list__tile:has(.oauth-field-action):last-child {
    padding-bottom: 24px !important;
  }
}
</style>
