import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import Login from '../views/Login.vue';
import Layout from '../views/Layout.vue';
import Sellers from '../views/Sellers.vue';
import Products from '../views/Products.vue';
import Orders from '../views/Orders.vue';
import Qrcodes from '../views/Qrcodes.vue';
import Ledger from '../views/Ledger.vue';

const routes: RouteRecordRaw[] = [
  { path: '/login', component: Login },
  {
    path: '/',
    component: Layout,
    redirect: '/sellers',
    children: [
      { path: 'sellers', component: Sellers },
      { path: 'products', component: Products },
      { path: 'orders', component: Orders },
      { path: 'qrcodes', component: Qrcodes },
      { path: 'ledger', component: Ledger },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const token = localStorage.getItem('token');
  if (to.path !== '/login' && !token) {
    return '/login';
  }
  return true;
});

export default router;
