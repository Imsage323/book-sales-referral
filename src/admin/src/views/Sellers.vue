<template>
  <div>
    <el-form :model="query" inline>
      <el-form-item label="关键词">
        <el-input v-model="query.keyword" placeholder="姓名/编码" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="loadData">查询</el-button>
        <el-button @click="resetQuery">重置</el-button>
        <el-button type="success" @click="openDialog()">新增销售方</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="tableData" v-loading="loading">
      <el-table-column prop="sellerCode" label="销售编码" width="120" />
      <el-table-column prop="name" label="姓名" />
      <el-table-column prop="school" label="学校" />
      <el-table-column prop="region" label="地区" />
      <el-table-column prop="phone" label="电话" />
      <el-table-column label="上级">
        <template #default="{ row }">
          {{ row.parent?.name || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100" />
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

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑销售方' : '新增销售方'" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="姓名">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="销售编码">
          <el-input v-model="form.sellerCode" placeholder="留空自动生成" />
        </el-form-item>
        <el-form-item label="学校">
          <el-input v-model="form.school" />
        </el-form-item>
        <el-form-item label="地区">
          <el-input v-model="form.region" />
        </el-form-item>
        <el-form-item label="电话">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="上级">
          <el-select v-model="form.parentId" clearable placeholder="请选择">
            <el-option
              v-for="item in sellerOptions"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" v-if="isEdit">
          <el-select v-model="form.status">
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="disabled" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" />
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
const sellerOptions = ref<any[]>([]);
const total = ref(0);

const query = reactive({ keyword: '', page: 1, pageSize: 10 });
const form = reactive<any>({});

async function loadData() {
  loading.value = true;
  try {
    const { data } = await api.get('/sellers', { params: query });
    tableData.value = data.items;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

async function loadSellerOptions() {
  const { data } = await api.get('/sellers', { params: { pageSize: 1000 } });
  sellerOptions.value = data.items;
}

function resetQuery() {
  query.keyword = '';
  query.page = 1;
  loadData();
}

function openDialog(row?: any) {
  isEdit.value = !!row;
  Object.assign(form, row || { name: '', sellerCode: '', school: '', region: '', phone: '', parentId: '', remark: '', status: 'active' });
  dialogVisible.value = true;
  loadSellerOptions();
}

async function submit() {
  try {
    if (isEdit.value) {
      await api.patch(`/sellers/${form.id}`, form);
    } else {
      await api.post('/sellers', form);
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
    await ElMessageBox.confirm('确认删除该销售方？', '提示', { type: 'warning' });
    await api.delete(`/sellers/${row.id}`);
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
