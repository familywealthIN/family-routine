import Vue from 'vue';
import GAuth from './vue-google-oauth2-module';
import { gauthOption } from '../blob/config';

Vue.use(GAuth, gauthOption);
