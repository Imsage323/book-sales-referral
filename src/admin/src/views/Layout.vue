<template>
  <el-container class="layout">
    <el-aside width="200px">
      <div class="logo">销售记账</div>
      <el-menu :default-active="route.path" router>
        <el-menu-item index="/sellers">
          <span>销售方管理</span>
        </el-menu-item>
        <el-menu-item index="/products">
          <span>产品配置</span>
        </el-menu-item>
        <el-menu-item index="/orders">
          <span>订单管理</span>
        </el-menu-item>
        <el-menu-item index="/qrcodes">
          <span>二维码管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header>
        <div class="header-right">
          <el-button type="primary" text @click="logout">退出登录</el-button>
        </div>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

function logout() {
  localStorage.removeItem('token');
  router.push('/login');
}
</script>

<style scoped>
.layout {
  height: 100vh;
}
.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  font-weight: bold;
  border-bottom: 1px solid #eee;
}
.el-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  border-bottom: 1px solid #eee;
}
</style>
