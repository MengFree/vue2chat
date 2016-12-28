// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import store from "./store/store.js";

import msg from './components/msg/msg.vue'
import contact from './components/contact/contact.vue'
import order from './components/order/order.vue'
import system from './components/system/system.vue'

import VueRouter from 'vue-router'

import './assets/css/webIM.css'
import './assets/css/perfect-scrollbar.css'
import './assets/js/perfect-scrollbar.jquery.min.js'
import './assets/js/jquery.mousewheel.js'


Vue.use(VueRouter)

const routes = [
    { path: '/msg', component: msg },
    { path: '/contact', component: contact },
    { path: '/order', component: order },
    { path: '/system', component: system },
    { path: '/', redirect: '/msg' }
]
const router = new VueRouter({
    routes: routes,
    linkActiveClass: 'active'
})

const app = new Vue({
    router,
    store,
    render: h => h(App)
}).$mount('#app')