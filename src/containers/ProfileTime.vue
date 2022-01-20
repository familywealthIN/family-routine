<script>
/* eslint-disable max-len */
</script>
<template>
  <container-box>
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
              <v-btn flat value="sun">
                Sun
              </v-btn>
              <v-btn flat value="mon">
                Mon
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
            <select name="timezone_offset" disabled id="timezone-offset" style="width: 110px; border: 1px solid #000; padding: 5px 10px; border-radius:3px;">
                <option value="-12:00">(GMT -12:00) Eniwetok, Kwajalein</option>
                <option value="-11:00">(GMT -11:00) Midway Island, Samoa</option>
                <option value="-10:00">(GMT -10:00) Hawaii</option>
                <option value="-09:50">(GMT -9:30) Taiohae</option>
                <option value="-09:00">(GMT -9:00) Alaska</option>
                <option value="-08:00">(GMT -8:00) Pacific Time (US &amp; Canada)</option>
                <option value="-07:00">(GMT -7:00) Mountain Time (US &amp; Canada)</option>
                <option value="-06:00">(GMT -6:00) Central Time (US &amp; Canada), Mexico City</option>
                <option value="-05:00">(GMT -5:00) Eastern Time (US &amp; Canada), Bogota, Lima</option>
                <option value="-04:50">(GMT -4:30) Caracas</option>
                <option value="-04:00">(GMT -4:00) Atlantic Time (Canada), Caracas, La Paz</option>
                <option value="-03:50">(GMT -3:30) Newfoundland</option>
                <option value="-03:00">(GMT -3:00) Brazil, Buenos Aires, Georgetown</option>
                <option value="-02:00">(GMT -2:00) Mid-Atlantic</option>
                <option value="-01:00">(GMT -1:00) Azores, Cape Verde Islands</option>
                <option value="+00:00">(GMT) Western Europe Time, London, Lisbon, Casablanca</option>
                <option value="+01:00">(GMT +1:00) Brussels, Copenhagen, Madrid, Paris</option>
                <option value="+02:00">(GMT +2:00) Kaliningrad, South Africa</option>
                <option value="+03:00">(GMT +3:00) Baghdad, Riyadh, Moscow, St. Petersburg</option>
                <option value="+03:50">(GMT +3:30) Tehran</option>
                <option value="+04:00">(GMT +4:00) Abu Dhabi, Muscat, Baku, Tbilisi</option>
                <option value="+04:50">(GMT +4:30) Kabul</option>
                <option value="+05:00">(GMT +5:00) Ekaterinburg, Islamabad, Karachi, Tashkent</option>
                <option value="+05:50" selected="selected">(GMT +5:30) Bombay, Calcutta, Madras, New Delhi</option>
                <option value="+05:75">(GMT +5:45) Kathmandu, Pokhara</option>
                <option value="+06:00">(GMT +6:00) Almaty, Dhaka, Colombo</option>
                <option value="+06:50">(GMT +6:30) Yangon, Mandalay</option>
                <option value="+07:00">(GMT +7:00) Bangkok, Hanoi, Jakarta</option>
                <option value="+08:00">(GMT +8:00) Beijing, Perth, Singapore, Hong Kong</option>
                <option value="+08:75">(GMT +8:45) Eucla</option>
                <option value="+09:00">(GMT +9:00) Tokyo, Seoul, Osaka, Sapporo, Yakutsk</option>
                <option value="+09:50">(GMT +9:30) Adelaide, Darwin</option>
                <option value="+10:00">(GMT +10:00) Eastern Australia, Guam, Vladivostok</option>
                <option value="+10:50">(GMT +10:30) Lord Howe Island</option>
                <option value="+11:00">(GMT +11:00) Magadan, Solomon Islands, New Caledonia</option>
                <option value="+11:50">(GMT +11:30) Norfolk Island</option>
                <option value="+12:00">(GMT +12:00) Auckland, Wellington, Fiji, Kamchatka</option>
                <option value="+12:75">(GMT +12:45) Chatham Islands</option>
                <option value="+13:00">(GMT +13:00) Apia, Nukualofa</option>
                <option value="+14:00">(GMT +14:00) Line Islands, Tokelau</option>
            </select>
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
                    value="24"
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
                    value="2"
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
                    value="25"
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
                    value="9"
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
                    value="3"
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
                    value="5"
                ></v-text-field>
            </v-list-tile-action>
        </v-list-tile>
    </v-list>
  </container-box>
</template>

<script>
import gql from 'graphql-tag';
import ContainerBox from '../components/ContainerBox.vue';

export default {
  components: { ContainerBox },
  data() {
    return {
        startOfWeek: 'sun'
    };
  },
};
</script>

<style>
.elevation-1 {
  width: 100%;
}
.profile .v-input {
    width: 30px;
}
.profile .v-input__slot {
    margin-bottom: 0;
}
.v-text-field__details {
    display: none;
}
</style>
