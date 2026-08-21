<template>
  <div>
    <el-card title="生成二维码">
      <el-form :model="form" inline>
        <el-form-item label="销售方">
          <el-select v-model="form.sellerId" placeholder="请选择销售方" clearable style="width: 240px">
            <el-option
              v-for="item in sellers"
              :key="item.id"
              :label="`${item.name} (${item.sellerCode})`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="产品">
          <el-select v-model="form.productId" placeholder="请选择产品" clearable style="width: 240px">
            <el-option
              v-for="item in products"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="generating" @click="generate">生成二维码</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-table :data="tableData" v-loading="loading" class="qrcode-table">
      <el-table-column prop="seller.name" label="销售方" />
      <el-table-column label="产品">
        <template #default="{ row }">
          {{ getProductName(row.productId) }}
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="生成时间" />
      <el-table-column label="二维码" width="120">
        <template #default="{ row }">
          <img :src="row.imageUrl" class="qrcode-thumb" alt="二维码" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button type="primary" text @click="download(row)">下载</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="query.page"
      v-model:page-size="query.pageSize"
      :total="total"
      layout="total, prev, pager, next"
      @change="loadData"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../api';

const loading = ref(false);
const generating = ref(false);
const tableData = ref<any[]>([]);
const sellers = ref<any[]>([]);
const products = ref<any[]>([]);
const total = ref(0);

const query = reactive({ page: 1, pageSize: 10 });
const form = reactive({ sellerId: '', productId: '' });

async function loadData() {
  loading.value = true;
  try {
    const { data } = await api.get('/qrcodes', { params: query });
    tableData.value = data.items;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

async function loadSellers() {
  const { data } = await api.get('/sellers', { params: { pageSize: 1000 } });
  sellers.value = data.items;
}

async function loadProducts() {
  const { data } = await api.get('/products', { params: { pageSize: 1000 } });
  products.value = data.items;
}

function getProductName(productId: string) {
  const product = products.value.find((p) => p.id === productId);
  return product?.name || '默认产品';
}

async function generate() {
  if (!form.sellerId) {
    ElMessage.warning('请选择销售方');
    return;
  }
  generating.value = true;
  try {
    const payload: any = { sellerId: form.sellerId };
    if (form.productId) {
      payload.productId = form.productId;
    }
    await api.post('/qrcodes', payload);
    ElMessage.success('生成成功');
    form.sellerId = '';
    form.productId = '';
    loadData();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '生成失败');
  } finally {
    generating.value = false;
  }
}

function download(row: any) {
  const link = document.createElement('a');
  link.href = row.imageUrl;
  const extension = row.imageUrl.startsWith('data:image/svg+xml')
    ? 'svg'
    : row.imageUrl.startsWith('data:image/jpeg')
      ? 'jpg'
      : 'png';
  link.download = `qrcode-${row.id}.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

onMounted(() => {
  loadData();
  loadSellers();
  loadProducts();
});
</script>

<style scoped>
.qrcode-table {
  margin-top: 20px;
}
.qrcode-thumb {
  width: 60px;
  height: 60px;
  object-fit: contain;
}
</style>
