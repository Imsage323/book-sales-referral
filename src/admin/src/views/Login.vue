<template>
  <div class="login-page">
    <el-card>
      <h2>销售记账管理后台</h2>
      <el-form :model="form" :rules="rules" ref="formRef">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleLogin">登录</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import api from '../api';

const router = useRouter();
const formRef = ref<any>(null);
const loading = ref(false);

const form = reactive({ username: '', password: '' });

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少 6 位', trigger: 'blur' },
  ],
};

async function handleLogin() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  loading.value = true;
  try {
    const { data } = await api.post('/auth/login', form);
    if (!data.accessToken) {
      ElMessage.error('登录响应异常，缺少 token');
      return;
    }
    localStorage.setItem('token', data.accessToken);
    ElMessage.success('登录成功');
    router.push('/');
  } catch (error: any) {
    const rawMessage = error.response?.data?.message || error.message || '登录失败';
    const message = Array.isArray(rawMessage) ? rawMessage.join('；') : String(rawMessage);
    ElMessage.error(message);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  max-width: 400px;
  margin: 100px auto;
}
</style>
