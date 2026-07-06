<template>
  <div>
    <el-form :model="query" inline>
      <el-form-item label="关键词">
        <el-input v-model="query.keyword" placeholder="产品名称" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="loadData">查询</el-button>
        <el-button @click="resetQuery">重置</el-button>
        <el-button type="success" @click="openDialog()">新增产品</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="tableData" v-loading="loading">
      <el-table-column prop="name" label="产品名称" />
      <el-table-column label="售价">
        <template #default="{ row }">
          {{ (row.price / 100).toFixed(2) }} 元
        </template>
      </el-table-column>
      <el-table-column prop="defaultQuantity" label="默认数量" width="100" />
      <el-table-column prop="aftersaleDays" label="售后天数" width="100" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          {{ row.isOnSale ? '上架' : '下架' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button type="primary" text @click="openDialog(row)">编辑</el-button>
          <el-button type="danger" text @click="remove(row)">删除</el-button>
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

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑产品' : '新增产品'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="产品名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="售价（元）">
          <el-input-number v-model="form.priceYuan" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="默认数量">
          <el-input-number v-model="form.defaultQuantity" :min="1" />
        </el-form-item>
        <el-form-item label="售后天数">
          <el-input-number v-model="form.aftersaleDays" :min="0" />
        </el-form-item>
        <el-form-item label="封图 URL">
          <el-input v-model="form.cover" />
        </el-form-item>
        <el-form-item label="入群二维码">
          <el-input v-model="form.groupQrcode" />
        </el-form-item>
        <el-form-item label="是否上架">
          <el-switch v-model="form.isOnSale" />
        </el-form-item>
        <el-form-item label="产品介绍">
          <el-input v-model="form.intro" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../api';

const loading = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);

const query = reactive({ keyword: '', page: 1, pageSize: 10 });
const form = reactive<any>({});

async function loadData() {
  loading.value = true;
  try {
    const { data } = await api.get('/products', { params: query });
    tableData.value = data.items;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

function resetQuery() {
  query.keyword = '';
  query.page = 1;
  loadData();
}

function openDialog(row?: any) {
  isEdit.value = !!row;
  if (row) {
    Object.assign(form, { ...row, priceYuan: row.price / 100 });
  } else {
    Object.assign(form, { name: '', priceYuan: 0, defaultQuantity: 1, aftersaleDays: 7, cover: '', groupQrcode: '', isOnSale: true, intro: '' });
  }
  dialogVisible.value = true;
}

async function submit() {
  try {
    const payload = { ...form, price: Math.round(form.priceYuan * 100) };
    delete payload.priceYuan;
    if (isEdit.value) {
      await api.patch(`/products/${form.id}`, payload);
    } else {
      await api.post('/products', payload);
    }
    ElMessage.success('操作成功');
    dialogVisible.value = false;
    loadData();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '操作失败');
  }
}

async function remove(row: any) {
  try {
    await ElMessageBox.confirm('确认删除该产品？', '提示', { type: 'warning' });
    await api.delete(`/products/${row.id}`);
    ElMessage.success('删除成功');
    loadData();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '删除失败');
    }
  }
}

onMounted(loadData);
</script>
