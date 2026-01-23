<script>
/* eslint-disable max-len */
</script>
<template>
  <container-box>
    <v-card-text class="px-0">
    <v-alert
      :value="true"
      type="warning"
    >
      This settings are READ ONLY. These are the profile settings to suit you scheduling.
    </v-alert>
    <v-list
        subheader
        three-line
    >
        <v-subheader>Time</v-subheader>
        <v-list-tile>
        <v-list-tile-content>
            <v-list-tile-title>Start of the week</v-list-tile-title>
            <v-list-tile-sub-title>
                Select the day to start week
            </v-list-tile-sub-title>
        </v-list-tile-content>
        <v-list-tile-action>
            <v-btn-toggle disabled v-model="startOfWeek">
              <v-btn
                v-for="option in weekStartOptions"
                :key="option.value"
                flat
                :value="option.value"
              >
                {{ option.label }}
              </v-btn>
            </v-btn-toggle>
        </v-list-tile-action>
        </v-list-tile>
        <v-list-tile>
        <v-list-tile-content>
            <v-list-tile-title>Time zone</v-list-tile-title>
            <v-list-tile-sub-title>
                Current time zone for app.
            </v-list-tile-sub-title>
        </v-list-tile-content>
        <v-list-tile-action>
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
        </v-list-tile-action>
        </v-list-tile>
        <v-list-tile>
        <v-list-tile-content>
            <v-list-tile-title>Time Format</v-list-tile-title>
            <v-list-tile-sub-title>
                Choose between 12-hour (AM/PM) or 24-hour time format for dashboard display.
            </v-list-tile-sub-title>
        </v-list-tile-content>
        <v-list-tile-action>
            <v-btn-toggle v-model="timeFormat" @change="saveTimeFormat">
              <v-btn
                flat
                value="12"
              >
                12
              </v-btn>
              <v-btn
                flat
                value="24"
              >
                24
              </v-btn>
            </v-btn-toggle>
        </v-list-tile-action>
        </v-list-tile>
    </v-list>
    <v-divider></v-divider>
    <v-list
        subheader
        three-line
    >
        <v-subheader>Rate</v-subheader>
        <v-list-tile>
            <v-list-tile-content>
                <v-list-tile-title>Routine Discipline</v-list-tile-title>
                <v-list-tile-sub-title>
                    Maximum time of a routine item.
                </v-list-tile-sub-title>
            </v-list-tile-content>
            <v-list-tile-action>
                <v-text-field
                    label="Outline"
                    single-line
                    outline
                    readonly
                    :value="profileSettings.routineDiscipline"
                ></v-text-field>
            </v-list-tile-action>
        </v-list-tile>
        <v-list-tile>
            <v-list-tile-content>
                <v-list-tile-title>Task Kinetics</v-list-tile-title>
                <v-list-tile-sub-title>
                    The rate at which task can be performed. The unit is in hours.
                </v-list-tile-sub-title>
            </v-list-tile-content>
            <v-list-tile-action>
                <v-text-field
                    label="Outline"
                    single-line
                    outline
                    readonly
                    :value="profileSettings.taskKinetics"
                ></v-text-field>
            </v-list-tile-action>
        </v-list-tile>
        <v-list-tile>
            <v-list-tile-content>
                <v-list-tile-title>Goal Geniuses</v-list-tile-title>
                <v-list-tile-sub-title>
                    Percent allocation of a period to award points.
                </v-list-tile-sub-title>
            </v-list-tile-content>
            <v-list-tile-action>
                <v-text-field
                    label="Outline"
                    single-line
                    outline
                    readonly
                    :value="profileSettings.goalGeniuses"
                ></v-text-field>
            </v-list-tile-action>
        </v-list-tile>
    </v-list>
    <v-divider></v-divider>
    <v-list
        subheader
        three-line
    >
        <v-subheader>Goal Auto Check Threshold</v-subheader>
        <v-list-tile>
            <v-list-tile-content>
                <v-list-tile-title>Month</v-list-tile-title>
                <v-list-tile-sub-title>
                    Number of months to be completed to auto check year goal.
                </v-list-tile-sub-title>
            </v-list-tile-content>
            <v-list-tile-action>
                <v-text-field
                    label="Outline"
                    single-line
                    outline
                    readonly
                    :value="profileSettings.autoCheckThreshold.month"
                ></v-text-field>
            </v-list-tile-action>
        </v-list-tile>
        <v-list-tile>
            <v-list-tile-content>
                <v-list-tile-title>Week</v-list-tile-title>
                <v-list-tile-sub-title>
                    Number of weeks to be completed to auto check month goal.
                </v-list-tile-sub-title>
            </v-list-tile-content>
            <v-list-tile-action>
                <v-text-field
                    label="Outline"
                    single-line
                    outline
                    readonly
                    :value="profileSettings.autoCheckThreshold.week"
                ></v-text-field>
            </v-list-tile-action>
        </v-list-tile>
        <v-list-tile>
            <v-list-tile-content>
                <v-list-tile-title>Day</v-list-tile-title>
                <v-list-tile-sub-title>
                    Number of days to be completed to auto check week goal.
                </v-list-tile-sub-title>
            </v-list-tile-content>
            <v-list-tile-action>
                <v-text-field
                    label="Outline"
                    single-line
                    outline
                    readonly
                    :value="profileSettings.autoCheckThreshold.day"
                ></v-text-field>
            </v-list-tile-action>
        </v-list-tile>
    </v-list>

    <!-- API Integration Section -->
    <v-divider class="my-4"></v-divider>

    <v-alert
      :value="true"
      type="info"
      class="my-4"
    >
      <strong>API Integration</strong> - Use these credentials to access the Routine Notes API via MCP
    </v-alert>

    <!-- OAuth Credentials Section -->
    <v-list
        subheader
        three-line
    >
        <v-subheader>
          OAuth Credentials
          <v-chip v-if="oauthConnected" color="success" text-color="white" small class="ml-2">
            <v-icon left small>check_circle</v-icon>
            Connected
          </v-chip>
        </v-subheader>

        <v-list-tile>
          <v-list-tile-content>
              <v-list-tile-title>Server URL</v-list-tile-title>
              <v-list-tile-sub-title>
                  Use this URL with any MCP client to access the Routine Notes API
              </v-list-tile-sub-title>
          </v-list-tile-content>
          <v-list-tile-action class="oauth-field-action">
              <v-text-field
                  label="Server URL"
                  readonly
                  :value="mcpServerUrl"
                  append-icon="content_copy"
                  @click:append="copyToClipboard(mcpServerUrl)"
              ></v-text-field>
          </v-list-tile-action>
        </v-list-tile>

        <v-list-tile>
          <v-list-tile-content>
              <v-list-tile-title>OAuth Client ID</v-list-tile-title>
              <v-list-tile-sub-title>
                  Use this Client ID for all platform integrations
              </v-list-tile-sub-title>
          </v-list-tile-content>
          <v-list-tile-action class="oauth-field-action">
              <v-text-field
                  label="Client ID"
                  readonly
                  value="routine-notes-mcp"
                  append-icon="content_copy"
                  @click:append="copyToClipboard('routine-notes-mcp')"
              ></v-text-field>
          </v-list-tile-action>
        </v-list-tile>

        <v-list-tile>
          <v-list-tile-content>
              <v-list-tile-title>OAuth Client Secret</v-list-tile-title>
              <v-list-tile-sub-title>
                  Keep this secret secure. You'll need it to configure integrations.
              </v-list-tile-sub-title>
          </v-list-tile-content>
          <v-list-tile-action class="oauth-field-action">
              <v-text-field
                  label="Client Secret"
                  readonly
                  :value="oauthClientSecret"
                  :type="showOAuthSecret ? 'text' : 'password'"
              >
                <template v-slot:append>
                  <v-btn
                    icon
                    @click="showOAuthSecret = !showOAuthSecret"
                    title="Toggle visibility"
                    class="mr-1"
                  >
                    <v-icon>{{ showOAuthSecret ? 'visibility_off' : 'visibility' }}</v-icon>
                  </v-btn>
                  <v-btn
                    icon
                    @click="copyToClipboard(oauthClientSecret)"
                    title="Copy to clipboard"
                  >
                    <v-icon>content_copy</v-icon>
                  </v-btn>
                </template>
              </v-text-field>
          </v-list-tile-action>
        </v-list-tile>
    </v-list>

    <v-divider></v-divider>

    <!-- Platform Setup Guides Tabs -->
    <v-list
        subheader
        three-line
    >
        <v-subheader>Platform Integration Guides</v-subheader>
    </v-list>

    <!-- Tabs Section (outside list for proper rendering) -->
    <v-card flat class="platform-tabs-card no-shadow">
      <v-tabs v-model="oauthPlatformTab">
        <v-tab>
          <v-icon left>chat</v-icon>
          ChatGPT
        </v-tab>
        <v-tab>
          <v-icon left>settings_input_component</v-icon>
          n8n
        </v-tab>
        <v-tab>
          <v-icon left>stars</v-icon>
          Gemini
        </v-tab>
        <v-tab>
          <v-icon left>search</v-icon>
          Perplexity
        </v-tab>
      </v-tabs>

                <v-tabs-items v-model="oauthPlatformTab">
                  <!-- ChatGPT Tab -->
                  <v-tab-item>
                    <v-card flat class="no-shadow">
                      <v-card-text class="no-shadow">
                        <v-alert type="info" outlined dense class="mb-3">
                          <strong>ChatGPT MCP Integration</strong>
                        </v-alert>

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

                        <v-divider class="my-3"></v-divider>

                        <div class="caption grey--text">
                          <v-icon small left>info</v-icon>
                          After setup, you can ask ChatGPT to access your routines, goals, and tasks.
                        </div>
                      </v-card-text>
                    </v-card>
                  </v-tab-item>

                  <!-- n8n Tab -->
                  <v-tab-item>
                    <v-card flat class="no-shadow">
                      <v-card-text>
                        <v-alert type="info" outlined dense class="mb-3">
                          <strong>n8n Workflow Automation</strong>
                        </v-alert>

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

                        <v-divider class="my-3"></v-divider>

                        <div class="caption grey--text">
                          <v-icon small left>info</v-icon>
                          Use the HTTP Request node to query your routines via GraphQL or call MCP tools.
                        </div>
                      </v-card-text>
                    </v-card>
                  </v-tab-item>

                  <!-- Gemini Tab -->
                  <v-tab-item>
                    <v-card flat class="no-shadow">
                      <v-card-text>
                        <v-alert type="info" outlined dense class="mb-3">
                          <strong>Google Gemini Integration</strong>
                        </v-alert>

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

                        <v-divider class="my-3"></v-divider>

                        <div class="caption grey--text">
                          <v-icon small left>info</v-icon>
                          Note: Gemini's MCP support may vary. Check Google's documentation for latest features.
                        </div>
                      </v-card-text>
                    </v-card>
                  </v-tab-item>

                  <!-- Perplexity Tab -->
                  <v-tab-item>
                    <v-card flat class="no-shadow">
                      <v-card-text>
                        <v-alert type="info" outlined dense class="mb-3">
                          <strong>Perplexity AI Integration</strong>
                        </v-alert>

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

                        <v-divider class="my-3"></v-divider>

                        <div class="caption grey--text">
                          <v-icon small left>info</v-icon>
                          Ask Perplexity to access your routine data for personalized insights and planning.
                        </div>
                      </v-card-text>
                    </v-card>
                  </v-tab-item>
                </v-tabs-items>
    </v-card>

    <v-divider></v-divider>

    <!-- Legacy API Key Section -->
    <v-divider class="my-4"></v-divider>
    <v-list
        subheader
        three-line
    >
        <v-subheader>Legacy API Key (Optional)</v-subheader>
        <v-list-tile>
          <v-list-tile-content>
              <v-list-tile-title>API Key</v-list-tile-title>
              <v-list-tile-sub-title>
                  For backward compatibility. OAuth is recommended for new integrations.
              </v-list-tile-sub-title>
          </v-list-tile-content>
          <v-list-tile-action class="oauth-field-action">
              <v-text-field
                  label="API Key"
                  readonly
                  :value="userApiKey || 'No API key generated'"
                  :type="showApiKey ? 'text' : 'password'"
              >
                <template v-slot:append>
                  <v-btn
                    icon
                    @click="showApiKey = !showApiKey"
                    title="Toggle visibility"
                    class="mr-1"
                  >
                    <v-icon>{{ showApiKey ? 'visibility_off' : 'visibility' }}</v-icon>
                  </v-btn>
                  <v-btn
                    icon
                    @click="copyToClipboard(userApiKey)"
                    title="Copy to clipboard"
                    :disabled="!userApiKey"
                  >
                    <v-icon>content_copy</v-icon>
                  </v-btn>
                </template>
              </v-text-field>
          </v-list-tile-action>
        </v-list-tile>

        <v-list-tile>
          <v-list-tile-content>
              <v-list-tile-title>API Key Actions</v-list-tile-title>
          </v-list-tile-content>
          <v-list-tile-action class="api-actions-buttons">
              <div class="d-flex align-center">
                <v-btn
                  color="primary"
                  :loading="generatingApiKey"
                  @click="generateApiKey"
                  class="mr-2"
                  small
                >
                  {{ userApiKey ? 'Regenerate' : 'Generate' }}
                </v-btn>
                <v-btn
                  color="secondary"
                  :disabled="!userApiKey"
                  @click="copyToClipboard(userApiKey)"
                  small
                >
                  Copy
                </v-btn>
              </div>
          </v-list-tile-action>
        </v-list-tile>
    </v-list>

    <!-- Account Deletion Section -->
    <v-divider></v-divider>
    <v-alert
      :value="true"
      type="error"
      style="margin-top: 20px;"
    >
      Danger Zone - Account Deletion
    </v-alert>

    <v-list
        subheader
        three-line
    >
        <v-subheader>Delete Account</v-subheader>
        <v-list-tile>
          <v-list-tile-content>
              <v-list-tile-title>Permanently Delete Your Account</v-list-tile-title>
              <v-list-tile-sub-title>
                  Warning: This action cannot be undone. All your data including routines, goals, progress, and settings will be permanently deleted.
              </v-list-tile-sub-title>
          </v-list-tile-content>
          <v-list-tile-action class="delete-account-action">
              <v-btn
                color="error"
                @click="showDeleteConfirmation = true"
                outlined
              >
                Delete Account
              </v-btn>
          </v-list-tile-action>
        </v-list-tile>
    </v-list>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteConfirmation" max-width="500">
      <v-card>
        <v-card-title class="headline error white--text">
          Confirm Account Deletion
        </v-card-title>
        <v-card-text class="pt-4">
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
          <v-text-field
            v-model="deleteConfirmationText"
            label="Type DELETE to confirm"
            outlined
            :error="deleteConfirmationError"
            :error-messages="deleteConfirmationError ? 'Please type DELETE to confirm' : ''"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            text
            @click="cancelDeleteAccount"
          >
            Cancel
          </v-btn>
          <v-btn
            color="error"
            :loading="deletingAccount"
            :disabled="deleteConfirmationText !== 'DELETE'"
            @click="deleteAccount"
          >
            Delete My Account
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    </v-card-text>
  </container-box>
</template>

<script>
import gql from 'graphql-tag';
import ContainerBox from '../components/templates/ContainerBox/ContainerBox.vue';
import { PROFILE_SETTINGS, WEEK_START_OPTIONS, TIMEZONE_OPTIONS } from '../constants/settings';

export default {
  components: { ContainerBox },
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
