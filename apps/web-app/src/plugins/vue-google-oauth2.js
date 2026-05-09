import Vue from 'vue';
import GAuth from './vue-google-oauth2-new';
import { gauthOption } from '../blob/config';

Vue.use(GAuth, gauthOption);
