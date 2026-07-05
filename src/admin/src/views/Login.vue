<template>
  <div class="login-page">
    <h2>销售记账管理后台</h2>
    <el-form :model="form">
      <el-form-item label="用户名">
        <el-input v-model="form.username" />
      </el-form-item>
      <el-form-item label="密码">
        <el-input v-model="form.password" type="password" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary">登录</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';

const form = reactive({ username: '', password: '' });
</script>

<style scoped>
.login-page {
  max-width: 400px;
  margin: 100px auto;
}
</style>
